import { ImapService } from './ImapService';
import { AiService } from './AiService';
import { NotificationService } from './NotificationService';
import { setImapService } from '../routes/accounts';
import { logger } from '../utils/logger';

export let imapService: ImapService;
export let aiService: AiService;
export let notificationService: NotificationService;

export async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    aiService = new AiService();
    await aiService.initialize();
    notificationService = new NotificationService();
    imapService = new ImapService(aiService, notificationService);

    setImapService(imapService);
    await imapService.syncAllAccounts();

    logger.info('✅ All services initialized successfully');
  } catch (error: any) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

export async function shutdownServices(): Promise<void> {
  try {
    logger.info('Shutting down services...');
    if (imapService) {
      await imapService.disconnect();
    }
    logger.info('✅ Services shutdown completed');
  } catch (error: any) {
    logger.error('❌ Error during service shutdown:', error);
  }
}

process.on('SIGTERM', async () => {
  await shutdownServices();
});

process.on('SIGINT', async () => {
  await shutdownServices();
});
