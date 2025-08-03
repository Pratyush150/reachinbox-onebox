import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

export const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  requestTimeout: 10000,
  pingTimeout: 3000,
  maxRetries: 3
});

export async function connectElasticsearch(): Promise<void> {
  try {
    const health = await elasticClient.cluster.health({
      timeout: '5s'
    });
    
    logger.info('✅ Elasticsearch connected:', {
      status: health.status,
      cluster: health.cluster_name
    });

    // Enhanced email index mapping
    const indexExists = await elasticClient.indices.exists({ 
      index: 'emails' 
    });
    
    if (!indexExists) {
      await elasticClient.indices.create({
        index: 'emails',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'stop',
                    'snowball'
                  ]
                }
              }
            }
          },
          mappings: {
            properties: {
              messageId: { 
                type: 'keyword',
                index: true
              },
              accountId: { 
                type: 'keyword' 
              },
              from: { 
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
              },
              to: { 
                type: 'text',
                analyzer: 'email_analyzer'
              },
              subject: { 
                type: 'text',
                analyzer: 'email_analyzer',
                boost: 2.0
              },
              body: { 
                type: 'text',
                analyzer: 'email_analyzer'
              },
              folder: { 
                type: 'keyword' 
              },
              aiCategory: { 
                type: 'keyword' 
              },
              aiConfidence: { 
                type: 'float' 
              },
              receivedDate: { 
                type: 'date' 
              },
              isRead: { 
                type: 'boolean' 
              },
              isStarred: { 
                type: 'boolean' 
              },
              isArchived: { 
                type: 'boolean' 
              },
              attachments: {
                type: 'nested',
                properties: {
                  filename: { type: 'text' },
                  contentType: { type: 'keyword' },
                  size: { type: 'integer' }
                }
              }
            }
          }
        }
      });
      
      logger.info('📋 Created enhanced emails index with custom analyzer');
    }

  } catch (error: any) {
    logger.error('Failed to connect to Elasticsearch:', {
      message: error.message,
      meta: error.meta || null
    });
    
    // Don't throw - let app continue with MongoDB fallback
    logger.warn('⚠️ Continuing without Elasticsearch - search will use MongoDB');
  }
}

// Enhanced indexing function with error handling
export async function indexEmailInElasticsearch(email: any): Promise<boolean> {
  try {
    await elasticClient.index({
      index: 'emails',
      id: email._id.toString(),
      body: {
        messageId: email.messageId,
        accountId: email.accountId,
        from: email.from?.address || '',
        to: email.to?.map((t: any) => t.address).join(', ') || '',
        subject: email.subject || '',
        body: email.textBody || '',
        folder: email.folder,
        aiCategory: email.aiCategory,
        aiConfidence: email.aiConfidence,
        receivedDate: email.receivedDate,
        isRead: email.isRead,
        isStarred: email.isStarred,
        isArchived: email.isArchived,
        attachments: email.attachments || []
      },
      refresh: false // Don't refresh immediately for performance
    });
    
    return true;
  } catch (error: any) {
    logger.debug('Failed to index email in Elasticsearch:', {
      emailId: email._id,
      error: error.message
    });
    return false;
  }
}

// Bulk indexing for better performance
export async function bulkIndexEmails(emails: any[]): Promise<number> {
  if (!emails || emails.length === 0) return 0;

  try {
    const body = emails.flatMap(email => [
      { 
        index: { 
          _index: 'emails', 
          _id: email._id.toString() 
        } 
      },
      {
        messageId: email.messageId,
        accountId: email.accountId,
        from: email.from?.address || '',
        to: email.to?.map((t: any) => t.address).join(', ') || '',
        subject: email.subject || '',
        body: email.textBody || '',
        folder: email.folder,
        aiCategory: email.aiCategory,
        aiConfidence: email.aiConfidence,
        receivedDate: email.receivedDate,
        isRead: email.isRead,
        isStarred: email.isStarred,
        isArchived: email.isArchived,
        attachments: email.attachments || []
      }
    ]);

    const response = await elasticClient.bulk({
      body,
      refresh: false
    });

    const successCount = response.items.reduce((count, item) => {
      return item.index?.status === 201 ? count + 1 : count;
    }, 0);

    logger.info(`📊 Bulk indexed ${successCount}/${emails.length} emails`);
    return successCount;

  } catch (error: any) {
    logger.error('Bulk indexing failed:', error.message);
    return 0;
  }
}
