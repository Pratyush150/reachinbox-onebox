import { LocalLLMService } from './LocalLLMService';
import { logger } from '../utils/logger';

export class AiService {
  private localLLM: LocalLLMService;

  constructor() {
    this.localLLM = new LocalLLMService();
  }

  async initialize(): Promise<void> {
    try {
      await this.localLLM.initialize();
      
      if (this.localLLM.isAvailable()) {
        logger.info('✅ AI Service initialized with Local LLM');
      } else {
        logger.info('✅ AI Service initialized with rule-based classification');
      }
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    try {
      return await this.localLLM.classifyEmail(email);
    } catch (error) {
      logger.error('Email classification failed:', error);
      return { category: 'interested', confidence: 0.3 };
    }
  }

  async generateResponse(email: any, category: string): Promise<string> {
    try {
      return await this.localLLM.generateReply(email, category);
    } catch (error) {
      logger.error('Response generation failed:', error);
      return `Thank you for your email. I'll get back to you soon.`;
    }
  }
}
