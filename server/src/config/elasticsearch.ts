import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

export const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

export async function connectElasticsearch(): Promise<void> {
  try {
    const health = await elasticClient.cluster.health();
    logger.info('✅ Elasticsearch connected successfully');

    const indexExists = await elasticClient.indices.exists({ index: 'emails' });
    
    if (!indexExists) {
      await elasticClient.indices.create({
        index: 'emails',
        body: {
          mappings: {
            properties: {
              messageId: { type: 'keyword' },
              accountId: { type: 'keyword' },
              from: { type: 'text' },
              to: { type: 'text' },
              subject: { type: 'text' },
              body: { type: 'text' },
              folder: { type: 'keyword' },
              aiCategory: { type: 'keyword' },
              receivedDate: { type: 'date' }
            }
          }
        }
      });
      logger.info('📋 Created emails index');
    }

  } catch (error) {
    logger.error('Failed to connect to Elasticsearch:', error);
    throw error;
  }
}
