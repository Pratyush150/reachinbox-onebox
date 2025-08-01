// server/src/services/LocalLLMService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export class LocalLLMService {
  private ollamaUrl: string;
  private modelName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.LLM_MODEL || 'qwen2:0.5b'; // 3.8GB model
  }

  async initialize(): Promise<void> {
    try {
      // Check if Ollama is running
      await axios.get(`${this.ollamaUrl}/api/tags`);
      
      // Check if model is available
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data.models || [];
      const modelExists = models.some((m: any) => m.name.includes(this.modelName.split(':')[0]));
      
      if (!modelExists) {
        logger.info(`📥 Downloading ${this.modelName} model...`);
        await this.downloadModel();
      }
      
      this.isInitialized = true;
      logger.info(`✅ Local LLM Service initialized with ${this.modelName}`);
    } catch (error) {
      logger.warn('⚠️ Local LLM not available, falling back to rule-based classification');
      this.isInitialized = false;
    }
  }

  private async downloadModel(): Promise<void> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/pull`, {
        name: this.modelName
      }, { timeout: 300000 }); // 5 min timeout
      
      logger.info(`✅ Model ${this.modelName} downloaded successfully`);
    } catch (error) {
      throw new Error(`Failed to download model: ${error}`);
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    if (!this.isInitialized) {
      return this.fallbackClassification(email);
    }

    try {
      const prompt = this.buildClassificationPrompt(email);
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 50
        }
      }, { timeout: 10000 });

      const result = this.parseResponse(response.data.response);
      return result;
    } catch (error) {
      logger.error('Local LLM classification failed:', error);
      return this.fallbackClassification(email);
    }
  }

  private buildClassificationPrompt(email: any): string {
    const subject = email.subject?.substring(0, 100) || '';
    const body = email.textBody?.substring(0, 300) || '';
    
    return `Classify this email into ONE category: interested, meeting_booked, not_interested, spam, out_of_office

Email:
Subject: ${subject}
Body: ${body}

Respond with only: CATEGORY:confidence_score (e.g., interested:0.9)

Categories:
- interested: buying intent, wants demo, positive response
- meeting_booked: meeting confirmed, calendar invite
- not_interested: rejection, unsubscribe, negative
- spam: promotional, suspicious content
- out_of_office: auto-reply, vacation message

Response:`;
  }

  private parseResponse(response: string): { category: string; confidence: number } {
    try {
      const match = response.match(/(\w+):([0-9.]+)/);
      if (match) {
        const category = match[1].toLowerCase();
        const confidence = Math.min(Math.max(parseFloat(match[2]), 0), 1);
        
        const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
        if (validCategories.includes(category)) {
          return { category, confidence };
        }
      }
    } catch (error) {
      logger.error('Failed to parse LLM response:', error);
    }
    
    return this.fallbackClassification({ subject: '', textBody: '' });
  }

  private fallbackClassification(email: any): { category: string; confidence: number } {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.textBody || '').toLowerCase();
    const text = `${subject} ${body}`;

    if (text.includes('interested') || text.includes('demo') || text.includes('pricing')) {
      return { category: 'interested', confidence: 0.8 };
    }
    if (text.includes('meeting') || text.includes('calendar') || text.includes('confirmed')) {
      return { category: 'meeting_booked', confidence: 0.85 };
    }
    if (text.includes('not interested') || text.includes('unsubscribe')) {
      return { category: 'not_interested', confidence: 0.8 };
    }
    if (text.includes('out of office') || text.includes('vacation')) {
      return { category: 'out_of_office', confidence: 0.9 };
    }
    if (text.includes('free') || text.includes('winner') || text.includes('claim')) {
      return { category: 'spam', confidence: 0.9 };
    }

    return { category: 'interested', confidence: 0.3 };
  }

  async generateReply(email: any, category: string): Promise<string> {
    if (!this.isInitialized) {
      return this.generateFallbackReply(email, category);
    }

    try {
      const prompt = `Generate a professional email reply for this ${category} email:

Original: ${email.subject}
${email.textBody?.substring(0, 200)}

Write a brief (2-3 sentences), professional response:`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 150
        }
      }, { timeout: 15000 });

      return response.data.response.trim();
    } catch (error) {
      logger.error('Local LLM reply generation failed:', error);
      return this.generateFallbackReply(email, category);
    }
  }

  private generateFallbackReply(email: any, category: string): string {
    const name = email.from?.name || 'there';
    
    switch (category) {
      case 'interested':
        return `Hi ${name},\n\nThank you for your interest! I'd be happy to schedule a demo call to show you how our solution can help.\n\nBest regards`;
      case 'meeting_booked':
        return `Hi ${name},\n\nThank you for confirming. I look forward to our meeting and will send a calendar invite shortly.\n\nBest regards`;
      case 'not_interested':
        return `Hi ${name},\n\nThank you for letting me know. If your situation changes, please don't hesitate to reach out.\n\nBest regards`;
      default:
        return `Hi ${name},\n\nThank you for your email. I'll get back to you with more information soon.\n\nBest regards`;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}
