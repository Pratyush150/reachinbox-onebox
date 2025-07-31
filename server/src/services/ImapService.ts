import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { EventEmitter } from 'events';
import { Email, EmailAccount, IEmailAccount } from '../models';
import { elasticClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';
import { AiService } from './AiService';
import { NotificationService } from './NotificationService';

interface ImapConnection {
  imap: Imap;
  account: IEmailAccount;
  reconnectAttempts: number;
  isConnected: boolean;
}

export class ImapService extends EventEmitter {
  private connections: Map<string, ImapConnection> = new Map();
  private aiService: AiService;
  private notificationService: NotificationService;
  private readonly maxReconnectAttempts = 5;
  private readonly baseRetryDelay = 1000;

  constructor() {
    super();
    this.aiService = new AiService();
    this.notificationService = new NotificationService();
  }

  async initialize(): Promise<void> {
    try {
      const accounts = await EmailAccount.find({ isActive: true });
      
      for (const account of accounts) {
        await this.connectAccount(account);
      }
      
      logger.info(`✅ IMAP Service initialized with ${accounts.length} accounts`);
    } catch (error) {
      logger.error('Failed to initialize IMAP Service:', error);
      throw error;
    }
  }

  async addAccount(accountData: any): Promise<IEmailAccount> {
    try {
      const account = new EmailAccount({
        userId: accountData.userId,
        email: accountData.email,
        provider: accountData.provider,
        imapConfig: {
          host: accountData.imapConfig.host,
          port: accountData.imapConfig.port,
          secure: accountData.imapConfig.secure,
          user: accountData.imapConfig.user,
          pass: this.encryptPassword(accountData.imapConfig.pass)
        },
        isActive: true,
        syncStatus: 'connecting'
      });

      await account.save();
      await this.connectAccount(account);
      
      logger.info(`📧 Added email account: ${account.email}`);
      return account;
    } catch (error) {
      logger.error('Failed to add account:', error);
      throw error;
    }
  }

  async removeAccount(accountId: string): Promise<void> {
    try {
      const connection = this.connections.get(accountId);
      if (connection) {
        connection.imap.end();
        this.connections.delete(accountId);
      }

      await EmailAccount.findByIdAndUpdate(accountId, { 
        isActive: false, 
        syncStatus: 'disconnected' 
      });
      
      logger.info(`🗑️ Removed email account: ${accountId}`);
    } catch (error) {
      logger.error('Failed to remove account:', error);
      throw error;
    }
  }

  private async connectAccount(account: IEmailAccount): Promise<void> {
    try {
      const imapConfig = {
        user: account.imapConfig.user,
        password: this.decryptPassword(account.imapConfig.pass),
        host: account.imapConfig.host,
        port: account.imapConfig.port,
        tls: account.imapConfig.secure,
        autotls: 'always' as const,
        tlsOptions: {
          rejectUnauthorized: false
        }
      };

      const imap = new Imap(imapConfig);
      const connection: ImapConnection = {
        imap,
        account,
        reconnectAttempts: 0,
        isConnected: false
      };

      this.setupImapEventHandlers(connection);
      this.connections.set((account._id as any).toString(), connection);
      imap.connect();
      
    } catch (error) {
      logger.error(`Failed to connect account ${account.email}:`, error);
      await this.updateAccountStatus((account._id as any).toString(), 'error');
      throw error;
    }
  }

  private setupImapEventHandlers(connection: ImapConnection): void {
    const { imap, account } = connection;
    const accountId = (account._id as any).toString();

    imap.once('ready', async () => {
      try {
        connection.isConnected = true;
        connection.reconnectAttempts = 0;
        
        await this.updateAccountStatus(accountId, 'connected');
        logger.info(`🔗 Connected to ${account.email}`);

        await this.syncRecentEmails(connection);
        await this.setupIdleConnection(connection);
        
      } catch (error) {
        logger.error(`Error in ready handler for ${account.email}:`, error);
      }
    });

    imap.once('error', async (error: Error) => {
      logger.error(`IMAP error for ${account.email}:`, error);
      connection.isConnected = false;
      await this.updateAccountStatus(accountId, 'error');
      await this.handleReconnection(connection);
    });

    imap.once('end', async () => {
      logger.warn(`IMAP connection ended for ${account.email}`);
      connection.isConnected = false;
      await this.updateAccountStatus(accountId, 'disconnected');
      await this.handleReconnection(connection);
    });
  }

  private async syncRecentEmails(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;
    
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', true, async (err, box) => {
        if (err) {
          logger.error(`Failed to open INBOX for ${account.email}:`, err);
          return reject(err);
        }

        try {
          // Get all emails - simpler and more reliable
          const searchCriteria = ['ALL'];
          
          imap.search(searchCriteria, (searchErr, results) => {
            if (searchErr) {
              logger.error(`Search error for ${account.email}:`, searchErr);
              return reject(searchErr);
            }

            if (!results || results.length === 0) {
              logger.info(`No recent emails found for ${account.email}`);
              return resolve();
            }

            logger.info(`📬 Found ${results.length} recent emails for ${account.email}`);
            this.processEmailBatch(connection, results, resolve, reject);
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async processEmailBatch(
    connection: ImapConnection, 
    messageIds: number[], 
    resolve: Function, 
    reject: Function
  ): Promise<void> {
    const { imap, account } = connection;
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      const fetch = imap.fetch(batch, {
        bodies: '',
        struct: true,
        envelope: true
      });

      fetch.on('message', (msg, seqno) => {
        this.processMessage(msg, account, seqno);
      });

      fetch.once('error', (err) => {
        logger.error(`Fetch error for ${account.email}:`, err);
        reject(err);
      });

      fetch.once('end', () => {
        processed += batch.length;
        logger.info(`📨 Processed ${processed}/${messageIds.length} emails for ${account.email}`);
        
        if (processed >= messageIds.length) {
          resolve();
        }
      });
    }
  }

  private async processMessage(msg: any, account: IEmailAccount, seqno: number): Promise<void> {
    let buffer = '';
    let attributes: any = null;

    msg.on('body', (stream: any) => {
      stream.on('data', (chunk: any) => {
        buffer += chunk.toString('utf8');
      });
    });

    msg.once('attributes', (attrs: any) => {
      attributes = attrs;
    });

    msg.once('end', async () => {
      try {
        const parsed = await simpleParser(buffer);
        const messageId = parsed.messageId || `${account._id}-${seqno}-${Date.now()}`;
        
        const existingEmail = await Email.findOne({ messageId });
        if (existingEmail) {
          return;
        }

        const emailDoc: any = {
          accountId: (account._id as any).toString(),
          messageId,
          from: {
            address: Array.isArray(parsed.from) 
              ? parsed.from[0]?.address || ''
              : parsed.from?.value?.[0]?.address || '',
            name: Array.isArray(parsed.from)
              ? parsed.from[0]?.name || ''
              : parsed.from?.value?.[0]?.name || ''
          },
          to: Array.isArray(parsed.to) 
            ? parsed.to.map((addr: any) => ({
                address: addr.address,
                name: addr.name
              }))
            : parsed.to?.value?.map((addr: any) => ({
                address: addr.address,
                name: addr.name
              })) || [],
          subject: parsed.subject || 'No subject',
          textBody: parsed.text || 'No text content',
          htmlBody: parsed.html || '',
          folder: 'INBOX',
          isRead: attributes?.flags?.includes('\\Seen') || false,
          receivedDate: parsed.date || new Date(),
          aiProcessed: false
        };

        const aiResult = await this.aiService.classifyEmail(emailDoc);
        emailDoc.aiCategory = aiResult.category;
        emailDoc.aiConfidence = aiResult.confidence;
        emailDoc.aiProcessed = true;

        const savedEmail = await Email.create(emailDoc);
        await this.indexEmailInElasticsearch(savedEmail);

        if (['interested', 'meeting_booked'].includes(aiResult.category)) {
          await this.notificationService.processInterestedEmail(savedEmail);
        }

        this.emit('emailProcessed', savedEmail);
        
      } catch (error) {
        logger.error(`Error processing message for ${account.email}:`, error);
      }
    });
  }

  private async setupIdleConnection(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;

    imap.openBox('INBOX', false, (err) => {
      if (err) {
        logger.error(`Failed to open INBOX for IDLE on ${account.email}:`, err);
        return;
      }

      // Set up mail event listener for new emails
      imap.on('mail', async (numNewMsgs: number) => {
        logger.info(`📬 ${numNewMsgs} new email(s) received for ${account.email}`);
        
        // Fetch only the newest messages
        const fetch = imap.fetch(`${Math.max(1, (imap as any).state.box.messages.total - numNewMsgs + 1)}:*`, {
          bodies: '',
          struct: true,
          envelope: true
        });

        fetch.on('message', (msg, seqno) => {
          this.processMessage(msg, account, seqno);
        });
      });

      // Try IDLE, fallback to polling
      try {
        if (typeof (imap as any).idle === 'function') {
          (imap as any).idle();
          logger.info(`⏰ IDLE mode activated for ${account.email}`);
        } else {
          // Fallback: Check for new mail every 30 seconds
          this.setupPollingMode(connection);
        }
      } catch (error) {
        logger.warn(`IDLE failed for ${account.email}, switching to polling`);
        this.setupPollingMode(connection);
      }
    });
  }

  private setupPollingMode(connection: ImapConnection): void {
    const { imap, account } = connection;
    let lastCount = 0;
    
    const pollInterval = setInterval(() => {
      if (!connection.isConnected) {
        clearInterval(pollInterval);
        return;
      }

      imap.openBox('INBOX', true, (err, box) => {
        if (err) return;
        
        const currentCount = box.messages.total;
        if (currentCount > lastCount) {
          const newMsgs = currentCount - lastCount;
          logger.info(`📬 ${newMsgs} new email(s) detected for ${account.email} (polling)`);
          
          // Fetch new messages
          const fetch = imap.fetch(`${lastCount + 1}:${currentCount}`, {
            bodies: '',
            struct: true,
            envelope: true
          });

          fetch.on('message', (msg, seqno) => {
            this.processMessage(msg, account, seqno);
          });
        }
        lastCount = currentCount;
      });
    }, 30000); // Poll every 30 seconds

    logger.info(`🔄 Polling mode activated for ${account.email} (30s intervals)`);
  }

  private async indexEmailInElasticsearch(email: any): Promise<void> {
    try {
      await elasticClient.index({
        index: 'emails',
        id: email._id.toString(),
        body: {
          messageId: email.messageId,
          accountId: email.accountId,
          from: email.from.address,
          to: email.to.map((t: any) => t.address).join(', '),
          subject: email.subject,
          body: email.textBody,
          folder: email.folder,
          aiCategory: email.aiCategory,
          receivedDate: email.receivedDate
        }
      });
    } catch (error) {
      logger.error('Failed to index email in Elasticsearch:', error);
    }
  }

  private async handleReconnection(connection: ImapConnection): Promise<void> {
    const { account } = connection;
    
    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for ${account.email}`);
      await this.updateAccountStatus((account._id as any).toString(), 'error');
      return;
    }

    connection.reconnectAttempts++;
    const delay = this.baseRetryDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    logger.info(`Reconnecting to ${account.email} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connectAccount(account);
      } catch (error) {
        logger.error(`Reconnection failed for ${account.email}:`, error);
      }
    }, delay);
  }

  private async updateAccountStatus(accountId: string, status: string): Promise<void> {
    try {
      await EmailAccount.findByIdAndUpdate(accountId, { syncStatus: status });
    } catch (error) {
      logger.error('Failed to update account status:', error);
    }
  }

  private encryptPassword(password: string): string {
    return Buffer.from(password).toString('base64');
  }

  private decryptPassword(encryptedPassword: string): string {
    return Buffer.from(encryptedPassword, 'base64').toString('utf8');
  }

  getConnectionStatus(): any {
    const status: any = {};
    
    for (const [accountId, connection] of this.connections) {
      status[accountId] = {
        email: connection.account.email,
        connected: connection.isConnected,
        reconnectAttempts: connection.reconnectAttempts
      };
    }
    
    return status;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down IMAP Service...');
    
    for (const [accountId, connection] of this.connections) {
      connection.imap.end();
    }
    
    this.connections.clear();
    logger.info('✅ IMAP Service shutdown complete');
  }
}
