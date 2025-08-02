// server/src/services/LocalLLMService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export class LocalLLMService {
  private ollamaUrl: string;
  private modelName: string;
  private isInitialized: boolean = false;
  private requestQueue: Set<string> = new Set();
  private maxRequests = 3; // Slightly increased for better throughput
  private requestTimeout = 10000; // Increased to 10 seconds for better responses

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.LLM_MODEL || 'qwen2:0.5b';
  }

  async initialize(): Promise<void> {
    try {
      logger.info('🤖 Initializing Qwen2 LLM...');
      
      // First check if Ollama is running
      const healthResponse = await axios.get(`${this.ollamaUrl}/api/tags`, { 
        timeout: 5000,
        headers: { 'Connection': 'close' }
      });
      
      const models = healthResponse.data.models || [];
      const modelExists = models.some((m: any) => m.name.includes('qwen2'));
      
      if (modelExists) {
        // Test the model with a simple prompt
        const testResponse = await this.testModel();
        this.isInitialized = testResponse;
        
        if (this.isInitialized) {
          logger.info(`✅ Qwen2 LLM ready and tested successfully`);
        } else {
          logger.warn('⚠️ Qwen2 model exists but failed test, using rule-based fallback');
        }
      } else {
        logger.warn('⚠️ Qwen2 model not found, using rule-based classification');
        this.isInitialized = false;
      }
    } catch (error: any) {
      this.isInitialized = false;
      logger.warn('⚠️ Ollama/Qwen2 not available, using rule-based classification');
      logger.debug('Ollama error:', error.message);
    }
  }

  private async testModel(): Promise<boolean> {
    try {
      const testPrompt = "Classify this email: Subject: Demo Request. Reply with: interested:0.9";
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: testPrompt,
        stream: false,
        options: { 
          temperature: 0.1, 
          max_tokens: 20,
          stop: ['\n']
        }
      }, { 
        timeout: 8000,
        headers: { 'Connection': 'close' }
      });

      const result = response.data.response?.trim() || '';
      return result.includes('interested') || result.includes(':');
    } catch (error) {
      return false;
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    // Always have rule-based as fallback
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

      const prompt = this.buildClassificationPrompt(email);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.2, // Slightly higher for more nuanced responses
          top_p: 0.9,
          max_tokens: 30,
          stop: ['\n', 'Email:', 'Response:', 'Classification:']
        }
      }, { 
        timeout: this.requestTimeout,
        signal: controller.signal,
        headers: { 'Connection': 'close' }
      });

      clearTimeout(timeoutId);
      
      const parsed = this.parseClassificationResponse(response.data.response);
      
      // Validate the LLM response quality
      if (parsed && this.validateClassification(parsed, email)) {
        return parsed;
      } else {
        logger.debug('LLM classification validation failed, using rule-based fallback');
        return fallbackResult;
      }
      
    } catch (error: any) {
      logger.debug('LLM classification failed:', error.message);
      return fallbackResult;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  private buildClassificationPrompt(email: any): string {
    const subject = email.subject?.substring(0, 100) || '';
    const body = email.textBody?.substring(0, 300) || '';
    const from = email.from?.address || '';
    
    return `You are an expert email classifier for sales teams. Classify this email into one of these categories:

Categories:
- interested: Shows buying intent, wants demos, pricing, ready to purchase
- meeting_booked: Confirms meetings, calendar invites, scheduled calls
- not_interested: Rejections, unsubscribe requests, "not a fit"
- spam: Promotional content, suspicious offers, irrelevant marketing
- out_of_office: Auto-replies, vacation messages, unavailable responses

Email to classify:
From: ${from}
Subject: ${subject}
Content: ${body}

Respond with exactly: category:confidence_score (e.g., interested:0.85)`;
  }

  private parseClassificationResponse(response: string): { category: string; confidence: number } | null {
    try {
      const cleaned = response.trim().toLowerCase();
      
      // Try to find pattern: category:confidence
      const match = cleaned.match(/(\w+):([0-9.]+)/);
      
      if (match) {
        const category = match[1];
        let confidence = parseFloat(match[2]);
        
        // Normalize confidence score
        if (confidence > 1) confidence = confidence / 100;
        confidence = Math.min(Math.max(confidence, 0), 1);
        
        const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
        if (validCategories.includes(category)) {
          return { category, confidence };
        }
      }
      
      // Try to find category names in response
      const validCategories = ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'];
      for (const cat of validCategories) {
        const searchTerms = [cat, cat.replace('_', ' '), cat.replace('_', '')];
        for (const term of searchTerms) {
          if (cleaned.includes(term)) {
            return { category: cat, confidence: 0.7 };
          }
        }
      }
      
    } catch (error) {
      logger.debug('Failed to parse LLM classification response:', error);
    }
    
    return null;
  }

  private validateClassification(result: { category: string; confidence: number }, email: any): boolean {
    // Basic validation to ensure classification makes sense
    const text = `${email.subject || ''} ${email.textBody || ''}`.toLowerCase();
    
    // Check for obvious misclassifications
    if (result.category === 'out_of_office' && !text.includes('office') && !text.includes('vacation') && !text.includes('away')) {
      if (text.includes('interested') || text.includes('demo') || text.includes('meeting')) {
        return false; // Likely misclassified
      }
    }
    
    if (result.category === 'spam' && text.includes('meeting') && text.includes('schedule')) {
      return false; // Likely not spam if discussing meetings
    }
    
    if (result.category === 'interested' && text.includes('unsubscribe')) {
      return false; // Contradictory signals
    }
    
    // Confidence should be reasonable
    if (result.confidence < 0.1 || result.confidence > 1) {
      return false;
    }
    
    return true;
  }

  private ruleBasedClassify(email: any): { category: string; confidence: number } {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.textBody || '').toLowerCase();
    const text = `${subject} ${body}`;

    // High confidence patterns with better scoring
    if (text.includes('out of office') || text.includes('vacation') || text.includes('auto-reply') || text.includes('away message')) {
      return { category: 'out_of_office', confidence: 0.95 };
    }
    
    if (text.includes('meeting confirmed') || text.includes('calendar invite') || text.includes('zoom meeting') || text.includes('teams meeting')) {
      return { category: 'meeting_booked', confidence: 0.9 };
    }
    
    if (text.includes('unsubscribe') || text.includes('not interested') || text.includes('remove me') || text.includes('stop emailing')) {
      return { category: 'not_interested', confidence: 0.85 };
    }
    
    // Enhanced spam detection
    const spamPatterns = [
      'winner', 'congratulations', 'claim now', 'limited time', 'act now', 
      'free money', 'click here', 'urgent', 'special offer', '99% off',
      'buy now', 'discount', 'save money', 'loan approved'
    ];
    const spamCount = spamPatterns.filter(pattern => text.includes(pattern)).length;
    if (spamCount >= 2) {
      return { category: 'spam', confidence: 0.9 };
    }
    
    // Enhanced interest detection
    const interestPatterns = [
      'interested in', 'schedule demo', 'pricing information', 'want to learn',
      'budget approved', 'ready to purchase', 'ready to buy', 'next steps',
      'proposal', 'contract', 'agreement', 'purchase', 'solution'
    ];
    const interestCount = interestPatterns.filter(pattern => text.includes(pattern)).length;
    if (interestCount >= 1) {
      return { category: 'interested', confidence: 0.8 + (interestCount * 0.05) };
    }
    
    // Medium confidence patterns
    if (text.includes('demo') || text.includes('pricing') || text.includes('quote') || text.includes('proposal')) {
      return { category: 'interested', confidence: 0.75 };
    }
    
    if (text.includes('meeting') || text.includes('call') || text.includes('schedule')) {
      return { category: 'interested', confidence: 0.7 };
    }

    // Default classification with contextual scoring
    if (subject.includes('re:') || subject.includes('fw:')) {
      return { category: 'interested', confidence: 0.5 }; // Reply chain suggests engagement
    }
    
    return { category: 'interested', confidence: 0.3 };
  }

  async generateReply(email: any, category: string, customPrompt?: string): Promise<string> {
    // Use LLM for reply generation if available
    if (this.isInitialized && this.requestQueue.size < this.maxRequests) {
      try {
        return await this.generateLLMReply(email, category, customPrompt);
      } catch (error) {
        logger.debug('LLM reply generation failed, using template fallback:', error);
      }
    }
    
    // Fallback to enhanced templates
    return this.generateEnhancedTemplateReply(email, category, customPrompt);
  }

  private async generateLLMReply(email: any, category: string, customPrompt?: string): Promise<string> {
    const requestId = Date.now().toString();
    this.requestQueue.add(requestId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const prompt = this.buildReplyPrompt(email, category, customPrompt);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.3, // Balanced creativity and consistency
          top_p: 0.9,
          max_tokens: 300, // Longer responses for better quality
          stop: ['Email:', 'Prompt:', 'Response:', '\n\n\n']
        }
      }, { 
        timeout: this.requestTimeout,
        signal: controller.signal,
        headers: { 'Connection': 'close' }
      });

      clearTimeout(timeoutId);
      
      const generatedReply = response.data.response?.trim() || '';
      
      // Validate reply quality
      if (this.validateReply(generatedReply, email)) {
        return this.enhanceReply(generatedReply, email);
      } else {
        throw new Error('Generated reply failed validation');
      }
      
    } catch (error: any) {
      logger.debug('LLM reply generation failed:', error.message);
      throw error;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  private buildReplyPrompt(email: any, category: string, customPrompt?: string): string {
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';
    const subject = email.subject || 'your message';
    const content = email.textBody?.substring(0, 400) || '';
    
    if (customPrompt) {
      return `You are a professional email assistant. Write a reply to this email based on the specific request.

Email from: ${senderName}
Subject: ${subject}
Content: ${content}

Specific request: ${customPrompt}

Write a professional, personalized email reply that addresses their request. Be concise but warm. Start with "Hi ${senderName}," and sign off appropriately.

Reply:`;
    }

    const categoryContext = {
      interested: 'The sender shows buying interest. Be enthusiastic and helpful.',
      meeting_booked: 'The sender has booked a meeting. Be professional and confirming.',
      not_interested: 'The sender declined. Be gracious and leave the door open.',
      spam: 'This appears to be spam. Send a brief, polite response.',
      out_of_office: 'This is an auto-reply. Acknowledge and mention future follow-up.'
    };

    return `You are a professional sales representative. Write a personalized email reply.

Email from: ${senderName}
Subject: ${subject}  
Content: ${content}

Context: ${categoryContext[category as keyof typeof categoryContext] || 'Respond professionally.'}

Write a professional, warm, and personalized reply. Be specific to their message, not generic. Start with "Hi ${senderName}," and include a proper sign-off.

Reply:`;
  }

  private validateReply(reply: string, email: any): boolean {
    // Basic quality checks
    if (!reply || reply.length < 20) return false;
    if (reply.length > 1000) return false; // Too long
    
    // Should contain greeting
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || '';
    if (senderName && !reply.toLowerCase().includes(senderName.toLowerCase().split(' ')[0])) {
      return false; // Should mention their name
    }
    
    // Should not be generic spam
    const genericPhrases = ['dear sir/madam', 'to whom it may concern', 'click here now'];
    if (genericPhrases.some(phrase => reply.toLowerCase().includes(phrase))) {
      return false;
    }
    
    return true;
  }

  private enhanceReply(reply: string, email: any): string {
    // Clean up the reply
    let enhanced = reply.trim();
    
    // Ensure proper greeting if missing
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';
    if (!enhanced.toLowerCase().startsWith('hi ') && !enhanced.toLowerCase().startsWith('hello ')) {
      enhanced = `Hi ${senderName},\n\n${enhanced}`;
    }
    
    // Ensure proper sign-off if missing
    const signOffs = ['best regards', 'best', 'sincerely', 'thank you', 'thanks'];
    const hasSignOff = signOffs.some(signOff => enhanced.toLowerCase().includes(signOff));
    
    if (!hasSignOff) {
      enhanced += '\n\nBest regards';
    }
    
    return enhanced;
  }

  private generateEnhancedTemplateReply(email: any, category: string, customPrompt?: string): string {
    const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'there';
    const subject = email.subject || '';
    const body = email.textBody || '';
    
    if (customPrompt) {
      return this.generateCustomTemplateReply(senderName, customPrompt, { subject, body });
    }
    
    const contextualTemplates = {
      interested: this.getInterestedTemplate(senderName, subject, body),
      meeting_booked: this.getMeetingTemplate(senderName, subject, body),
      not_interested: this.getDeclineTemplate(senderName, subject, body),
      spam: this.getSpamTemplate(senderName),
      out_of_office: this.getOutOfOfficeTemplate(senderName, subject)
    };
    
    return contextualTemplates[category as keyof typeof contextualTemplates] || contextualTemplates.interested;
  }

  private getInterestedTemplate(name: string, subject: string, body: string): string {
    const hasDemo = body.toLowerCase().includes('demo');
    const hasPricing = body.toLowerCase().includes('pricing') || body.toLowerCase().includes('price');
    const hasMeeting = body.toLowerCase().includes('meeting') || body.toLowerCase().includes('call');
    
    if (hasPricing) {
      return `Hi ${name},

Thank you for your interest in our solution! I'd be happy to provide you with detailed pricing information.

To ensure I give you the most accurate quote, could you please share:
• Your team size or number of users
• Your specific requirements or use case
• Your preferred timeline for implementation

I'll prepare a customized proposal based on your needs.

Best regards`;
    }
    
    if (hasDemo) {
      return `Hi ${name},

Thank you for your interest! I'd love to show you a personalized demo of our solution.

I have availability for a 30-minute demo call:
• Tuesday 2-4 PM EST
• Wednesday 10 AM-12 PM EST  
• Thursday 1-3 PM EST

Which time works best for your schedule? I'll send a calendar invite once you confirm.

Looking forward to showing you what we can do!

Best regards`;
    }
    
    if (hasMeeting) {
      return `Hi ${name},

Thank you for reaching out! I'd be happy to schedule a call to discuss how our solution can help with your needs.

I have some availability this week:
• Wednesday 2-4 PM EST
• Thursday 10 AM-12 PM EST
• Friday 1-3 PM EST

Please let me know what works best for you, and I'll send over a calendar invitation.

Best regards`;
    }
    
    return `Hi ${name},

Thank you for your interest in our solution! Based on what you've shared, I believe we can definitely help.

I'd love to learn more about your specific needs and show you how our platform can address them. Would you be available for a brief 15-minute call this week?

I'm excited about the opportunity to work together!

Best regards`;
  }

  private getMeetingTemplate(name: string, subject: string, body: string): string {
    if (body.toLowerCase().includes('confirmed') || body.toLowerCase().includes('calendar')) {
      return `Hi ${name},

Perfect! I've confirmed our meeting on my calendar as well. 

I'll prepare a customized presentation based on your requirements and send over the meeting agenda beforehand.

Looking forward to our conversation!

Best regards`;
    }
    
    return `Hi ${name},

Thank you for confirming our meeting. I'm looking forward to our discussion.

I'll send over a brief agenda and any relevant materials before our call.

See you then!

Best regards`;
  }

  private getDeclineTemplate(name: string, subject: string, body: string): string {
    return `Hi ${name},

I completely understand, and I appreciate you taking the time to let me know.

If anything changes in the future or if you'd like to explore options down the road, please don't hesitate to reach out.

Wishing you all the best!

Best regards`;
  }

  private getSpamTemplate(name: string): string {
    return `Thank you for your email. I'll review your message and get back to you if it's relevant to our business needs.

Best regards`;
  }

  private getOutOfOfficeTemplate(name: string, subject: string): string {
    return `Hi ${name},

Thank you for the auto-reply. I'll follow up with you once you're back in the office.

Enjoy your time away!

Best regards`;
  }

  private generateCustomTemplateReply(name: string, customPrompt: string, context: any): string {
    const prompt = customPrompt.toLowerCase();
    
    if (prompt.includes('decline') || prompt.includes('not interested')) {
      return `Hi ${name},

Thank you for your email. I understand this isn't the right fit for you at the moment.

I appreciate you taking the time to let me know, and please feel free to reach out if anything changes in the future.

Best regards`;
    }
    
    if (prompt.includes('pricing') || prompt.includes('cost')) {
      return `Hi ${name},

Thank you for your inquiry about pricing. I'd be happy to provide you with detailed pricing information.

To give you the most accurate quote, could you share a bit more about:
• Your specific requirements
• Team size or number of users  
• Timeline for implementation

I'll prepare a customized proposal for you.

Best regards`;
    }
    
    if (prompt.includes('friendly') || prompt.includes('casual')) {
      return `Hi ${name}!

Thanks for reaching out! It's great to hear from you.

I'd love to help with whatever you need. Let me know how I can assist!

Cheers`;
    }
    
    return `Hi ${name},

Thank you for your email. I appreciate you reaching out and I'd be happy to help.

Please let me know if you have any questions or if there's anything specific I can assist you with.

Best regards`;
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
      requestTimeout: this.requestTimeout,
      version: '2.0.0 - Enhanced'
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.requestQueue.clear();
      logger.info('🧹 Enhanced Local LLM Service cleaned up');
    } catch (error) {
      logger.error('Error during LLM cleanup:', error);
    }
  }
}
