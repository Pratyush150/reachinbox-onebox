import { logger } from '../utils/logger';
import { ImapService } from './ImapService';
import { AiService } from './AiService';
import { NotificationService } from './NotificationService';
import { setImapService } from '../routes/accounts';

let imapService: ImapService;
let aiService: AiService;
let notificationService: NotificationService;

export async function initializeServices(): Promise<void> {
  try {
    // Initialize services
    notificationService = new NotificationService();
    aiService = new AiService();
    imapService = new ImapService();
    
    // Set up service dependencies
    setImapService(imapService);
    
    // Initialize all services
    await imapService.initialize();
    await aiService.initialize();
    
    logger.info('🎉 All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

export { imapService, aiService, notificationService };

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (imapService) {
    await imapService.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (imapService) {
    await imapService.shutdown();
  }
  process.exit(0);
});
