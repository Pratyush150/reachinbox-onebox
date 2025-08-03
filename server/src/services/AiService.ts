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

  // FIXED: Updated to match the route expectations
  async generateResponse(email: any, category: string, customPrompt?: string): Promise<string> {
    try {
      return await this.localLLM.generateReply(email, category, customPrompt);
    } catch (error) {
      logger.error('Response generation failed:', error);
      return `Thank you for your email. I'll get back to you soon.`;
    }
  }

  // FIXED: Add missing methods that ai.ts route expects
  isAvailable(): boolean {
    return this.localLLM.isAvailable();
  }

  getStatus(): any {
    return this.localLLM.getStatus();
  }

  // FIXED: Cleanup method
  async cleanup(): Promise<void> {
    try {
      await this.localLLM.cleanup();
      logger.info('🧹 AI Service cleaned up');
    } catch (error) {
      logger.error('Error during AI cleanup:', error);
    }
  }
}
