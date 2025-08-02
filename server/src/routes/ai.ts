import express, { Request, Response } from 'express';
import { Email } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services';
import { analyzeSalesOpportunity } from '../utils/emailUtils';
import Joi from 'joi';

const router = express.Router();

// Validation Schemas
const classifyEmailSchema = Joi.object({
  subject: Joi.string().required(),
  body: Joi.string().required(),
  from: Joi.object({
    address: Joi.string().email().required(),
    name: Joi.string()
  }).required()
});

const generateReplySchema = Joi.object({
  emailId: Joi.string(),
  category: Joi.string().valid('interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'),
  tone: Joi.string().valid('professional', 'friendly', 'enthusiastic', 'brief').default('professional'),
  includeQuestions: Joi.boolean().default(true),
  customPrompt: Joi.string().max(500),
  useLocalLLM: Joi.boolean().default(true), // ENHANCED: Force LLM usage flag
  context: Joi.object({
    subject: Joi.string(),
    body: Joi.string(),
    htmlBody: Joi.string(),
    from: Joi.object({
      address: Joi.string(),
      name: Joi.string()
    })
  })
});

// POST /api/v1/ai/classify - Enhanced classification with better error handling
router.post('/classify', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = classifyEmailSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { subject, body, from } = value;

  const emailData = {
    subject,
    textBody: body,
    from
  };

  const startTime = Date.now();
  
  try {
    const classification = await aiService.classifyEmail(emailData);
    const salesAnalysis = analyzeSalesOpportunity(emailData);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        input: emailData,
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          confidencePercentage: `${Math.round(classification.confidence * 100)}%`,
          model: aiService.getStatus ? aiService.getStatus().modelName : 'rule-based'
        },
        salesAnalysis: {
          purchaseIntent: salesAnalysis.confidence,
          intent: salesAnalysis.intent,
          urgency: salesAnalysis.urgency,
          buyingSignals: salesAnalysis.buyingSignals,
          nextAction: salesAnalysis.nextAction,
          responseStrategy: salesAnalysis.responseStrategy
        },
        insights: {
          sentiment: classification.category === 'interested' ? 'positive' : 
                    classification.category === 'not_interested' ? 'negative' : 'neutral',
          urgency: salesAnalysis.urgency,
          priority: salesAnalysis.confidence > 50 ? 'high' : salesAnalysis.confidence > 25 ? 'medium' : 'low'
        },
        metadata: {
          processingTime: `${processingTime}ms`,
          aiServiceAvailable: aiService.isAvailable ? aiService.isAvailable() : false,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (classificationError: any) {
    // Enhanced error handling with fallback
    console.error('AI Classification error:', classificationError);
    
    const fallbackClassification = { category: 'interested', confidence: 0.3 };
    const salesAnalysis = analyzeSalesOpportunity(emailData);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        input: emailData,
        classification: {
          ...fallbackClassification,
          confidencePercentage: `${Math.round(fallbackClassification.confidence * 100)}%`,
          model: 'rule-based-fallback'
        },
        salesAnalysis,
        insights: {
          sentiment: 'neutral',
          urgency: salesAnalysis.urgency,
          priority: 'medium'
        },
        metadata: {
          processingTime: `${processingTime}ms`,
          aiServiceAvailable: false,
          fallbackUsed: true,
          error: classificationError.message,
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}));

// POST /api/v1/ai/generate-reply - ENHANCED: Better AI reply generation
router.post('/generate-reply', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = generateReplySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { emailId, category, tone, includeQuestions, customPrompt, useLocalLLM, context } = value;

  let emailData;
  let targetCategory = category;
  let salesAnalysis;

  // Get email data
  if (emailId) {
    const email = await Email.findById(emailId);
    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }
    emailData = email;
    targetCategory = email.aiCategory || 'interested';
    salesAnalysis = analyzeSalesOpportunity(email);
  } else if (context) {
    emailData = {
      subject: context.subject,
      textBody: context.body,
      htmlBody: context.htmlBody,
      from: context.from
    };
    targetCategory = category || 'interested';
    salesAnalysis = analyzeSalesOpportunity(emailData);
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Either emailId or context is required' 
    });
    return;
  }

  const startTime = Date.now();
  let generatedReply = '';
  let replyMetadata = {
    method: 'unknown',
    modelUsed: 'none',
    confidence: 0,
    processingTime: 0,
    fallbackUsed: false,
    error: null as string | null
  };

  try {
    // ENHANCED: Always try LLM first if available and requested
    if (useLocalLLM && aiService.isAvailable && aiService.isAvailable()) {
      try {
        generatedReply = await aiService.generateResponse(emailData, targetCategory, customPrompt);
        replyMetadata.method = 'local_llm';
        replyMetadata.modelUsed = 'qwen2:0.5b';
        replyMetadata.confidence = 0.85;
        
        // Validate LLM response quality
        if (!generatedReply || generatedReply.length < 20) {
          throw new Error('LLM response too short or empty');
        }
        
        // Check for generic responses
        const genericPhrases = ['thank you for your email', 'i will get back to you'];
        const isGeneric = genericPhrases.some(phrase => 
          generatedReply.toLowerCase().includes(phrase)
        );
        
        if (isGeneric && !customPrompt) {
          throw new Error('LLM response too generic');
        }
        
      } catch (llmError: any) {
        console.warn('LLM reply generation failed:', llmError.message);
        replyMetadata.error = llmError.message;
        throw llmError; // Re-throw to trigger fallback
      }
    } else {
      throw new Error('LLM not available or not requested');
    }

  } catch (primaryError: any) {
    // ENHANCED: Intelligent fallback system
    try {
      console.log('Using enhanced template fallback for reply generation');
      generatedReply = await generateEnhancedFallbackReply(emailData, targetCategory, tone, salesAnalysis, customPrompt);
      replyMetadata.method = 'enhanced_template';
      replyMetadata.modelUsed = 'rule_based';
      replyMetadata.confidence = 0.7;
      replyMetadata.fallbackUsed = true;
      replyMetadata.error = primaryError.message;
      
    } catch (fallbackError: any) {
      // Last resort fallback
      generatedReply = generateBasicFallbackReply(emailData, targetCategory, tone);
      replyMetadata.method = 'basic_template';
      replyMetadata.modelUsed = 'static';
      replyMetadata.confidence = 0.5;
      replyMetadata.fallbackUsed = true;
      replyMetadata.error = `Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`;
    }
  }

  const processingTime = Date.now() - startTime;
  replyMetadata.processingTime = processingTime;

  // ENHANCED: Generate multiple reply options
  const replyOptions = await generateReplyOptions(emailData, targetCategory, generatedReply, customPrompt);

  res.json({
    success: true,
    data: {
      originalEmail: emailId ? {
        id: emailId,
        subject: emailData.subject,
        from: emailData.from
      } : context,
      generatedReply,
      replyOptions,
      salesAnalysis: {
        confidence: salesAnalysis.confidence,
        intent: salesAnalysis.intent,
        urgency: salesAnalysis.urgency,
        buyingSignals: salesAnalysis.buyingSignals,
        nextAction: salesAnalysis.nextAction,
        strategy: salesAnalysis.responseStrategy
      },
      metadata: {
        ...replyMetadata,
        customPrompt: customPrompt || null,
        tone,
        category: targetCategory,
        timestamp: new Date().toISOString(),
        aiServiceStatus: aiService.getStatus ? aiService.getStatus() : null
      }
    }
  });
}));

// ENHANCED: Generate multiple reply options for better UX
async function generateReplyOptions(emailData: any, category: string, primaryReply: string, customPrompt?: string) {
  const options = [
    {
      id: 1,
      type: customPrompt ? 'custom_prompt' : 'ai_primary',
      title: customPrompt ? 'Custom AI Reply' : 'AI Smart Reply',
      content: primaryReply,
      recommended: true,
      tone: 'professional',
      length: primaryReply.length
    }
  ];

  // Add alternative tones if no custom prompt
  if (!customPrompt && category === 'interested') {
    try {
      // Generate a more enthusiastic version
      const enthusiasticReply = await generateAlternativeReply(emailData, 'enthusiastic');
      options.push({
        id: 2,
        type: 'alternative_tone',
        title: 'Enthusiastic Reply',
        content: enthusiasticReply,
        recommended: false,
        tone: 'enthusiastic',
        length: enthusiasticReply.length
      });

      // Generate a brief version
      const briefReply = await generateAlternativeReply(emailData, 'brief');
      options.push({
        id: 3,
        type: 'alternative_tone',
        title: 'Brief Reply',
        content: briefReply,
        recommended: false,
        tone: 'brief',
        length: briefReply.length
      });
    } catch (error) {
      // If alternatives fail, just return primary option
      console.debug('Failed to generate alternative replies:', error);
    }
  }

  return options;
}

// ENHANCED: Alternative reply generator
async function generateAlternativeReply(emailData: any, tone: string): Promise<string> {
  const name = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  
  if (tone === 'enthusiastic') {
    return `Hi ${name}!

This is so exciting! Thank you for reaching out about our solution.

I'm absolutely thrilled to help you explore how we can transform your business. Our platform has helped companies just like yours achieve incredible results!

I'd love to schedule a personalized demo to show you exactly what we can do. When would be the best time for you?

Can't wait to connect!

Best regards`;
  }
  
  if (tone === 'brief') {
    return `Hi ${name},

Thanks for your interest! Happy to help.

Available for a quick call this week to discuss your needs.

Best regards`;
  }
  
  return `Hi ${name},

Thank you for your email. I'd be happy to help with your inquiry.

Best regards`;
}

// ENHANCED: Intelligent fallback reply generation
async function generateEnhancedFallbackReply(
  emailData: any, 
  category: string, 
  tone: string, 
  salesAnalysis: any, 
  customPrompt?: string
): Promise<string> {
  const name = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  const subject = emailData.subject || '';
  const body = emailData.textBody || '';
  
  // Custom prompt handling
  if (customPrompt) {
    return handleCustomPromptFallback(name, customPrompt, { subject, body }, salesAnalysis);
  }
  
  // Context-aware template selection
  const contextualTemplate = selectContextualTemplate(emailData, category, tone, salesAnalysis);
  return contextualTemplate.replace('{name}', name);
}

function handleCustomPromptFallback(name: string, customPrompt: string, context: any, salesAnalysis: any): string {
  const prompt = customPrompt.toLowerCase();
  
  if (prompt.includes('decline') || prompt.includes('not interested') || prompt.includes('politely decline')) {
    return `Hi ${name},

Thank you for your email. After careful consideration, this isn't the right fit for us at the moment.

I appreciate you taking the time to reach out, and please feel free to contact us again if our needs change in the future.

Best regards`;
  }
  
  if (prompt.includes('pricing') || prompt.includes('cost') || prompt.includes('quote')) {
    return `Hi ${name},

Thank you for your inquiry about pricing. I'd be happy to provide you with detailed pricing information tailored to your needs.

To ensure I give you the most accurate quote, could you please share:
• Your team size or number of users
• Your specific requirements
• Your preferred timeline for implementation

I'll prepare a customized proposal and send it over within 24 hours.

Best regards`;
  }
  
  if (prompt.includes('demo') || prompt.includes('meeting') || prompt.includes('call')) {
    return `Hi ${name},

Thank you for your interest! I'd love to schedule a personalized demo to show you exactly how our solution can help.

I have availability for a 30-minute demo:
• Tuesday 2-4 PM EST
• Wednesday 10 AM-12 PM EST  
• Thursday 1-3 PM EST

Which time works best for your schedule? I'll send a calendar invite once you confirm.

Looking forward to showing you what we can do!

Best regards`;
  }
  
  if (prompt.includes('follow up') || prompt.includes('check in')) {
    return `Hi ${name},

I wanted to follow up on our previous conversation and see if you had any questions about our solution.

Based on what you shared, I think we could really help you achieve your goals. Would you like to schedule a brief call to discuss the next steps?

Best regards`;
  }
  
  if (prompt.includes('friendly') || prompt.includes('casual')) {
    return `Hi ${name}!

Thanks for reaching out! It's great to hear from you.

I'd love to help with whatever you need. Let me know how I can assist!

Cheers`;
  }
  
  // Default custom prompt response
  return `Hi ${name},

Thank you for your email. I've reviewed your message and I'd be happy to help.

${salesAnalysis.confidence > 50 ? 'Based on what you\'ve shared, I believe our solution could be a great fit for your needs.' : 'I\'d love to learn more about your requirements and see how we can help.'}

Please let me know if you have any questions or if you'd like to schedule a brief call to discuss further.

Best regards`;
}

function selectContextualTemplate(emailData: any, category: string, tone: string, salesAnalysis: any): string {
  const name = '{name}';
  const hasUrgency = salesAnalysis.urgency === 'high';
  const highConfidence = salesAnalysis.confidence > 60;
  
  const templates = {
    interested: {
      professional: highConfidence 
        ? `Hi ${name},

Thank you for your interest in our solution! Based on your message, I can see this could be a perfect fit for your needs.

I'd love to schedule a personalized demo to show you exactly how we can help you achieve your goals. Our solution has helped similar companies increase efficiency by up to 40%.

When would be the best time for a 20-minute call this week?

Best regards`
        : `Hi ${name},

Thank you for reaching out about our solution! I'd be happy to learn more about your specific needs and show you how our platform can help.

Would you be available for a brief 15-minute call this week to discuss your requirements?

Best regards`,
      
      friendly: `Hi ${name}!

Thanks for reaching out! I'm excited to help you explore our solution.

I'd love to chat about your needs and show you some really cool features that I think you'll find valuable.

When works best for a quick call?

Looking forward to connecting!

Best`,
      
      brief: `Hi ${name},

Thanks for your interest. Happy to help.

Available for a quick call this week?

Best regards`
    },
    
    meeting_booked: {
      professional: `Hi ${name},

Perfect! I've confirmed our meeting on my calendar and I'm looking forward to our discussion.

I'll prepare a customized presentation based on your requirements and send over the agenda beforehand.

See you then!

Best regards`,
      
      friendly: `Hi ${name}!

Awesome! Really looking forward to our chat.

I'll prep some great stuff to show you that I think you'll love.

Talk soon!

Best`,
      
      brief: `Hi ${name},

Meeting confirmed. Looking forward to it.

Best regards`
    },
    
    not_interested: {
      professional: `Hi ${name},

I completely understand, and I appreciate you taking the time to let me know.

If anything changes in the future or if you'd like to explore options down the road, please don't hesitate to reach out.

Wishing you all the best with your current solution!

Best regards`,
      
      friendly: `Hi ${name},

No worries at all! Thanks for being upfront with me.

If things change down the road, feel free to reach out anytime.

Best of luck!

Best`,
      
      brief: `Hi ${name},

Understood. Thanks for letting me know.

Best regards`
    }
  };
  
  const categoryTemplates = templates[category as keyof typeof templates];
  if (categoryTemplates) {
    return categoryTemplates[tone as keyof typeof categoryTemplates] || categoryTemplates.professional;
  }
  
  return templates.interested.professional;
}

function generateBasicFallbackReply(emailData: any, category: string, tone: string): string {
  const name = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  
  return `Hi ${name},

Thank you for your email. I appreciate you reaching out.

I'll review your message and get back to you with more information shortly.

Best regards`;
}

// GET /api/v1/ai/sales-insights/:emailId - Enhanced sales insights
router.get('/sales-insights/:emailId', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.emailId);
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  const salesAnalysis = analyzeSalesOpportunity(email);
  
  // Enhanced insights with more context
  const insights = {
    ...salesAnalysis,
    emailMetrics: {
      responseTime: email.receivedDate ? `${Math.round((Date.now() - new Date(email.receivedDate).getTime()) / (1000 * 60 * 60))} hours ago` : 'Unknown',
      domain: email.from?.address?.split('@')[1] || 'Unknown',
      isFirstContact: true,
      threadLength: 1,
      hasAttachments: email.attachments && email.attachments.length > 0,
      wordCount: email.textBody ? email.textBody.split(' ').length : 0
    },
    recommendations: {
      responseUrgency: salesAnalysis.urgency,
      suggestedFollowUp: salesAnalysis.confidence > 30 ? '1-2 days' : '1 week',
      keyTalkingPoints: salesAnalysis.buyingSignals.length > 0 ? salesAnalysis.buyingSignals : ['Product benefits', 'ROI', 'Implementation'],
      riskFactors: salesAnalysis.confidence < 20 ? ['Low engagement', 'Needs nurturing'] : [],
      estimatedDealValue: calculateEstimatedValue(salesAnalysis, email),
      conversionProbability: calculateConversionProbability(salesAnalysis, email)
    },
    aiInsights: {
      category: email.aiCategory,
      confidence: email.aiConfidence,
      modelUsed: 'qwen2:0.5b',
      processedAt: email.updatedAt
    }
  };

  res.json({
    success: true,
    data: insights
  });
}));

function calculateEstimatedValue(salesAnalysis: any, email: any): number {
  const baseValue = 5000; // Base deal value
  let multiplier = 1;
  
  if (salesAnalysis.confidence > 70) multiplier = 2;
  else if (salesAnalysis.confidence > 40) multiplier = 1.5;
  
  if (salesAnalysis.urgency === 'high') multiplier *= 1.3;
  if (email.aiCategory === 'meeting_booked') multiplier *= 1.5;
  
  return Math.round(baseValue * multiplier);
}

function calculateConversionProbability(salesAnalysis: any, email: any): number {
  let probability = salesAnalysis.confidence;
  
  if (email.aiCategory === 'meeting_booked') probability = Math.min(probability + 30, 95);
  if (email.aiCategory === 'interested') probability = Math.min(probability + 10, 90);
  if (salesAnalysis.urgency === 'high') probability = Math.min(probability + 15, 95);
  
  return Math.round(probability);
}

// GET /api/v1/ai/categories - Enhanced categories with more details
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = [
    {
      id: 'interested',
      name: 'Interested',
      description: 'Shows buying intent, wants demos, positive response, ready to purchase',
      color: 'emerald',
      priority: 'high',
      examples: ['interested in pricing', 'schedule a demo', 'ready to buy', 'budget approved'],
      salesValue: 'High - Direct sales opportunity',
      avgDealValue: 5000,
      conversionRate: '25%',
      responseTime: 'Within 2 hours'
    },
    {
      id: 'meeting_booked',
      name: 'Meeting Booked',
      description: 'Confirms meeting/call scheduled, calendar invites, appointment confirmations',
      color: 'blue',
      priority: 'urgent',
      examples: ['meeting confirmed', 'see you tomorrow', 'calendar invite accepted'],
      salesValue: 'Very High - Active prospect',
      avgDealValue: 8000,
      conversionRate: '45%',
      responseTime: 'Within 1 hour'
    },
    {
      id: 'not_interested',
      name: 'Not Interested',
      description: 'Rejection, unsubscribe, negative response, not a fit',
      color: 'red',
      priority: 'low',
      examples: ['not interested', 'unsubscribe', 'not a fit', 'too expensive'],
      salesValue: 'Low - Future nurturing opportunity',
      avgDealValue: 0,
      conversionRate: '2%',
      responseTime: 'Within 24 hours'
    },
    {
      id: 'spam',
      name: 'Spam',
      description: 'Promotional content, irrelevant offers, suspicious content',
      color: 'orange',
      priority: 'low',
      examples: ['limited time offer', 'click here now', 'congratulations winner'],
      salesValue: 'None - Filter out',
      avgDealValue: 0,
      conversionRate: '0%',
      responseTime: 'No response needed'
    },
    {
      id: 'out_of_office',
      name: 'Out of Office',
      description: 'Automatic replies, vacation messages, unavailable responses',
      color: 'purple',
      priority: 'normal',
      examples: ['out of office', 'vacation reply', 'will respond when back'],
      salesValue: 'Medium - Follow up later',
      avgDealValue: 3000,
      conversionRate: '15%',
      responseTime: 'After return date'
    }
  ];

  // Get current statistics for each category
  const categoryStats = await Email.aggregate([
    { $match: { folder: { $ne: 'deleted' } } },
    {
      $group: {
        _id: '$aiCategory',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiConfidence' },
        latestEmail: { $max: '$receivedDate' },
        totalValue: { $sum: { $multiply: ['$aiConfidence', 5000] } } // Estimated value
      }
    }
  ]);

  // Merge categories with enhanced stats
  const categoriesWithStats = categories.map(category => {
    const stats = categoryStats.find(stat => stat._id === category.id);
    return {
      ...category,
      stats: {
        count: stats?.count || 0,
        avgConfidence: stats?.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}%` : '0%',
        latestEmail: stats?.latestEmail || null,
        estimatedPipelineValue: Math.round(stats?.totalValue || 0),
        trend: Math.random() > 0.5 ? 'up' : 'down', // In real app, calculate from historical data
        weeklyGrowth: `${Math.round((Math.random() - 0.5) * 40)}%`
      }
    };
  });

  res.json({
    success: true,
    data: {
      categories: categoriesWithStats,
      totalCategories: categories.length,
      aiModel: 'Enhanced Qwen2:0.5B + Rule-based fallback',
      lastUpdated: new Date().toISOString(),
      systemStatus: {
        aiServiceAvailable: aiService.isAvailable ? aiService.isAvailable() : false,
        modelStatus: aiService.getStatus ? aiService.getStatus() : null
      }
    }
  });
}));

// POST /api/v1/ai/batch-classify - Enhanced batch processing
router.post('/batch-classify', asyncHandler(async (req: Request, res: Response) => {
  const { emailIds, forceReclassify = false } = req.body;

  if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
    res.status(400).json({
      success: false,
      error: 'emailIds array is required'
    });
    return;
  }

  const emails = await Email.find({ 
    _id: { $in: emailIds },
    folder: { $ne: 'deleted' }
  });

  if (emails.length === 0) {
    res.status(404).json({ 
      success: false, 
      error: 'No emails found' 
    });
    return;
  }

  const results = [];
  const startTime = Date.now();
  let aiSuccessCount = 0;
  let fallbackCount = 0;

  for (const email of emails) {
    try {
      // Skip if already processed unless force reclassify
      if (email.aiProcessed && !forceReclassify) {
        results.push({
          emailId: email._id,
          success: true,
          skipped: true,
          currentCategory: email.aiCategory,
          confidence: email.aiConfidence
        });
        continue;
      }

      const classification = await aiService.classifyEmail(email);
      const salesAnalysis = analyzeSalesOpportunity(email);
      
      // Determine if AI or fallback was used
      const wasAiUsed = aiService.isAvailable && aiService.isAvailable();
      if (wasAiUsed) aiSuccessCount++; else fallbackCount++;
      
      // Update email with new classification
      const previousCategory = email.aiCategory;
      email.aiCategory = classification.category as 'interested' | 'meeting_booked' | 'not_interested' | 'spam' | 'out_of_office';
      email.aiConfidence = classification.confidence;
      email.aiProcessed = true;
      email.actions.push({
        type: 'ai_classify',
        timestamp: new Date(),
        metadata: { 
          previousCategory,
          newCategory: classification.category,
          confidence: classification.confidence,
          salesConfidence: salesAnalysis.confidence,
          method: wasAiUsed ? 'local_llm' : 'rule_based'
        }
      });
      
      await email.save();

      results.push({
        emailId: email._id,
        success: true,
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          confidencePercentage: `${Math.round(classification.confidence * 100)}%`,
          method: wasAiUsed ? 'AI' : 'Rule-based'
        },
        salesAnalysis: {
          confidence: salesAnalysis.confidence,
          intent: salesAnalysis.intent,
          urgency: salesAnalysis.urgency,
          estimatedValue: calculateEstimatedValue(salesAnalysis, email)
        },
        subject: email.subject.substring(0, 50) + '...',
        changes: previousCategory !== classification.category ? {
          from: previousCategory,
          to: classification.category
        } : null
      });

    } catch (error: any) {
      results.push({
        emailId: email._id,
        success: false,
        error: error.message
      });
    }
  }

  const processingTime = Date.now() - startTime;
  const successCount = results.filter(r => r.success && !r.skipped).length;
  const skippedCount = results.filter(r => r.skipped).length;

  res.json({
    success: true,
    message: `Batch classification completed: ${successCount} classified, ${skippedCount} skipped`,
    data: {
      results,
      summary: {
        total: emailIds.length,
        processed: successCount,
        skipped: skippedCount,
        errors: results.filter(r => !r.success).length,
        aiSuccessCount,
        fallbackCount,
        processingTime: `${processingTime}ms`,
        avgTimePerEmail: `${Math.round(processingTime / emailIds.length)}ms`
      },
      performance: {
        aiServiceAvailable: aiService.isAvailable ? aiService.isAvailable() : false,
        aiSuccessRate: `${Math.round((aiSuccessCount / Math.max(successCount, 1)) * 100)}%`,
        totalPipelineValue: results.reduce((sum, r) => sum + (r.salesAnalysis?.estimatedValue || 0), 0)
      }
    }
  });
}));

// GET /api/v1/ai/insights/summary - Enhanced insights with trends
router.get('/insights/summary', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, days = 7 } = req.query;

  const filter: any = { 
    folder: { $ne: 'deleted' },
    aiProcessed: true,
    receivedDate: { 
      $gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) 
    }
  };
  
  if (accountId) filter.accountId = accountId;

  const insights = await Email.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$aiCategory',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiConfidence' },
        highConfidenceCount: {
          $sum: { $cond: [{ $gte: ['$aiConfidence', 0.8] }, 1, 0] }
        },
        totalValue: { $sum: { $multiply: ['$aiConfidence', 5000] } },
        recentEmails: {
          $push: {
            $cond: [
              { $gte: ['$receivedDate', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              {
                id: '$_id',
                subject: '$subject',
                from: '$from.address',
                confidence: '$aiConfidence',
                receivedDate: '$receivedDate'
              },
              '$$REMOVE'
            ]
          }
        }
      }
    },
    {
      $addFields: {
        accuracyRate: {
          $multiply: [
            { $divide: ['$highConfidenceCount', '$count'] },
            100
          ]
        },
        avgDealValue: { $divide: ['$totalValue', '$count'] }
      }
    }
  ]);

  const totalEmails = await Email.countDocuments(filter);
  const processedEmails = insights.reduce((sum, cat) => sum + cat.count, 0);

  // Generate enhanced recommendations
  const recommendations = generateEnhancedSalesRecommendations(insights);

  res.json({
    success: true,
    data: {
      summary: {
        totalEmails,
        processedEmails,
        processingRate: totalEmails > 0 ? `${Math.round((processedEmails / totalEmails) * 100)}%` : '0%',
        timeRange: `${days} days`,
        aiServiceStatus: aiService.isAvailable ? aiService.isAvailable() : false
      },
      categories: insights.map(insight => ({
        category: insight._id,
        count: insight.count,
        percentage: totalEmails > 0 ? `${Math.round((insight.count / totalEmails) * 100)}%` : '0%',
        avgConfidence: `${Math.round((insight.avgConfidence || 0) * 100)}%`,
        accuracyRate: `${Math.round(insight.accuracyRate || 0)}%`,
        avgDealValue: Math.round(insight.avgDealValue || 0),
        totalPipelineValue: Math.round(insight.totalValue || 0),
        recentEmails: insight.recentEmails.slice(0, 3),
        salesValue: getSalesValue(insight._id, insight.count),
        trend: generateTrendData(insight._id, Number(days))
      })),
      salesMetrics: {
        hotLeads: insights.find(i => i._id === 'interested')?.count || 0,
        scheduledMeetings: insights.find(i => i._id === 'meeting_booked')?.count || 0,
        conversionRate: calculateConversionRate(insights),
        pipelineValue: calculatePipelineValue(insights),
        estimatedRevenue: Math.round(calculatePipelineValue(insights).replace(/[^0-9]/g, '') * 0.25),
        avgDealSize: Math.round(insights.reduce((sum, i) => sum + (i.avgDealValue || 0), 0) / Math.max(insights.length, 1))
      },
      recommendations,
      trends: generateWeeklyTrends(insights, Number(days)),
      lastUpdated: new Date()
    }
  });
}));

// Enhanced helper functions
function generateEnhancedSalesRecommendations(insights: any[]) {
  const recommendations = [];
  
  const interestedCategory = insights.find(i => i._id === 'interested');
  const meetingCategory = insights.find(i => i._id === 'meeting_booked');
  const notInterestedCategory = insights.find(i => i._id === 'not_interested');

  if (interestedCategory && interestedCategory.count > 5) {
    recommendations.push({
      type: 'action',
      priority: 'high',
      icon: '🎯',
      title: 'Hot Leads Waiting',
      message: `You have ${interestedCategory.count} hot leads waiting for response`,
      action: 'Prioritize follow-ups with interested prospects',
      impact: 'High conversion potential',
      estimatedValue: Math.round(interestedCategory.totalValue || 0),
      timeframe: 'Next 24 hours'
    });
  }

  if (meetingCategory && meetingCategory.count > 0) {
    recommendations.push({
      type: 'urgent',
      priority: 'urgent',
      icon: '📅',
      title: 'Meetings Scheduled',
      message: `${meetingCategory.count} meetings scheduled - prepare materials`,
      action: 'Review prospect backgrounds and prepare personalized demos',
      impact: 'Direct revenue opportunity',
      estimatedValue: Math.round(meetingCategory.totalValue || 0),
      timeframe: 'Before meeting time'
    });
  }

  if (notInterestedCategory && notInterestedCategory.count > 10) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      icon: '📈',
      title: 'High Rejection Rate',
      message: `High rejection rate detected (${notInterestedCategory.count} not interested)`,
      action: 'Review and optimize your outreach messaging',
      impact: 'Improve future response rates',
      estimatedValue: 0,
      timeframe: 'This week'
    });
  }

  return recommendations;
}

function generateTrendData(category: string, days: number) {
  // In a real implementation, this would query historical data
  const trendValue = Math.round((Math.random() - 0.5) * 30);
  return {
    direction: trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'stable',
    percentage: Math.abs(trendValue),
    period: `${days} days`
  };
}

function generateWeeklyTrends(insights: any[], days: number) {
  // Simplified trend generation - in real app, query historical data
  return insights.map(insight => ({
    category: insight._id,
    data: Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      day: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      count: Math.round((insight.count / days) * (0.8 + Math.random() * 0.4))
    })).reverse()
  }));
}

function getSalesValue(category: string, count: number): string {
  switch (category) {
    case 'interested':
      return `High (${count} potential deals worth $${(count * 5000).toLocaleString()})`;
    case 'meeting_booked':
      return `Very High (${count} active prospects worth $${(count * 8000).toLocaleString()})`;
    case 'not_interested':
      return `Low (future nurturing)`;
    case 'out_of_office':
      return `Medium (follow up later - potential $${(count * 3000).toLocaleString()})`;
    default:
      return 'Low';
  }
}

function calculateConversionRate(insights: any[]): string {
  const interested = insights.find(i => i._id === 'interested')?.count || 0;
  const meetings = insights.find(i => i._id === 'meeting_booked')?.count || 0;
  const total = insights.reduce((sum, cat) => sum + cat.count, 0);
  
  if (total === 0) return '0%';
  
  const rate = ((interested + meetings) / total) * 100;
  return `${Math.round(rate)}%`;
}

function calculatePipelineValue(insights: any[]): string {
  const totalValue = insights.reduce((sum, insight) => sum + (insight.totalValue || 0), 0);
  return `$${Math.round(totalValue / 1000)}k`;
}

export default router;
