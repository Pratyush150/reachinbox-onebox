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
  customPrompt: Joi.string().max(500), // NEW: Custom prompt support
  context: Joi.object({
    subject: Joi.string(),
    body: Joi.string(),
    from: Joi.object({
      address: Joi.string(),
      name: Joi.string()
    })
  })
});

// POST /api/v1/ai/classify - Classify email content
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
        confidencePercentage: `${Math.round(classification.confidence * 100)}%`
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
      processingTime: `${processingTime}ms`
    }
  });
}));

// POST /api/v1/ai/generate-reply - ENHANCED: Generate smart AI reply with custom prompts
router.post('/generate-reply', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = generateReplySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { emailId, category, tone, includeQuestions, customPrompt, context } = value;

  let emailData;
  let targetCategory = category;
  let salesAnalysis;

  if (emailId) {
    // Generate reply for existing email
    const email = await Email.findById(emailId);
    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }
    emailData = email;
    targetCategory = email.aiCategory || 'interested';
    salesAnalysis = analyzeSalesOpportunity(email);
  } else if (context) {
    // Generate reply for provided context
    emailData = context;
    targetCategory = category || 'interested';
    salesAnalysis = analyzeSalesOpportunity(context);
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Either emailId or context is required' 
    });
    return;
  }

  const startTime = Date.now();
  
  try {
    let generatedReply = '';

    // ENHANCED: Handle custom prompts
    if (customPrompt) {
      generatedReply = await generateCustomPromptReply(emailData, customPrompt, salesAnalysis);
    } else {
      // Use standard AI generation
      generatedReply = await aiService.generateResponse(emailData, targetCategory);
    }

    // If AI fails, fallback to template
    if (!generatedReply || generatedReply.length < 10) {
      generatedReply = generateFallbackReply(emailData, targetCategory, tone, salesAnalysis);
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        originalEmail: emailId ? {
          id: emailId,
          subject: emailData.subject,
          from: emailData.from
        } : context,
        generatedReply,
        replyOptions: [{
          id: 1,
          type: customPrompt ? 'custom_prompt' : 'ai_generated',
          title: customPrompt ? 'Custom AI Reply' : 'AI Smart Reply',
          content: generatedReply,
          recommended: true
        }],
        salesAnalysis: {
          confidence: salesAnalysis.confidence,
          intent: salesAnalysis.intent,
          urgency: salesAnalysis.urgency,
          buyingSignals: salesAnalysis.buyingSignals,
          nextAction: salesAnalysis.nextAction,
          strategy: salesAnalysis.responseStrategy
        },
        metadata: {
          customPrompt: customPrompt || null,
          tone,
          category: targetCategory,
          processingTime: `${processingTime}ms`
        }
      }
    });
  } catch (error: any) {
    console.error('Reply generation failed:', error);
    
    // Always provide fallback
    const fallbackReply = generateFallbackReply(emailData, targetCategory, tone, salesAnalysis);
    
    res.json({
      success: true,
      data: {
        originalEmail: emailId ? { id: emailId } : context,
        generatedReply: fallbackReply,
        replyOptions: [{
          id: 1,
          type: 'fallback',
          title: 'Standard Reply',
          content: fallbackReply,
          recommended: true
        }],
        salesAnalysis,
        metadata: {
          fallbackUsed: true,
          originalError: error.message
        }
      }
    });
  }
}));

// ENHANCED: Custom prompt reply generation
async function generateCustomPromptReply(emailData: any, customPrompt: string, salesAnalysis: any): Promise<string> {
  const senderName = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  const subject = emailData.subject || 'your message';
  
  // Build context for AI
  const context = `
Email Subject: ${subject}
From: ${senderName}
Content: ${emailData.textBody?.substring(0, 300) || 'No content'}

Sales Context:
- Purchase Intent: ${salesAnalysis.confidence}%
- Urgency: ${salesAnalysis.urgency}
- Buying Signals: ${salesAnalysis.buyingSignals.join(', ') || 'None detected'}

User Request: ${customPrompt}

Generate a professional email reply that addresses the user's specific request while being appropriate for the sales context.
`;

  try {
    // Try AI service first
    const aiReply = await aiService.generateResponse({
      subject: `Custom Reply: ${customPrompt}`,
      textBody: context,
      from: emailData.from
    }, 'interested');

    if (aiReply && aiReply.length > 20) {
      return aiReply;
    }
  } catch (error) {
    console.error('AI custom prompt failed:', error);
  }

  // Fallback to template-based custom reply
  return generateTemplateCustomReply(senderName, customPrompt, salesAnalysis);
}

function generateTemplateCustomReply(senderName: string, customPrompt: string, salesAnalysis: any): string {
  const prompt = customPrompt.toLowerCase();
  
  // Analyze prompt for intent
  let replyType = 'general';
  if (prompt.includes('decline') || prompt.includes('not interested') || prompt.includes('no')) {
    replyType = 'decline';
  } else if (prompt.includes('pricing') || prompt.includes('cost') || prompt.includes('price')) {
    replyType = 'pricing';
  } else if (prompt.includes('demo') || prompt.includes('meeting') || prompt.includes('call')) {
    replyType = 'meeting';
  } else if (prompt.includes('follow up') || prompt.includes('check in')) {
    replyType = 'followup';
  } else if (prompt.includes('friendly') || prompt.includes('casual')) {
    replyType = 'friendly';
  }

  const templates = {
    decline: `Hi ${senderName},\n\nThank you for your interest. While this isn't the right fit for us at the moment, I appreciate you reaching out.\n\nIf anything changes in the future, please don't hesitate to contact us again.\n\nBest regards`,
    
    pricing: `Hi ${senderName},\n\nThank you for your inquiry about pricing. I'd be happy to provide you with detailed pricing information.\n\nTo ensure I give you the most accurate quote, could you share:\n• Your team size\n• Your specific requirements\n• Your preferred timeline\n\nI'll prepare a customized proposal for you.\n\nBest regards`,
    
    meeting: `Hi ${senderName},\n\nThank you for your interest! I'd love to schedule a demo to show you exactly how our solution can help.\n\nI have availability:\n• Tuesday 2-4 PM\n• Wednesday 10 AM-12 PM\n• Thursday 1-3 PM\n\nWhich works best for you?\n\nBest regards`,
    
    followup: `Hi ${senderName},\n\nI wanted to follow up on our previous conversation and see if you had any questions.\n\nBased on what you shared, I think our solution could really help with ${salesAnalysis.buyingSignals[0] || 'your goals'}.\n\nWould you like to schedule a brief call to discuss next steps?\n\nBest regards`,
    
    friendly: `Hi ${senderName}!\n\nThanks for reaching out! It's great to hear from you.\n\n${salesAnalysis.confidence > 50 ? 'I\'m excited about the possibility of working together.' : 'I\'d love to learn more about how we can help.'}\n\nLet me know what questions you have!\n\nCheers`,
    
    general: `Hi ${senderName},\n\nThank you for your email. I appreciate you taking the time to reach out.\n\n${salesAnalysis.confidence > 40 ? 'Based on what you\'ve shared, I believe we can provide significant value.' : 'I\'d be happy to provide more information about our solution.'}\n\nPlease let me know if you have any questions.\n\nBest regards`
  };

  return templates[replyType as keyof typeof templates] || templates.general;
}

function generateFallbackReply(emailData: any, category: string, tone: string, salesAnalysis: any): string {
  const name = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  
  const templates = {
    interested: {
      professional: `Dear ${name},\n\nThank you for your interest in our solution. I'd be happy to schedule a call to discuss how we can help achieve your goals.\n\nBest regards`,
      friendly: `Hi ${name}!\n\nThanks for reaching out! I'd love to chat about how we can help you out.\n\nLooking forward to connecting!\n\nBest`,
      brief: `Hi ${name},\n\nThanks for your interest. Let's schedule a quick call to discuss.\n\nBest regards`
    },
    meeting_booked: {
      professional: `Dear ${name},\n\nThank you for confirming our meeting. I look forward to our discussion and will prepare relevant materials.\n\nBest regards`,
      friendly: `Hi ${name}!\n\nAwesome, looking forward to our chat! I'll prepare some great stuff to show you.\n\nTalk soon!`,
      brief: `Hi ${name},\n\nMeeting confirmed. Looking forward to it.\n\nBest regards`
    },
    not_interested: {
      professional: `Dear ${name},\n\nI understand and appreciate you letting me know. If anything changes in the future, please feel free to reach out.\n\nBest regards`,
      friendly: `Hi ${name},\n\nNo worries at all! Thanks for being upfront. Feel free to reach out if anything changes.\n\nBest`,
      brief: `Hi ${name},\n\nUnderstood. Thanks for letting me know.\n\nBest regards`
    }
  };

  const categoryTemplates = templates[category as keyof typeof templates];
  if (categoryTemplates) {
    return categoryTemplates[tone as keyof typeof categoryTemplates] || categoryTemplates.professional;
  }

  return `Hi ${name},\n\nThank you for your email. I'll get back to you shortly.\n\nBest regards`;
}

// GET /api/v1/ai/sales-insights/:emailId - Get detailed sales insights for an email
router.get('/sales-insights/:emailId', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.emailId);
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  const salesAnalysis = analyzeSalesOpportunity(email);
  
  // Additional insights based on email metadata
  const insights = {
    ...salesAnalysis,
    emailMetrics: {
      responseTime: email.receivedDate ? `${Math.round((Date.now() - new Date(email.receivedDate).getTime()) / (1000 * 60 * 60))} hours ago` : 'Unknown',
      domain: email.from?.address?.split('@')[1] || 'Unknown',
      isFirstContact: true, // Could be calculated by checking email history
      threadLength: 1 // Could be calculated from thread
    },
    recommendations: {
      responseUrgency: salesAnalysis.urgency,
      suggestedFollowUp: salesAnalysis.confidence > 30 ? '1-2 days' : '1 week',
      keyTalkingPoints: salesAnalysis.buyingSignals.length > 0 ? salesAnalysis.buyingSignals : ['Product benefits', 'ROI', 'Implementation'],
      riskFactors: salesAnalysis.confidence < 20 ? ['Low engagement', 'Needs nurturing'] : []
    }
  };

  res.json({
    success: true,
    data: insights
  });
}));

// GET /api/v1/ai/categories - Get AI categories with descriptions
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = [
    {
      id: 'interested',
      name: 'Interested',
      description: 'Shows buying intent, wants demos, positive response, ready to purchase',
      color: 'emerald',
      priority: 'high',
      examples: ['interested in pricing', 'schedule a demo', 'ready to buy'],
      salesValue: 'High - Direct sales opportunity'
    },
    {
      id: 'meeting_booked',
      name: 'Meeting Booked',
      description: 'Confirms meeting/call scheduled, calendar invites, appointment confirmations',
      color: 'blue',
      priority: 'urgent',
      examples: ['meeting confirmed', 'see you tomorrow', 'calendar invite accepted'],
      salesValue: 'Very High - Active prospect'
    },
    {
      id: 'not_interested',
      name: 'Not Interested',
      description: 'Rejection, unsubscribe, negative response, not a fit',
      color: 'red',
      priority: 'low',
      examples: ['not interested', 'unsubscribe', 'not a fit'],
      salesValue: 'Low - Future nurturing opportunity'
    },
    {
      id: 'spam',
      name: 'Spam',
      description: 'Promotional content, irrelevant offers, suspicious content',
      color: 'orange',
      priority: 'low',
      examples: ['limited time offer', 'click here now', 'congratulations winner'],
      salesValue: 'None - Filter out'
    },
    {
      id: 'out_of_office',
      name: 'Out of Office',
      description: 'Automatic replies, vacation messages, unavailable responses',
      color: 'purple',
      priority: 'normal',
      examples: ['out of office', 'vacation reply', 'will respond when back'],
      salesValue: 'Medium - Follow up later'
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
        latestEmail: { $max: '$receivedDate' }
      }
    }
  ]);

  // Merge categories with stats
  const categoriesWithStats = categories.map(category => {
    const stats = categoryStats.find(stat => stat._id === category.id);
    return {
      ...category,
      stats: {
        count: stats?.count || 0,
        avgConfidence: stats?.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}%` : '0%',
        latestEmail: stats?.latestEmail || null
      }
    };
  });

  res.json({
    success: true,
    data: {
      categories: categoriesWithStats,
      totalCategories: categories.length,
      aiModel: 'Enhanced Sales AI + Rule-based fallback'
    }
  });
}));

// POST /api/v1/ai/batch-classify - Batch classify multiple emails
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
      
      // Update email with new classification
      email.aiCategory = classification.category as 'interested' | 'meeting_booked' | 'not_interested' | 'spam' | 'out_of_office';
      email.aiConfidence = classification.confidence;
      email.aiProcessed = true;
      email.actions.push({
        type: 'ai_classify',
        timestamp: new Date(),
        metadata: { 
          previousCategory: email.aiCategory,
          newCategory: classification.category,
          confidence: classification.confidence,
          salesConfidence: salesAnalysis.confidence
        }
      });
      
      await email.save();

      results.push({
        emailId: email._id,
        success: true,
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          confidencePercentage: `${Math.round(classification.confidence * 100)}%`
        },
        salesAnalysis: {
          confidence: salesAnalysis.confidence,
          intent: salesAnalysis.intent,
          urgency: salesAnalysis.urgency
        },
        subject: email.subject.substring(0, 50) + '...'
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
        processingTime: `${processingTime}ms`,
        avgTimePerEmail: `${Math.round(processingTime / emailIds.length)}ms`
      }
    }
  });
}));

// GET /api/v1/ai/insights/summary - Get AI insights summary
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
        }
      }
    }
  ]);

  const totalEmails = await Email.countDocuments(filter);
  const processedEmails = insights.reduce((sum, cat) => sum + cat.count, 0);

  // Generate sales-focused recommendations
  const recommendations = generateSalesRecommendations(insights);

  res.json({
    success: true,
    data: {
      summary: {
        totalEmails,
        processedEmails,
        processingRate: totalEmails > 0 ? `${Math.round((processedEmails / totalEmails) * 100)}%` : '0%',
        timeRange: `${days} days`
      },
      categories: insights.map(insight => ({
        category: insight._id,
        count: insight.count,
        percentage: totalEmails > 0 ? `${Math.round((insight.count / totalEmails) * 100)}%` : '0%',
        avgConfidence: `${Math.round((insight.avgConfidence || 0) * 100)}%`,
        accuracyRate: `${Math.round(insight.accuracyRate || 0)}%`,
        recentEmails: insight.recentEmails.slice(0, 3),
        salesValue: getSalesValue(insight._id, insight.count)
      })),
      salesMetrics: {
        hotLeads: insights.find(i => i._id === 'interested')?.count || 0,
        scheduledMeetings: insights.find(i => i._id === 'meeting_booked')?.count || 0,
        conversionRate: calculateConversionRate(insights),
        pipelineValue: calculatePipelineValue(insights)
      },
      recommendations,
      lastUpdated: new Date()
    }
  });
}));

// Helper functions
function generateSalesRecommendations(insights: any[]) {
  const recommendations = [];
  
  const interestedCategory = insights.find(i => i._id === 'interested');
  const meetingCategory = insights.find(i => i._id === 'meeting_booked');
  const notInterestedCategory = insights.find(i => i._id === 'not_interested');

  if (interestedCategory && interestedCategory.count > 5) {
    recommendations.push({
      type: 'action',
      priority: 'high',
      message: `You have ${interestedCategory.count} hot leads waiting for response`,
      action: 'Prioritize follow-ups with interested prospects',
      impact: 'High conversion potential'
    });
  }

  if (meetingCategory && meetingCategory.count > 0) {
    recommendations.push({
      type: 'urgent',
      priority: 'urgent',
      message: `${meetingCategory.count} meetings scheduled - prepare materials`,
      action: 'Review prospect backgrounds and prepare personalized demos',
      impact: 'Direct revenue opportunity'
    });
  }

  if (notInterestedCategory && notInterestedCategory.count > 10) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: `High rejection rate detected (${notInterestedCategory.count} not interested)`,
      action: 'Review and optimize your outreach messaging',
      impact: 'Improve future response rates'
    });
  }

  return recommendations;
}

function getSalesValue(category: string, count: number): string {
  switch (category) {
    case 'interested':
      return `High (${count} potential deals)`;
    case 'meeting_booked':
      return `Very High (${count} active prospects)`;
    case 'not_interested':
      return `Low (future nurturing)`;
    case 'out_of_office':
      return `Medium (follow up later)`;
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
  const interested = insights.find(i => i._id === 'interested')?.count || 0;
  const meetings = insights.find(i => i._id === 'meeting_booked')?.count || 0;
  
  // Rough estimate: $5k average deal size, 20% close rate for interested, 40% for meetings
  const estimatedValue = (interested * 5000 * 0.2) + (meetings * 5000 * 0.4);
  
  return `${(estimatedValue / 1000).toFixed(0)}k estimated pipeline`;
}

export default router;
