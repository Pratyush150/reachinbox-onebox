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

// POST /api/v1/ai/generate-reply - Generate smart AI reply
router.post('/generate-reply', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = generateReplySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { emailId, category, tone, includeQuestions, context } = value;

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
  
  // Generate multiple reply options
  const replyOptions = await generateMultipleReplies(emailData, targetCategory, tone, salesAnalysis, includeQuestions);
  
  const processingTime = Date.now() - startTime;

  res.json({
    success: true,
    data: {
      originalEmail: emailId ? {
        id: emailId,
        subject: emailData.subject,
        from: emailData.from
      } : context,
      replyOptions,
      salesAnalysis: {
        confidence: salesAnalysis.confidence,
        intent: salesAnalysis.intent,
        urgency: salesAnalysis.urgency,
        buyingSignals: salesAnalysis.buyingSignals,
        nextAction: salesAnalysis.nextAction,
        strategy: salesAnalysis.responseStrategy
      },
      recommendations: {
        bestOption: replyOptions[0]?.id || 1,
        tone: tone,
        followUpSuggested: salesAnalysis.confidence > 30,
        includeDemo: salesAnalysis.buyingSignals.some(signal => 
          signal.includes('demo') || signal.includes('pricing')
        )
      },
      processingTime: `${processingTime}ms`
    }
  });
}));

// Helper function to generate multiple reply options
async function generateMultipleReplies(emailData: any, category: string, tone: string, salesAnalysis: any, includeQuestions: boolean) {
  const name = emailData.from?.name || emailData.from?.address?.split('@')[0] || 'there';
  const senderName = emailData.from?.name || 'Unknown';
  
  const replyOptions = [];

  // Option 1: AI-powered smart reply
  try {
    const aiReply = await aiService.generateResponse(emailData, category);
    replyOptions.push({
      id: 1,
      type: 'ai_generated',
      title: 'AI Smart Reply',
      content: aiReply,
      recommended: true
    });
  } catch (error) {
    // Fallback if AI fails
  }

  // Option 2: Sales-focused template based on analysis
  const salesReply = generateSalesFocusedReply(name, senderName, category, salesAnalysis, tone, includeQuestions);
  replyOptions.push({
    id: 2,
    type: 'sales_optimized',
    title: 'Sales Optimized',
    content: salesReply,
    recommended: salesAnalysis.confidence > 40
  });

  // Option 3: Brief professional reply
  const briefReply = generateBriefReply(name, category, tone);
  replyOptions.push({
    id: 3,
    type: 'brief_professional',
    title: 'Brief & Professional',
    content: briefReply,
    recommended: false
  });

  // Option 4: Detailed follow-up (if high intent)
  if (salesAnalysis.confidence > 50) {
    const detailedReply = generateDetailedFollowUp(name, senderName, salesAnalysis);
    replyOptions.push({
      id: 4,
      type: 'detailed_followup',
      title: 'Detailed Follow-up',
      content: detailedReply,
      recommended: salesAnalysis.urgency === 'high'
    });
  }

  return replyOptions;
}

function generateSalesFocusedReply(name: string, senderName: string, category: string, analysis: any, tone: string, includeQuestions: boolean): string {
  let greeting = '';
  let body = '';
  let closing = '';
  let questions = '';

  // Greeting based on tone
  switch (tone) {
    case 'enthusiastic':
      greeting = `Hi ${name}!`;
      break;
    case 'friendly':
      greeting = `Hello ${name},`;
      break;
    case 'brief':
      greeting = `Hi ${name},`;
      break;
    default:
      greeting = `Dear ${name},`;
  }

  // Questions based on buying signals
  if (includeQuestions && analysis.confidence > 30) {
    const questionOptions = [];
    
    if (analysis.buyingSignals.some((s: string) => s.includes('budget'))) {
      questionOptions.push('What budget range are you working with?');
    }
    if (analysis.buyingSignals.some((s: string) => s.includes('timeline'))) {
      questionOptions.push('What\'s your ideal timeline for implementation?');
    }
    if (analysis.buyingSignals.some((s: string) => s.includes('team'))) {
      questionOptions.push('How large is your team?');
    }
    
    if (questionOptions.length > 0) {
      questions = '\n\nA few quick questions to help me provide the best solution:\n• ' + questionOptions.slice(0, 2).join('\n• ');
    }
  }

  // Body based on category and intent
  switch (category) {
    case 'interested':
      if (analysis.confidence > 60) {
        body = `Thank you for your interest! I'm excited to help you achieve your goals. Based on what you've shared, I believe we can deliver significant value to your organization.`;
        if (analysis.urgency === 'high') {
          body += `\n\nI understand this is time-sensitive. Let me fast-track this for you - I can have a custom proposal ready within 24 hours.`;
        } else {
          body += `\n\nI'd love to schedule a 15-minute call to understand your specific needs and show you exactly how we can help.`;
        }
      } else {
        body = `Thank you for reaching out! I'd be happy to provide more information about how we can help your business grow.`;
      }
      break;
      
    case 'meeting_booked':
      body = `Perfect! I've confirmed our meeting and I'm looking forward to our conversation.`;
      if (analysis.buyingSignals.length > 0) {
        body += ` I'll prepare some specific examples and case studies that align with your needs.`;
      }
      break;
      
    case 'not_interested':
      body = `I completely understand. Thank you for taking the time to let me know.`;
      if (tone !== 'brief') {
        body += ` If anything changes in the future, please don't hesitate to reach out.`;
      }
      break;
      
    default:
      body = `Thank you for your email. I'll make sure to address your inquiry promptly.`;
  }

  // Closing based on tone and intent
  if (category === 'not_interested') {
    closing = `\nBest wishes,`;
  } else if (analysis.confidence > 40) {
    closing = tone === 'brief' ? `\nBest regards,` : `\nLooking forward to hearing from you!\n\nBest regards,`;
  } else {
    closing = `\nBest regards,`;
  }

  return `${greeting}\n\n${body}${questions}${closing}`;
}

function generateBriefReply(name: string, category: string, tone: string): string {
  const templates = {
    interested: `Hi ${name},\n\nThank you for your interest! I'd be happy to schedule a brief call to discuss how we can help.\n\nBest regards,`,
    meeting_booked: `Hi ${name},\n\nMeeting confirmed. Looking forward to speaking with you.\n\nBest regards,`,
    not_interested: `Hi ${name},\n\nUnderstood. Thank you for letting me know.\n\nBest regards,`,
    default: `Hi ${name},\n\nThank you for your email. I'll respond with more details shortly.\n\nBest regards,`
  };
  
  return templates[category as keyof typeof templates] || templates.default;
}

function generateDetailedFollowUp(name: string, senderName: string, analysis: any): string {
  let content = `Dear ${name},\n\n`;
  
  content += `Thank you for expressing interest in our solution! Based on your inquiry, I can see this could be a great fit for your needs.\n\n`;
  
  if (analysis.buyingSignals.length > 0) {
    content += `I noticed you mentioned ${analysis.buyingSignals.slice(0, 2).join(' and ').toLowerCase()}. This tells me you're serious about finding the right solution.\n\n`;
  }
  
  content += `Here's what I'd like to propose:\n\n`;
  content += `1. A 15-minute discovery call to understand your specific requirements\n`;
  content += `2. A personalized demo showing exactly how we solve your challenges\n`;
  content += `3. A custom proposal with pricing tailored to your needs\n\n`;
  
  if (analysis.urgency === 'high') {
    content += `Since timing seems important, I can prioritize this and have everything ready within 48 hours.\n\n`;
  }
  
  content += `Would you be available for a brief call this week? I have openings Tuesday and Thursday afternoon.\n\n`;
  content += `Looking forward to helping you achieve your goals!\n\nBest regards,`;
  
  return content;
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
