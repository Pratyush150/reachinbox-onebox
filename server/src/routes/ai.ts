import express, { Request, Response } from 'express';
import { Email } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services';
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
  context: Joi.object({
    subject: Joi.string(),
    body: Joi.string(),
    from: Joi.object({
      address: Joi.string(),
      name: Joi.string()
    })
  })
});

// =================== AI CLASSIFICATION ===================

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
      insights: {
        sentiment: classification.category === 'interested' ? 'positive' : 
                  classification.category === 'not_interested' ? 'negative' : 'neutral',
        urgency: classification.category === 'meeting_booked' ? 'high' : 
                classification.category === 'interested' ? 'medium' : 'low',
        priority: classification.category === 'interested' || classification.category === 'meeting_booked' ? 'high' : 'normal'
      },
      processingTime: `${processingTime}ms`
    }
  });
}));

// POST /api/v1/ai/generate-reply - Generate AI reply
router.post('/generate-reply', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = generateReplySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { emailId, category, context } = value;

  let emailData;
  let targetCategory = category;

  if (emailId) {
    // Generate reply for existing email
    const email = await Email.findById(emailId);
    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }
    emailData = email;
    targetCategory = email.aiCategory || 'interested';
  } else if (context) {
    // Generate reply for provided context
    emailData = context;
    targetCategory = category || 'interested';
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Either emailId or context is required' 
    });
    return;
  }

  const startTime = Date.now();
  const generatedReply = await aiService.generateResponse(emailData, targetCategory);
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
      category: targetCategory,
      replyMetadata: {
        wordCount: generatedReply.split(' ').length,
        estimatedReadTime: `${Math.ceil(generatedReply.split(' ').length / 200)} min`,
        tone: targetCategory === 'interested' ? 'enthusiastic' : 
              targetCategory === 'meeting_booked' ? 'professional' : 
              targetCategory === 'not_interested' ? 'polite' : 'neutral'
      },
      processingTime: `${processingTime}ms`
    }
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
      examples: ['interested in pricing', 'schedule a demo', 'ready to buy']
    },
    {
      id: 'meeting_booked',
      name: 'Meeting Booked',
      description: 'Confirms meeting/call scheduled, calendar invites, appointment confirmations',
      color: 'blue',
      priority: 'urgent',
      examples: ['meeting confirmed', 'see you tomorrow', 'calendar invite accepted']
    },
    {
      id: 'not_interested',
      name: 'Not Interested',
      description: 'Rejection, unsubscribe, negative response, not a fit',
      color: 'red',
      priority: 'low',
      examples: ['not interested', 'unsubscribe', 'not a fit']
    },
    {
      id: 'spam',
      name: 'Spam',
      description: 'Promotional content, irrelevant offers, suspicious content',
      color: 'orange',
      priority: 'low',
      examples: ['limited time offer', 'click here now', 'congratulations winner']
    },
    {
      id: 'out_of_office',
      name: 'Out of Office',
      description: 'Automatic replies, vacation messages, unavailable responses',
      color: 'purple',
      priority: 'normal',
      examples: ['out of office', 'vacation reply', 'will respond when back']
    }
  ];

  // Get current statistics for each category
  const categoryStats = await Email.aggregate([
    { $match: { isDeleted: false } },
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
      aiModel: 'Gemini Pro + Rule-based fallback'
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
    isDeleted: false 
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
      
      // Update email with new classification
      email.aiCategory = classification.category;
      email.aiConfidence = classification.confidence;
      email.aiProcessed = true;
      email.actions.push({
        type: 'classify',
        timestamp: new Date(),
        metadata: { 
          previousCategory: email.aiCategory,
          newCategory: classification.category,
          confidence: classification.confidence
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
        subject: email.subject.substring(0, 50) + '...'
      });

    } catch (error) {
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
    isDeleted: false,
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
        recentEmails: insight.recentEmails.slice(0, 3) // Last 3 recent emails
      })),
      recommendations: this.generateRecommendations(insights),
      lastUpdated: new Date()
    }
  });
}));

// Helper function for recommendations
function generateRecommendations(insights) {
  const recommendations = [];
  
  const interestedCategory = insights.find(i => i._id === 'interested');
  const meetingCategory = insights.find(i => i._id === 'meeting_booked');
  const spamCategory = insights.find(i => i._id === 'spam');

  if (interestedCategory && interestedCategory.count > 5) {
    recommendations.push({
      type: 'action',
      priority: 'high',
      message: `${spamCategory.count} spam emails detected - consider bulk cleanup`,
      action: 'Review and delete spam emails to keep inbox clean'
    });
  }

  return recommendations;
}

export default router;: `You have ${interestedCategory.count} interested leads to follow up with`,
      action: 'Review interested emails and send personalized responses'
    });
  }

  if (meetingCategory && meetingCategory.count > 0) {
    recommendations.push({
      type: 'urgent',
      priority: 'urgent',
      message: `${meetingCategory.count} meeting confirmations require attention`,
      action: 'Check calendar and confirm meeting details'
    });
  }

  if (spamCategory && spamCategory.count > 20) {
    recommendations.push({
      type: 'cleanup',
      priority: 'medium',
      message
