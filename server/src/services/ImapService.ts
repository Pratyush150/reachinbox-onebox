import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EventEmitter } from 'events';
import { Email, EmailAccount, IEmailAccount } from '../models';
import { AiService } from './AiService';
import { NotificationService } from './NotificationService';
import { elasticClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

interface ImapConnection {
  imap: Imap;
  account: IEmailAccount;
  isConnected: boolean;
  lastActivity: Date;
  errorCount: number;
}

export class ImapService extends EventEmitter {
  private connections: Map<string, ImapConnection> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private aiService: AiService;
  private notificationService: NotificationService;
  private syncProgress: Map<string, { processed: number; total: number }> = new Map();

  constructor(aiService: AiService, notificationService: NotificationService) {
    super();
    this.aiService = aiService;
    this.notificationService = notificationService;
    this.startConnectionMonitor();
  }

  async addAccount(accountData: any): Promise<IEmailAccount> {
    try {
      // Check for existing account
      const existingAccount = await EmailAccount.findOne({ 
        email: accountData.email,
        isActive: true 
      });

      if (existingAccount) {
        logger.info(`Account ${accountData.email} already exists, updating connection`);
        await this.connectToAccount(existingAccount);
        return existingAccount;
      }

      // Create new account
      const account = await EmailAccount.create({
        ...accountData,
        isActive: true,
        syncStatus: 'pending',
        syncStats: {
          totalEmails: 0,
          processedEmails: 0,
          lastSyncAt: null,
          errors: []
        }
      });

      logger.info(`Created new account: ${account.email}`);
      
      // Connect and start syncing
      await this.connectToAccount(account);
      
      return account;
    } catch (error: any) {
      logger.error(`Failed to add account ${accountData.email}:`, error);
      throw new Error(`Failed to add email account: ${error.message}`);
    }
  }

  async removeAccount(accountId: string): Promise<void> {
    try {
      const connection = this.connections.get(accountId);
      if (connection) {
        connection.imap.end();
        this.connections.delete(accountId);
      }

      const timeout = this.reconnectTimeouts.get(accountId);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(accountId);
      }

      await EmailAccount.findByIdAndUpdate(accountId, { 
        isActive: false,
        syncStatus: 'disconnected'
      });

      logger.info(`Removed account: ${accountId}`);
    } catch (error: any) {
      logger.error(`Failed to remove account ${accountId}:`, error);
      throw error;
    }
  }

  async connectToAccount(account: IEmailAccount): Promise<void> {
    const accountId = (account._id as any).toString();
    
    try {
      // Close existing connection if any
      const existingConnection = this.connections.get(accountId);
      if (existingConnection) {
        existingConnection.imap.end();
      }

      const imap = new Imap({
        user: account.imapConfig.user,
        password: account.imapConfig.pass,
        host: account.imapConfig.host,
        port: account.imapConfig.port,
        tls: account.imapConfig.secure,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 60000,
        authTimeout: 30000,
        keepalive: true
      });

      const connection: ImapConnection = {
        imap,
        account,
        isConnected: false,
        lastActivity: new Date(),
        errorCount: 0
      };

      this.setupImapEventHandlers(connection, accountId);
      this.connections.set(accountId, connection);

      imap.connect();

      logger.info(`Connecting to IMAP for ${account.email}...`);
    } catch (error: any) {
      logger.error(`Failed to connect to ${account.email}:`, error);
      await this.updateAccountStatus(account, 'error', error.message);
      throw error;
    }
  }

  private setupImapEventHandlers(connection: ImapConnection, accountId: string): void {
    const { imap, account } = connection;

    imap.once('ready', async () => {
      try {
        connection.isConnected = true;
        connection.errorCount = 0;
        logger.info(`IMAP connection ready for ${account.email}`);
        
        await this.updateAccountStatus(account, 'connected');
        await this.syncEmails(connection);
      } catch (error: any) {
        logger.error(`Error during initial sync for ${account.email}:`, error);
        await this.updateAccountStatus(account, 'error', error.message);
      }
    });

    imap.once('error', async (error: any) => {
      connection.errorCount++;
      logger.error(`IMAP error for ${account.email}:`, error);
      
      await this.updateAccountStatus(account, 'error', error.message);
      
      if (connection.errorCount < 3) {
        this.scheduleReconnection(accountId, 30000 * connection.errorCount);
      } else {
        logger.error(`Too many errors for ${account.email}, giving up`);
        await this.updateAccountStatus(account, 'failed');
      }
    });

    imap.once('end', async () => {
      connection.isConnected = false;
      logger.info(`IMAP connection ended for ${account.email}`);
      
      if (account.syncStatus !== 'error') {
        this.scheduleReconnection(accountId, 10000);
      }
    });

    imap.on('mail', async (numNewMsgs: number) => {
      logger.info(`${numNewMsgs} new emails for ${account.email}`);
      await this.syncNewEmails(connection);
    });
  }

  private async syncEmails(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;
    const accountId = (account._id as any).toString();

    try {
      await this.updateAccountStatus(account, 'syncing');

      imap.openBox('INBOX', true, async (err: any, box: any) => {
        if (err) {
          logger.error(`Failed to open INBOX for ${account.email}:`, err);
          await this.updateAccountStatus(account, 'error', err.message);
          return;
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          logger.info(`No messages in INBOX for ${account.email}`);
          await this.updateAccountStatus(account, 'completed');
          return;
        }

        // Sync recent emails (last 100 or all if less)
        const limit = Math.min(totalMessages, 100);
        const start = Math.max(1, totalMessages - limit + 1);
        
        logger.info(`Syncing ${limit} emails for ${account.email} (${start}:${totalMessages})`);
        
        this.syncProgress.set(accountId, { processed: 0, total: limit });

        const fetch = imap.fetch(`${start}:${totalMessages}`, {
          bodies: '',
          struct: true,
          envelope: true
        });

        let processed = 0;

        fetch.on('message', (msg: any, seqno: number) => {
          this.processMessage(msg, account, seqno).then(() => {
            processed++;
            this.syncProgress.set(accountId, { processed, total: limit });
            
            if (processed === limit) {
              logger.info(`Completed syncing ${processed} emails for ${account.email}`);
              this.updateAccountSyncStats(account, processed, 0);
              this.updateAccountStatus(account, 'completed');
            }
          }).catch((error) => {
            logger.error(`Error processing message ${seqno} for ${account.email}:`, error);
          });
        });

        fetch.once('error', async (error: any) => {
          logger.error(`Fetch error for ${account.email}:`, error);
          await this.updateAccountStatus(account, 'error', error.message);
        });

        fetch.once('end', () => {
          logger.info(`Fetch completed for ${account.email}`);
        });
      });
    } catch (error: any) {
      logger.error(`Sync error for ${account.email}:`, error);
      await this.updateAccountStatus(account, 'error', error.message);
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
        
        // Check if email already exists
        const existingEmail = await Email.findOne({ messageId });
        if (existingEmail) {
          return;
        }

        // Create email document
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
          folder: 'inbox', // FIXED: Changed from 'INBOX' to 'inbox' to match enum
          isRead: attributes?.flags?.includes('\\Seen') || false,
          receivedDate: parsed.date || new Date(),
          aiProcessed: false
        };

        // Process attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          emailDoc.attachments = parsed.attachments.map((att: any) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            contentId: att.cid
          }));
        }

        // AI Classification
        try {
          const aiResult = await this.aiService.classifyEmail(emailDoc);
          emailDoc.aiCategory = aiResult.category;
          emailDoc.aiConfidence = aiResult.confidence;
          
          emailDoc.aiProcessed = true;
        } catch (aiError) {
          logger.error('AI classification failed:', aiError);
          emailDoc.aiCategory = 'uncategorized';
          emailDoc.aiConfidence = 0;
          emailDoc.aiProcessed = false;
        }

        // Save to database
        const savedEmail = await Email.create(emailDoc);

        // Index in Elasticsearch
        await this.indexEmailInElasticsearch(savedEmail);

        // Send notifications for important emails
        if (['interested', 'meeting_booked'].includes(emailDoc.aiCategory)) {
          await this.notificationService.processInterestedEmail(savedEmail);
        }

        // Emit event
        this.emit('emailProcessed', savedEmail);
        
      } catch (error) {
        logger.error(`Error processing message for ${account.email}:`, error);
      }
    });
  }

  private async syncNewEmails(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;

    try {
      imap.openBox('INBOX', true, (err: any, box: any) => {
        if (err) {
          logger.error(`Failed to open INBOX for new emails ${account.email}:`, err);
          return;
        }

        // Get recent unseen messages
        imap.search(['UNSEEN'], (searchErr: any, results: number[]) => {
          if (searchErr) {
            logger.error(`Search error for ${account.email}:`, searchErr);
            return;
          }

          if (!results || results.length === 0) {
            logger.info(`No new unseen emails for ${account.email}`);
            return;
          }

          logger.info(`Processing ${results.length} new emails for ${account.email}`);

          const fetch = imap.fetch(results, {
            bodies: '',
            struct: true,
            envelope: true
          });

          fetch.on('message', (msg: any, seqno: number) => {
            this.processMessage(msg, account, seqno).catch((error) => {
              logger.error(`Error processing new message ${seqno}:`, error);
            });
          });
        });
      });
    } catch (error: any) {
      logger.error(`Error syncing new emails for ${account.email}:`, error);
    }
  }

  private async indexEmailInElasticsearch(email: any): Promise<void> {
    try {
      await elasticClient.index({
        index: 'emails',
        id: (email._id as any).toString(),
        body: {
          messageId: email.messageId,
          accountId: email.accountId,
          from: email.from.address,
          to: email.to.map((t: any) => t.address).join(', '),
          subject: email.subject,
          body: email.textBody,
          folder: email.folder,
          aiCategory: email.aiCategory,
          aiConfidence: email.aiConfidence,
          receivedDate: email.receivedDate,
          isRead: email.isRead,
          isStarred: email.isStarred,
          isArchived: email.isArchived
        }
      });
    } catch (error) {
      logger.warn(`Failed to index email in Elasticsearch:`, error);
    }
  }

  private async updateAccountStatus(account: IEmailAccount, status: string, error?: string): Promise<void> {
    try {
      const updateData: any = { 
        syncStatus: status,
        lastSyncAt: new Date()
      };

      if (error) {
        updateData.$push = {
          'syncStats.errors': {
            message: error,
            timestamp: new Date()
          }
        };
      }

      await EmailAccount.findByIdAndUpdate(account._id, updateData);
    } catch (updateError) {
      logger.error('Failed to update account status:', updateError);
    }
  }

  private async updateAccountSyncStats(account: IEmailAccount, processed: number, errors: number): Promise<void> {
    try {
      await EmailAccount.findByIdAndUpdate(account._id, {
        'syncStats.processedEmails': processed,
        'syncStats.totalEmails': processed,
        'syncStats.lastSyncAt': new Date()
      });
    } catch (error) {
      logger.error('Failed to update sync stats:', error);
    }
  }

  private scheduleReconnection(accountId: string, delay: number): void {
    const existingTimeout = this.reconnectTimeouts.get(accountId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const account = await EmailAccount.findById(accountId);
        if (account && account.isActive) {
          logger.info(`Reconnecting to ${account.email}...`);
          await this.connectToAccount(account);
        }
      } catch (error) {
        logger.error(`Reconnection failed for ${accountId}:`, error);
      }
    }, delay);

    this.reconnectTimeouts.set(accountId, timeout);
  }

  private startConnectionMonitor(): void {
    setInterval(() => {
      this.connections.forEach(async (connection, accountId) => {
        const timeSinceActivity = Date.now() - connection.lastActivity.getTime();
        
        // Ping connection if inactive for 5 minutes
        if (timeSinceActivity > 5 * 60 * 1000 && connection.isConnected) {
          try {
            connection.imap.openBox('INBOX', true, (err: any) => {
              if (err) {
                logger.warn(`Connection ping failed for ${connection.account.email}`);
              } else {
                connection.lastActivity = new Date();
              }
            });
          } catch (error) {
            logger.warn(`Connection monitor error for ${connection.account.email}:`, error);
          }
        }
      });
    }, 60000); // Check every minute
  }

  public getConnectionStatus(): { [accountId: string]: any } {
    const status: { [accountId: string]: any } = {};
    
    this.connections.forEach((connection, accountId) => {
      const progress = this.syncProgress.get(accountId);
      
      status[accountId] = {
        connected: connection.isConnected,
        lastActivity: connection.lastActivity,
        errorCount: connection.errorCount,
        email: connection.account.email,
        syncProgress: progress || null
      };
    });

    return status;
  }

  public async syncAllAccounts(): Promise<void> {
    const accounts = await EmailAccount.find({ isActive: true });
    
    for (const account of accounts) {
      try {
        await this.connectToAccount(account);
      } catch (error) {
        logger.error(`Failed to sync account ${account.email}:`, error);
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.connections.forEach((connection) => {
      connection.imap.end();
    });
    
    this.connections.clear();
    
    this.reconnectTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    
    this.reconnectTimeouts.clear();
  }
}
