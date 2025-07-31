import { logger } from '../utils/logger';

export class ImapService {
  async initialize(): Promise<void> {
    logger.info('✅ IMAP Service initialized (stub)');
  }
}

export class AiService {
  async initialize(): Promise<void> {
    logger.info('✅ AI Service initialized (stub)');
  }
  
  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    return { category: 'interested', confidence: 0.8 };
  }
}

export class NotificationService {
  async processInterestedEmail(email: any): Promise<void> {
    logger.info(`📱 Processing: ${email.subject}`);
  }
}

export async function initializeServices(): Promise<void> {
  const imapService = new ImapService();
  const aiService = new AiService();
  const notificationService = new NotificationService();
  
  await imapService.initialize();
  await aiService.initialize();
  
  logger.info('🎉 All services initialized');
}
