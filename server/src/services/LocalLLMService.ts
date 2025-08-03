// server/src/services/LocalLLMService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export class LocalLLMService {
  private ollamaUrl: string;
  private modelName: string;
  private isInitialized: boolean = false;
  private classificationQueue: Array<{
    email: any;
    resolve: (result: { category: string; confidence: number }) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing: boolean = false;
  private requestTimeout = 8000;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.LLM_MODEL || 'qwen2:0.5b';
  }

  async initialize(): Promise<void> {
    try {
      logger.info('🤖 Initializing Qwen2 LLM...');

      // Check if Ollama is running
      const healthResponse = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 3000,
        headers: { 'Connection': 'close' }
      });

      const models = healthResponse.data.models || [];
      const modelExists = models.some((m: any) => m.name.includes('qwen2'));

      if (modelExists) {
        // Test the model
        const testResponse = await this.testModel();
        this.isInitialized = testResponse;

        if (this.isInitialized) {
          logger.info(`✅ Qwen2 LLM ready and tested successfully`);
        } else {
          logger.warn('⚠️ Qwen2 model test failed, using rule-based fallback');
        }
      } else {
        logger.warn('⚠️ Qwen2 model not found, using rule-based classification');
        this.isInitialized = false;
      }
    } catch (error: any) {
      this.isInitialized = false;
      logger.warn('⚠️ Ollama/Qwen2 not available, using rule-based classification');
    }
  }

  private async testModel(): Promise<boolean> {
    try {
      logger.info('🧪 Testing Qwen2 model...');
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: "Say: test",
        stream: false,
        options: { temperature: 0.1, max_tokens: 10 }
      }, {
        timeout: 10000,
        headers: { 'Connection': 'close' }
      });
      
      const result = response.data.response?.trim() || '';
      logger.info(`🧪 Test response: "${result}"`);
      
      if (result.length > 0) {
        logger.info('✅ Qwen2 model test passed');
        return true;
      } else {
        logger.warn('⚠️ Qwen2 model returned empty response');
        return false;
      }
    } catch (error: any) {
      logger.error(`❌ Qwen2 model test failed: ${error.message}`);
      return false;
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    // QUEUE SYSTEM: Add to queue and wait for sequential processing
    if (this.isInitialized) {
      return new Promise((resolve, reject) => {
        this.classificationQueue.push({ email, resolve, reject });
        this.processQueue();
      });
    }

    // Fallback if LLM not available
    const fallbackResult = this.ruleBasedClassify(email);
    logger.info(`🔧 Rule-based classification: ${fallbackResult.category} (${Math.round(fallbackResult.confidence * 100)}%)`);
    return fallbackResult;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.classificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info(`📋 Processing LLM queue: ${this.classificationQueue.length} emails waiting`);

    while (this.classificationQueue.length > 0) {
      const { email, resolve, reject } = this.classificationQueue.shift()!;
      
      try {
        const result = await this.classifyWithLLM(email);
        
        if (result && this.validateLLMResult(result, email)) {
          logger.info(`✅ LLM: ${result.category} (${Math.round(result.confidence * 100)}%) - ${this.classificationQueue.length} left`);
          resolve(result);
        } else {
          const fallback = this.ruleBasedClassify(email);
          logger.info(`🔧 Fallback: ${fallback.category} (${Math.round(fallback.confidence * 100)}%)`);
          resolve(fallback);
        }
      } catch (error: any) {
        const fallback = this.ruleBasedClassify(email);
        logger.warn(`❌ LLM error, fallback: ${fallback.category}`);
        resolve(fallback);
      }

      // No delay for speed
    }

    this.isProcessing = false;
    logger.info(`✅ Queue completed`);
  }

  private async classifyWithLLM(email: any): Promise<{ category: string; confidence: number } | null> {
    const prompt = this.buildOptimizedPrompt(email);
    
    logger.debug(`🤖 LLM Prompt: "${prompt.substring(0, 200)}..."`);

    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: this.modelName,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 15,
        stop: ['\n', 'Email:', 'Text:', 'Category:']
      }
    }, {
      timeout: this.requestTimeout,
      headers: { 'Connection': 'close' }
    });

    const rawResponse = response.data.response?.trim() || '';
    logger.debug(`🤖 Raw LLM response: "${rawResponse}"`);

    if (!rawResponse || rawResponse.length < 3) {
      throw new Error('LLM response too short or empty');
    }

    return this.parseLLMResponse(rawResponse);
  }

  private buildOptimizedPrompt(email: any): string {
    const subject = (email.subject || '').substring(0, 80);
    const body = (email.textBody || '').substring(0, 200);
    const from = email.from?.address || '';

    // Enhanced prompt with clear examples
    return `Classify this email into exactly ONE category:

SPAM: promotional, ads, verification codes, newsletters, automated messages
NOT_INTERESTED: rejections, unsubscribe, complaints  
INTERESTED: wants to buy, demo, pricing, business inquiry
MEETING_BOOKED: meeting confirmed, calendar accepted
OUT_OF_OFFICE: vacation, auto-reply, away

Examples:
- "Verify your email" = SPAM
- "Instagram business tips" = SPAM  
- "Budget approved for demo" = INTERESTED
- "Meeting confirmed" = MEETING_BOOKED
- "Not interested in service" = NOT_INTERESTED

Email:
From: ${from}
Subject: ${subject}
Body: ${body}

Classification:`;
  }

  private parseLLMResponse(response: string): { category: string; confidence: number } | null {
    const cleaned = response.toLowerCase().trim();
    
    // Map LLM outputs to our categories
    const categoryMapping = {
      'spam': 'spam',
      'not_interested': 'not_interested', 
      'interested': 'interested',
      'meeting_booked': 'meeting_booked',
      'out_of_office': 'out_of_office'
    };

    // Enhanced parsing for the new format
    for (const [llmCategory, ourCategory] of Object.entries(categoryMapping)) {
      if (cleaned.includes(llmCategory)) {
        return { category: ourCategory, confidence: 0.85 };
      }
    }

    // Fallback patterns
    if (cleaned.includes('verification') || cleaned.includes('verify') || cleaned.includes('promotional')) {
      return { category: 'spam', confidence: 0.9 };
    }

    return null;
  }

  private validateLLMResult(result: { category: string; confidence: number }, email: any): boolean {
    // Basic validation
    if (!result.category || result.confidence < 0.1 || result.confidence > 1) {
      return false;
    }

    const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
    if (!validCategories.includes(result.category)) {
      return false;
    }

    // Context validation
    const text = `${email.subject || ''} ${email.textBody || ''}`.toLowerCase();
    
    // Check for obvious contradictions
    if (result.category === 'not_interested' && text.includes('interested')) {
      return false;
    }
    
    if (result.category === 'spam' && text.includes('meeting') && text.includes('calendar')) {
      return false;
    }

    if (result.category === 'out_of_office' && !text.match(/(office|vacation|away|auto.?reply)/)) {
      return false;
    }

    return true;
  }

  private ruleBasedClassify(email: any): { category: string; confidence: number } {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.textBody || '').toLowerCase();
    const text = `${subject} ${body}`;

    // High confidence patterns
    if (text.match(/(out.?of.?office|vacation|auto.?reply|away.?message)/)) {
      return { category: 'out_of_office', confidence: 0.95 };
    }

    if (text.match(/(meeting.?confirmed|calendar.?invite|zoom.?meeting|teams.?meeting)/)) {
      return { category: 'meeting_booked', confidence: 0.9 };
    }

    if (text.match(/(unsubscribe|not.?interested|remove.?me|stop.?emailing)/)) {
      return { category: 'not_interested', confidence: 0.85 };
    }

    // Enhanced spam detection
    const spamPatterns = [
      /winner|congratulations|claim.?now|limited.?time|act.?now/,
      /free.?money|click.?here|urgent|special.?offer|99%.?off/,
      /buy.?now|discount|save.?money|loan.?approved/
    ];
    
    const spamCount = spamPatterns.filter(pattern => pattern.test(text)).length;
    if (spamCount >= 2) {
      return { category: 'spam', confidence: 0.9 };
    }

    // Enhanced interest detection
    const interestPatterns = [
      /interested.?in|schedule.?demo|pricing.?information|want.?to.?learn/,
      /budget.?approved|ready.?to.?(purchase|buy)|next.?steps/,
      /proposal|contract|agreement|purchase|solution/
    ];
    
    const interestCount = interestPatterns.filter(pattern => pattern.test(text)).length;
    if (interestCount >= 1) {
      return { category: 'interested', confidence: 0.75 + (interestCount * 0.05) };
    }

    // Medium confidence patterns
    if (text.match(/(demo|pricing|quote|proposal)/)) {
      return { category: 'interested', confidence: 0.7 };
    }

    if (text.match(/(meeting|call|schedule)/)) {
      return { category: 'interested', confidence: 0.65 };
    }

    // Default with context
    if (subject.match(/re:|fw:/)) {
      return { category: 'interested', confidence: 0.5 };
    }

    return { category: 'interested', confidence: 0.3 };
  }

  async generateReply(email: any, category: string, customPrompt?: string): Promise<string> {
    if (this.isInitialized) {
      try {
        return await this.generateLLMReply(email, category, customPrompt);
      } catch (error: any) {
        logger.warn(`LLM reply generation failed: ${error.message}`);
      }
    }

    return this.generateTemplateReply(email, category, customPrompt);
  }

  private async generateLLMReply(email: any, category: string, customPrompt?: string): Promise<string> {
    const prompt = this.buildReplyPrompt(email, category, customPrompt);
    
    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: this.modelName,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        max_tokens: 200
      }
    }, {
      timeout: 15000,
      headers: { 'Connection': 'close' }
    });

    const generatedReply = response.data.response?.trim() || '';
    
    if (generatedReply.length < 20) {
      throw new Error('LLM reply too short');
    }

    return this.enhanceReply(generatedReply, email);
  }

  private buildReplyPrompt(email: any, category: string, customPrompt?: string): string {
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';
    const subject = email.subject || 'your message';

    if (customPrompt) {
      return `Write a professional email reply to ${senderName}.

Task: ${customPrompt}

Reply:`;
    }

    const categoryPrompts = {
      interested: 'Write a helpful reply to someone interested in our solution.',
      meeting_booked: 'Write a confirmation reply for a scheduled meeting.',
      not_interested: 'Write a gracious reply to someone who declined.',
      spam: 'Write a brief acknowledgment.',
      out_of_office: 'Write a professional acknowledgment.'
    };

    return `Write a professional email reply to ${senderName} about: ${subject}

Context: ${categoryPrompts[category as keyof typeof categoryPrompts]}

Reply:`;
  }

  private enhanceReply(reply: string, email: any): string {
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';
    let enhanced = reply.trim();

    if (!enhanced.toLowerCase().startsWith('hi ') && !enhanced.toLowerCase().startsWith('hello ')) {
      enhanced = `Hi ${senderName},\n\n${enhanced}`;
    }

    if (!enhanced.toLowerCase().includes('best regards') && !enhanced.toLowerCase().includes('best') && 
        !enhanced.toLowerCase().includes('sincerely')) {
      enhanced += '\n\nBest regards';
    }

    return enhanced.replace(/\n{3,}/g, '\n\n').trim();
  }

  private generateTemplateReply(email: any, category: string, customPrompt?: string): string {
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';

    if (customPrompt) {
      return `Hi ${senderName},

Thank you for your email. I appreciate you reaching out and I'd be happy to help with your request.

Best regards`;
    }

    const templates = {
      interested: `Hi ${senderName},

Thank you for your interest in our solution! I'd love to learn more about your needs and show you how we can help.

Would you be available for a brief call this week?

Best regards`,
      
      meeting_booked: `Hi ${senderName},

Perfect! I've confirmed our meeting and I'm looking forward to our discussion.

I'll send over the agenda beforehand.

Best regards`,
      
      not_interested: `Hi ${senderName},

I understand, and I appreciate you letting me know.

If anything changes in the future, please feel free to reach out.

Best regards`,
      
      spam: `Thank you for your email.

Best regards`,
      
      out_of_office: `Hi ${senderName},

Thank you for the auto-reply. I'll follow up once you're back.

Best regards`
    };

    return templates[category as keyof typeof templates] || templates.interested;
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  getStatus(): any {
    return {
      initialized: this.isInitialized,
      ollamaUrl: this.ollamaUrl,
      modelName: this.modelName,
      queueLength: this.classificationQueue.length,
      isProcessing: this.isProcessing,
      requestTimeout: this.requestTimeout,
      version: '4.0.0 - Sequential Queue Processing'
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.classificationQueue.length = 0;
      this.isProcessing = false;
      logger.info('🧹 Local LLM Service cleaned up');
    } catch (error) {
      logger.error('Error during LLM cleanup:', error);
    }
  }
}
