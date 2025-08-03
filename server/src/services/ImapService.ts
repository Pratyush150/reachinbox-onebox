import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EventEmitter } from 'events';
import { Email, EmailAccount, IEmailAccount } from '../models';
import { AiService } from './AiService';
import { NotificationService } from './NotificationService';
import { elasticClient } from '../config/elasticsearch';
import { indexEmailInElasticsearch, bulkIndexEmails } from '../config/elasticsearch';
import { logger } from '../utils/logger';

interface ImapConnection {
  imap: Imap;
  account: IEmailAccount;
  isConnected: boolean;
  lastActivity: Date;
  errorCount: number;
  isReconnecting: boolean;
}

export class ImapService extends EventEmitter {
  private connections: Map<string, ImapConnection> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private aiService: AiService;
  private notificationService: NotificationService;
  private syncProgress: Map<string, { processed: number; total: number }> = new Map();
  private maxReconnectAttempts = 3;
  private reconnectDelay = 30000; // 30 seconds

  constructor(aiService: AiService, notificationService: NotificationService) {
    super();
    this.aiService = aiService;
    this.notificationService = notificationService;
    
    // Handle uncaught errors to prevent crashes
    this.on('error', (error) => {
      logger.error('IMAP Service error:', error.message);
    });
  }

  async addAccount(accountData: any): Promise<IEmailAccount> {
    try {
      const existingAccount = await EmailAccount.findOne({ 
        email: accountData.email,
        isActive: true 
      });

      if (existingAccount) {
        logger.info(`Account ${accountData.email} already exists, updating connection`);
        await this.safeConnectToAccount(existingAccount);
        return existingAccount;
      }

      const account = await EmailAccount.create({
        ...accountData,
        isActive: true,
        syncStatus: 'pending'
      });

      logger.info(`Created new account: ${account.email}`);
      await this.safeConnectToAccount(account);
      return account;
    } catch (error: any) {
      logger.error(`Failed to add account ${accountData.email}:`, error.message);
      throw new Error(`Failed to add email account: ${error.message}`);
    }
  }

  async removeAccount(accountId: string): Promise<void> {
    try {
      await this.safeDisconnectAccount(accountId);
      
      await EmailAccount.findByIdAndUpdate(accountId, { 
        isActive: false,
        syncStatus: 'disconnected'
      });

      logger.info(`Removed account: ${accountId}`);
    } catch (error: any) {
      logger.error(`Failed to remove account ${accountId}:`, error.message);
      throw error;
    }
  }

  private async safeConnectToAccount(account: IEmailAccount): Promise<void> {
    const accountId = (account._id as any).toString();
    
    try {
      // Check if already connecting
      const existingConnection = this.connections.get(accountId);
      if (existingConnection?.isReconnecting) {
        logger.info(`Already connecting to ${account.email}, skipping...`);
        return;
      }

      // Clean up existing connection
      if (existingConnection) {
        await this.safeDisconnectAccount(accountId);
      }

      logger.info(`Connecting to IMAP for ${account.email}...`);
      
      const imap = new Imap({
        user: account.imapConfig.user,
        password: account.imapConfig.pass,
        host: account.imapConfig.host,
        port: account.imapConfig.port,
        tls: account.imapConfig.secure,
        tlsOptions: { 
          rejectUnauthorized: false,
          servername: account.imapConfig.host
        },
        connTimeout: 30000,
        authTimeout: 15000,
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        }
      });

      const connection: ImapConnection = {
        imap,
        account,
        isConnected: false,
        lastActivity: new Date(),
        errorCount: 0,
        isReconnecting: true
      };

      this.connections.set(accountId, connection);
      this.setupSafeImapEventHandlers(connection, accountId);
      
      // Connect with timeout protection
      const connectPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 45000); // 45 second timeout

        imap.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        imap.once('error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });

        imap.connect();
      });

      await connectPromise;

    } catch (error: any) {
      logger.error(`Failed to connect to ${account.email}:`, error.message);
      await this.updateAccountStatus(account, 'error', error.message);
      
      // Schedule reconnection if not too many failures
      const connection = this.connections.get(accountId);
      if (connection && connection.errorCount < this.maxReconnectAttempts) {
        this.scheduleReconnection(accountId, this.reconnectDelay);
      }
    }
  }

  private setupSafeImapEventHandlers(connection: ImapConnection, accountId: string): void {
    const { imap, account } = connection;

    // Wrap all event handlers in try-catch
    imap.once('ready', () => {
      try {
        connection.isConnected = true;
        connection.isReconnecting = false;
        connection.errorCount = 0;
        logger.info(`IMAP connection ready for ${account.email}`);
        
        this.updateAccountStatus(account, 'connected').catch(err => 
          logger.error('Failed to update status:', err.message)
        );
        
        this.safeSyncEmails(connection).catch(err => 
          logger.error('Failed to sync emails:', err.message)
        );
      } catch (error: any) {
        logger.error('Error in ready handler:', error.message);
      }
    });

    imap.once('error', (error: any) => {
      try {
        connection.errorCount++;
        connection.isReconnecting = false;
        logger.error(`IMAP error for ${account.email}:`, {
          message: error.message,
          code: error.code,
          errno: error.errno,
          source: error.source
        });
        
        this.updateAccountStatus(account, 'error', error.message).catch(err => 
          logger.error('Failed to update status:', err.message)
        );
        
        // Don't crash - schedule reconnection instead
        if (connection.errorCount < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * connection.errorCount;
          logger.info(`Scheduling reconnection for ${account.email} in ${delay}ms (attempt ${connection.errorCount})`);
          this.scheduleReconnection(accountId, delay);
        } else {
          logger.error(`Too many errors for ${account.email}, giving up`);
        }
      } catch (handlerError: any) {
        logger.error('Error in error handler:', handlerError.message);
      }
    });

    imap.once('end', () => {
      try {
        connection.isConnected = false;
        connection.isReconnecting = false;
        logger.info(`IMAP connection ended for ${account.email}`);
        
        // Only reconnect if not in error state
        if (account.syncStatus !== 'error' && connection.errorCount < this.maxReconnectAttempts) {
          this.scheduleReconnection(accountId, this.reconnectDelay);
        }
      } catch (error: any) {
        logger.error('Error in end handler:', error.message);
      }
    });

    imap.on('mail', (numNewMsgs: number) => {
      try {
        logger.info(`${numNewMsgs} new emails for ${account.email}`);
        this.safeSyncNewEmails(connection).catch(err => 
          logger.error('Failed to sync new emails:', err.message)
        );
      } catch (error: any) {
        logger.error('Error in mail handler:', error.message);
      }
    });
  }

  private async safeSyncEmails(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;
    const accountId = (account._id as any).toString();

    try {
      await this.updateAccountStatus(account, 'syncing');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Sync timeout'));
        }, 120000); // 2 minute timeout

        imap.openBox('INBOX', true, async (err: any, box: any) => {
          if (err) {
            clearTimeout(timeout);
            logger.error(`Failed to open INBOX for ${account.email}:`, err.message);
            await this.updateAccountStatus(account, 'error', err.message);
            reject(err);
            return;
          }

          try {
            const totalMessages = box.messages.total;
            if (totalMessages === 0) {
              clearTimeout(timeout);
              logger.info(`No messages in INBOX for ${account.email}`);
              await this.updateAccountStatus(account, 'completed');
              resolve();
              return;
            }

            // Sync recent emails (last 150 or all if less)
            const limit = Math.min(totalMessages, 150);
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
              this.safeProcessMessage(msg, account, seqno).then(() => {
                processed++;
                this.syncProgress.set(accountId, { processed, total: limit });
                
                if (processed === limit) {
                  clearTimeout(timeout);
                  logger.info(`Completed syncing ${processed} emails for ${account.email}`);
                  this.updateAccountSyncStats(account, processed, 0);
                  this.updateAccountStatus(account, 'completed');
                  resolve();
                }
              }).catch((error) => {
                logger.error(`Error processing message ${seqno} for ${account.email}:`, error.message);
              });
            });

            fetch.once('error', async (error: any) => {
              clearTimeout(timeout);
              logger.error(`Fetch error for ${account.email}:`, error.message);
              await this.updateAccountStatus(account, 'error', error.message);
              reject(error);
            });

            fetch.once('end', async () => {
              if (processed === limit) {
                clearTimeout(timeout);
                
                // Bulk index all processed emails
                try {
                  const allProcessedEmails = await Email.find({
                    accountId: accountId,
                    receivedDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                  }).limit(processed);
                  
                  await this.bulkIndexEmailsInElasticsearch(allProcessedEmails);
                } catch (bulkError: any) {
                  logger.debug('Bulk indexing after sync failed:', bulkError.message);
                }
                
                logger.info(`Completed syncing ${processed} emails for ${account.email}`);
                this.updateAccountSyncStats(account, processed, 0);
                this.updateAccountStatus(account, 'completed');
                resolve();
              }
            });

          } catch (error: any) {
            clearTimeout(timeout);
            logger.error(`Sync error for ${account.email}:`, error.message);
            await this.updateAccountStatus(account, 'error', error.message);
            reject(error);
          }
        });
      });
    } catch (error: any) {
      logger.error(`Sync error for ${account.email}:`, error.message);
      await this.updateAccountStatus(account, 'error', error.message);
      throw error;
    }
  }

  private async safeProcessMessage(msg: any, account: IEmailAccount, seqno: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let attributes: any = null;

      try {
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
              resolve();
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
              folder: 'inbox',
              isRead: attributes?.flags?.includes('\\Seen') || false,
              receivedDate: parsed.date || new Date(),
              aiProcessed: false
            };

            if (parsed.attachments && parsed.attachments.length > 0) {
              emailDoc.attachments = parsed.attachments.map((att: any) => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                contentId: att.cid
              }));
            }

            // Safe AI classification
            try {
              const aiResult = await this.aiService.classifyEmail(emailDoc);
              emailDoc.aiCategory = aiResult.category;
              emailDoc.aiConfidence = aiResult.confidence;
              emailDoc.aiProcessed = true;
              
              // Add LLM-based sales insights
              if (aiResult.salesInsights) {
                emailDoc.aiInsights = {
                  sentiment: aiResult.salesInsights.intent === 'ready_to_buy' ? 'positive' : 'neutral',
                  urgency: aiResult.salesInsights.urgency,
                  intent: aiResult.salesInsights.intent,
                  keyTopics: aiResult.salesInsights.buyingSignals || [],
                  suggestedResponse: aiResult.salesInsights.nextAction
                };
              }
            } catch (aiError: any) {
              logger.debug('AI classification failed, using fallback:', aiError.message);
              emailDoc.aiCategory = 'interested';
              emailDoc.aiConfidence = 0.3;
              emailDoc.aiProcessed = false;
            }

            const savedEmail = await Email.create(emailDoc);
            
            // Safe Elasticsearch indexing
            try {
              await this.indexEmailInElasticsearch(savedEmail);
            } catch (esError: any) {
              logger.debug('Elasticsearch indexing failed:', esError.message);
            }

            // Safe notifications
            try {
              if (['interested', 'meeting_booked'].includes(emailDoc.aiCategory)) {
                await this.notificationService.processInterestedEmail(savedEmail);
              }
            } catch (notifError: any) {
              logger.debug('Notification failed:', notifError.message);
            }

            this.emit('emailProcessed', savedEmail);
            resolve();
            
          } catch (error: any) {
            logger.error(`Error processing message for ${account.email}:`, error.message);
            reject(error);
          }
        });

      } catch (error: any) {
        logger.error(`Error setting up message handlers:`, error.message);
        reject(error);
      }
    });
  }

  private async safeSyncNewEmails(connection: ImapConnection): Promise<void> {
    const { imap, account } = connection;

    try {
      imap.openBox('INBOX', true, (err: any, box: any) => {
        if (err) {
          logger.error(`Failed to open INBOX for new emails ${account.email}:`, err.message);
          return;
        }

        imap.search(['UNSEEN'], (searchErr: any, results: number[]) => {
          if (searchErr) {
            logger.error(`Search error for ${account.email}:`, searchErr.message);
            return;
          }

          if (!results || results.length === 0) {
            return;
          }

          logger.info(`Processing ${results.length} new emails for ${account.email}`);

          const fetch = imap.fetch(results, {
            bodies: '',
            struct: true,
            envelope: true
          });

          fetch.on('message', (msg: any, seqno: number) => {
            this.safeProcessMessage(msg, account, seqno).catch((error) => {
              logger.error(`Error processing new message ${seqno}:`, error.message);
            });
          });
        });
      });
    } catch (error: any) {
      logger.error(`Error syncing new emails for ${account.email}:`, error.message);
    }
  }

  private async safeDisconnectAccount(accountId: string): Promise<void> {
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
    } catch (error: any) {
      logger.error(`Error disconnecting account ${accountId}:`, error.message);
    }
  }

  private async indexEmailInElasticsearch(email: any): Promise<void> {
    try {
      const success = await indexEmailInElasticsearch(email);
      if (!success) {
        logger.debug(`Failed to index email ${email._id} in Elasticsearch`);
      }
    } catch (error: any) {
      // Don't throw - just log
      logger.debug(`Elasticsearch indexing error for ${email._id}:`, error.message);
    }
  }

  private async bulkIndexEmailsInElasticsearch(emails: any[]): Promise<void> {
    if (!emails || emails.length === 0) return;
    
    try {
      const successCount = await bulkIndexEmails(emails);
      logger.info(`📊 Bulk indexed ${successCount}/${emails.length} emails in Elasticsearch`);
    } catch (error: any) {
      logger.debug('Bulk Elasticsearch indexing failed:', error.message);
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
    } catch (updateError: any) {
      logger.error('Failed to update account status:', updateError.message);
    }
  }

  private async updateAccountSyncStats(account: IEmailAccount, processed: number, errors: number): Promise<void> {
    try {
      await EmailAccount.findByIdAndUpdate(account._id, {
        'syncStats.processedEmails': processed,
        'syncStats.totalEmails': processed,
        'syncStats.lastSyncAt': new Date()
      });
    } catch (error: any) {
      logger.error('Failed to update sync stats:', error.message);
    }
  }

  private scheduleReconnection(accountId: string, delay: number): void {
    try {
      const existingTimeout = this.reconnectTimeouts.get(accountId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        try {
          const account = await EmailAccount.findById(accountId);
          if (account && account.isActive) {
            logger.info(`Reconnecting to ${account.email}...`);
            await this.safeConnectToAccount(account);
          }
        } catch (error: any) {
          logger.error(`Reconnection failed for ${accountId}:`, error.message);
        }
      }, delay);

      this.reconnectTimeouts.set(accountId, timeout);
    } catch (error: any) {
      logger.error(`Failed to schedule reconnection:`, error.message);
    }
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
        syncProgress: progress || null,
        isReconnecting: connection.isReconnecting
      };
    });

    return status;
  }

  public async syncAllAccounts(): Promise<void> {
    try {
      const accounts = await EmailAccount.find({ isActive: true });
      
      for (const account of accounts) {
        try {
          await this.safeConnectToAccount(account);
        } catch (error: any) {
          logger.error(`Failed to sync account ${account.email}:`, error.message);
          // Continue with other accounts
        }
      }
    } catch (error: any) {
      logger.error('Failed to sync all accounts:', error.message);
    }
  }

  public async forceFreshSync(): Promise<void> {
    try {
      logger.info('🔄 Starting fresh email sync...');
      
      // Clear existing emails
      await Email.deleteMany({});
      logger.info('🗑️ Cleared existing emails for fresh sync');
      
      // Clear any existing IMAP connections
      for (const [accountId] of this.connections) {
        await this.safeDisconnectAccount(accountId);
      }
      
      // Wait a moment then start fresh sync
      setTimeout(async () => {
        await this.syncAllAccounts();
      }, 2000);
    } catch (error: any) {
      logger.error('Failed to perform fresh sync:', error.message);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      for (const [accountId] of this.connections) {
        await this.safeDisconnectAccount(accountId);
      }
      
      logger.info('All IMAP connections disconnected');
    } catch (error: any) {
      logger.error('Error during disconnect:', error.message);
    }
  }
}
