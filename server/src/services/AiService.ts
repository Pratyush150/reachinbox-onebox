import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export class AiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  async initialize(): Promise<void> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'your-gemini-api-key-here') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        logger.info('✅ AI Service initialized with Gemini');
      } else {
        logger.warn('⚠️ AI Service initialized with rule-based classification (no Gemini API key)');
      }
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async classifyEmail(email: any): Promise<{ category: string; confidence: number }> {
    try {
      if (this.model) {
        return await this.classifyWithAI(email);
      } else {
        return this.classifyWithRules(email);
      }
    } catch (error) {
      logger.error('Email classification failed:', error);
      return this.classifyWithRules(email);
    }
  }

  private async classifyWithAI(email: any): Promise<{ category: string; confidence: number }> {
    const prompt = `
Classify this email into one of these categories: interested, meeting_booked, not_interested, spam, out_of_office

Email Details:
From: ${email.from.address} (${email.from.name || 'Unknown'})
Subject: ${email.subject}
Body: ${email.textBody.substring(0, 1000)}

Respond with only a JSON object in this format:
{
  "category": "interested|meeting_booked|not_interested|spam|out_of_office",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Categories:
- interested: Shows buying intent, wants demos, positive response, ready to purchase
- meeting_booked: Confirms meeting/call scheduled, calendar invites, appointment confirmations
- not_interested: Rejection, unsubscribe, negative response, not a fit
- spam: Promotional content, irrelevant offers, suspicious content
- out_of_office: Automatic replies, vacation messages, unavailable responses
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const parsed = JSON.parse(text);
      return {
        category: parsed.category,
        confidence: parsed.confidence
      };
    } catch (error) {
      logger.error('AI classification failed, falling back to rules:', error);
      return this.classifyWithRules(email);
    }
  }

  private classifyWithRules(email: any): { category: string; confidence: number } {
    const subject = email.subject.toLowerCase();
    const body = email.textBody.toLowerCase();
    const combined = `${subject} ${body}`;

    // Interested keywords
    const interestedKeywords = [
      'interested', 'purchase', 'buy', 'pricing', 'demo', 'trial',
      'schedule', 'proposal', 'quote', 'order', 'proceed', 'next steps', 
      'ready', 'approve', 'sign up', 'get started', 'implementation', 
      'onboard', 'contract', 'agreement', 'looks good', 'move forward'
    ];

    // Meeting booked keywords
    const meetingBookedKeywords = [
      'meeting confirmed', 'calendar invite', 'scheduled', 'appointment',
      'call booked', 'meeting set', 'see you', 'talk tomorrow', 'meeting at',
      'confirmed for', 'calendar', 'zoom meeting', 'teams meeting',
      'looking forward', 'see you then', 'meeting reminder'
    ];

    // Not interested keywords
    const notInterestedKeywords = [
      'not interested', 'unsubscribe', 'remove', 'stop', 'cancel',
      'reject', 'decline', 'no thank', 'not suitable', 'not right',
      'pass', 'already have', 'budget', 'too expensive', 'not now',
      'maybe later', 'wrong person', 'not a fit'
    ];

    // Spam keywords
    const spamKeywords = [
      'congratulations', 'winner', 'free', 'limited time', 'act now',
      'click here', 'guarantee', 'no cost', 'risk free', 'urgent',
      'special offer', 'discount', 'sale', 'promotion', 'deal expires',
      'million dollars', 'inheritance', 'lottery', 'casino'
    ];

    // Out of office keywords
    const outOfOfficeKeywords = [
      'out of office', 'automatic reply', 'vacation', 'away', 'unavailable',
      'currently out', 'on leave', 'back on', 'return on', 'holiday',
      'traveling', 'limited access', 'auto response', 'temporarily away',
      'will respond when', 'back in the office'
    ];

    // Calculate scores
    let interestedScore = 0;
    let meetingBookedScore = 0;
    let notInterestedScore = 0;
    let spamScore = 0;
    let outOfOfficeScore = 0;

    // Check keywords for each category
    interestedKeywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        interestedScore += keyword.length > 5 ? 2 : 1;
      }
    });

    meetingBookedKeywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        meetingBookedScore += keyword.length > 8 ? 3 : 2;
      }
    });

    notInterestedKeywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        notInterestedScore += keyword.length > 8 ? 3 : 2;
      }
    });

    spamKeywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        spamScore += 2;
      }
    });

    outOfOfficeKeywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        outOfOfficeScore += keyword.length > 10 ? 4 : 3;
      }
    });

    // Determine category and confidence
    const scores = {
      interested: interestedScore,
      meeting_booked: meetingBookedScore,
      not_interested: notInterestedScore,
      spam: spamScore,
      out_of_office: outOfOfficeScore
    };

    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
      return { category: 'interested', confidence: 0.3 };
    }

    // Find category with highest score
    const category = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as string;
    
    let confidence: number;
    switch (category) {
      case 'out_of_office':
      case 'meeting_booked':
        confidence = Math.min(0.95, 0.8 + (maxScore * 0.05));
        break;
      case 'spam':
        confidence = Math.min(0.90, 0.7 + (maxScore * 0.08));
        break;
      case 'not_interested':
        confidence = Math.min(0.95, 0.7 + (maxScore * 0.08));
        break;
      case 'interested':
      default:
        confidence = Math.min(0.95, 0.6 + (maxScore * 0.1));
        break;
    }

    return { category, confidence };
  }

  async generateResponse(email: any, category: string): Promise<string> {
    if (!this.model) {
      return this.generateRuleBasedResponse(email, category);
    }

    const prompt = `
Generate a professional email response for this ${category} email:

Original Email:
From: ${email.from.address}
Subject: ${email.subject}
Body: ${email.textBody.substring(0, 500)}

Generate a brief, professional response (2-3 sentences max) that:
- Acknowledges their email
- ${this.getResponseGuideline(category)}
- Maintains a professional tone

Respond with only the email body text, no subject line.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      logger.error('Response generation failed:', error);
      return this.generateRuleBasedResponse(email, category);
    }
  }

  private getResponseGuideline(category: string): string {
    switch (category) {
      case 'interested':
        return 'Shows enthusiasm and suggests next steps';
      case 'meeting_booked':
        return 'Confirms the meeting and provides any necessary details';
      case 'not_interested':
        return 'Respectfully acknowledges their decision';
      case 'spam':
        return 'Politely declines and requests removal from communications';
      case 'out_of_office':
        return 'Acknowledges their absence and suggests follow-up timing';
      default:
        return 'Provides helpful information and offers assistance';
    }
  }

  private generateRuleBasedResponse(email: any, category: string): string {
    const senderName = email.from.name || email.from.address.split('@')[0];

    switch (category) {
      case 'interested':
        return `Hi ${senderName},\n\nThank you for your interest! I'd be happy to discuss how we can help you. Let me schedule a quick call to understand your needs better.\n\nBest regards`;
      
      case 'meeting_booked':
        return `Hi ${senderName},\n\nThank you for confirming our meeting. I look forward to our discussion and will send you a calendar invite with all the details shortly.\n\nBest regards`;
      
      case 'not_interested':
        return `Hi ${senderName},\n\nThank you for letting me know. I appreciate your time and honesty. If your situation changes in the future, please don't hesitate to reach out.\n\nBest regards`;
      
      case 'spam':
        return `Hi ${senderName},\n\nI believe this email may have been sent in error. Please remove me from your mailing list. Thank you for understanding.\n\nBest regards`;
      
      case 'out_of_office':
        return `Hi ${senderName},\n\nI see you're currently out of office. I'll follow up when you return. Enjoy your time away!\n\nBest regards`;
      
      default:
        return `Hi ${senderName},\n\nThank you for your email. I'd be happy to provide more information. Could you share more details about your specific requirements?\n\nBest regards`;
    }
  }
}
