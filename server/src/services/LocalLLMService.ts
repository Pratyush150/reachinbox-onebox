// server/src/services/LocalLLMService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export class LocalLLMService {
  private ollamaUrl: string;
  private modelName: string;
  private isInitialized: boolean = false;
  private requestQueue: Set<string> = new Set();
  private maxRequests = 2; // Limit concurrent requests for t3.medium
  private requestTimeout = 5000; // 5 second timeout

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.LLM_MODEL || 'qwen2:0.5b';
  }

  async initialize(): Promise<void> {
    try {
      logger.info('🤖 Checking Ollama availability...');
      
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { 
        timeout: 3000,
        headers: { 'Connection': 'close' } // Prevent socket leaks
      });
      
      const models = response.data.models || [];
      const modelExists = models.some((m: any) => m.name.includes('qwen2'));
      
      this.isInitialized = modelExists;
      
      if (this.isInitialized) {
        logger.info(`✅ Local LLM ready with ${this.modelName}`);
      } else {
        logger.warn('⚠️ LLM model not found, using rule-based classification');
      }
    } catch (error: any) {
      this.isInitialized = false;
      logger.warn('⚠️ Ollama not available, using rule-based classification');
      logger.debug('Ollama error:', error.message);
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    // Always use rule-based first as fallback
    const fallbackResult = this.ruleBasedClassify(email);
    
    // Use LLM only if available and not overloaded
    if (!this.isInitialized || this.requestQueue.size >= this.maxRequests) {
      return fallbackResult;
    }

    const requestId = Date.now().toString();
    this.requestQueue.add(requestId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const prompt = this.buildPrompt(email);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.1, 
          max_tokens: 20,
          stop: ['\n', 'Email:', 'Response:']
        }
      }, { 
        timeout: this.requestTimeout,
        signal: controller.signal,
        headers: { 'Connection': 'close' }
      });

      clearTimeout(timeoutId);
      
      const parsed = this.parseResponse(response.data.response);
      return parsed || fallbackResult;
      
    } catch (error: any) {
      logger.debug('LLM classification failed, using fallback:', error.message);
      return fallbackResult;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  private buildPrompt(email: any): string {
    const subject = email.subject?.substring(0, 80) || '';
    const body = email.textBody?.substring(0, 200) || '';
    
    return `Classify email into category: interested, meeting_booked, not_interested, spam, out_of_office

Subject: ${subject}
Body: ${body}

Reply with: category:confidence (e.g. interested:0.9)`;
  }

  private parseResponse(response: string): { category: string; confidence: number } | null {
    try {
      const cleaned = response.trim().toLowerCase();
      const match = cleaned.match(/(\w+):([0-9.]+)/);
      
      if (match) {
        const category = match[1];
        const confidence = Math.min(Math.max(parseFloat(match[2]), 0), 1);
        
        const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
        if (validCategories.includes(category)) {
          return { category, confidence };
        }
      }
      
      // Try to find category name in response
      const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
      for (const cat of validCategories) {
        if (cleaned.includes(cat.replace('_', ' ')) || cleaned.includes(cat)) {
          return { category: cat, confidence: 0.7 };
        }
      }
      
    } catch (error) {
      logger.debug('Failed to parse LLM response:', error);
    }
    
    return null;
  }

  private ruleBasedClassify(email: any): { category: string; confidence: number } {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.textBody || '').toLowerCase();
    const text = `${subject} ${body}`;

    // High confidence patterns
    if (text.includes('out of office') || text.includes('vacation') || text.includes('auto-reply')) {
      return { category: 'out_of_office', confidence: 0.95 };
    }
    
    if (text.includes('meeting confirmed') || text.includes('calendar invite') || text.includes('zoom meeting')) {
      return { category: 'meeting_booked', confidence: 0.9 };
    }
    
    if (text.includes('unsubscribe') || text.includes('not interested') || text.includes('remove me')) {
      return { category: 'not_interested', confidence: 0.85 };
    }
    
    if (text.includes('winner') || text.includes('congratulations') || text.includes('claim now') || text.includes('limited time')) {
      return { category: 'spam', confidence: 0.9 };
    }
    
    // Medium confidence patterns
    if (text.includes('interested in') || text.includes('schedule demo') || text.includes('pricing information')) {
      return { category: 'interested', confidence: 0.8 };
    }
    
    if (text.includes('demo') || text.includes('pricing') || text.includes('quote') || text.includes('proposal')) {
      return { category: 'interested', confidence: 0.75 };
    }
    
    if (text.includes('meeting') || text.includes('call') || text.includes('schedule')) {
      return { category: 'interested', confidence: 0.7 };
    }

    // Low confidence patterns
    if (text.includes('free') || text.includes('offer') || text.includes('promotion')) {
      return { category: 'spam', confidence: 0.6 };
    }
    
    // Default to interested with low confidence
    return { category: 'interested', confidence: 0.3 };
  }

  async generateReply(email: any, category: string): Promise<string> {
    // Use fallback templates for reliability
    return this.generateFallbackReply(email, category);
  }

  private generateFallbackReply(email: any, category: string): string {
    const name = email.from?.name || 'there';
    
    const templates = {
      interested: `Hi ${name},\n\nThank you for your interest! I'd be happy to schedule a demo call to show you how our solution can help.\n\nBest regards`,
      meeting_booked: `Hi ${name},\n\nThank you for confirming our meeting. I look forward to speaking with you.\n\nBest regards`,
      not_interested: `Hi ${name},\n\nThank you for letting me know. Please feel free to reach out if anything changes.\n\nBest regards`,
      spam: 'Thank you for your email.',
      out_of_office: 'Thank you for your email. I will respond when you return.',
      default: `Hi ${name},\n\nThank you for your email. I will get back to you shortly.\n\nBest regards`
    };
    
    return templates[category as keyof typeof templates] || templates.default;
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  getStatus(): any {
    return {
      initialized: this.isInitialized,
      ollamaUrl: this.ollamaUrl,
      modelName: this.modelName,
      activeRequests: this.requestQueue.size,
      maxRequests: this.maxRequests,
      requestTimeout: this.requestTimeout
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.requestQueue.clear();
      logger.info('🧹 Local LLM Service cleaned up');
    } catch (error) {
      logger.error('Error during LLM cleanup:', error);
    }
  }
}
