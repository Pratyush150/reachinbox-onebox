import express, { Request, Response } from 'express';
import { Email, Draft, EmailAccount } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services';
import Joi from 'joi';

const router = express.Router();

// Validation Schemas
const updateEmailSchema = Joi.object({
  isRead: Joi.boolean(),
  isStarred: Joi.boolean(),
  isArchived: Joi.boolean(),
  folder: Joi.string().valid('inbox', 'sent', 'drafts', 'archive', 'deleted', 'spam', 'scheduled'),
  labels: Joi.array().items(Joi.string())
});

const bulkActionSchema = Joi.object({
  action: Joi.string().valid('markRead', 'markUnread', 'star', 'unstar', 'archive', 'restore', 'delete', 'move').required(),
  emailIds: Joi.array().items(Joi.string()).min(1).required(),
  targetFolder: Joi.string().valid('inbox', 'sent', 'drafts', 'archive', 'deleted', 'spam'),
  labels: Joi.array().items(Joi.string())
});

const composeEmailSchema = Joi.object({
  accountId: Joi.string().required(),
  to: Joi.array().items(Joi.string().email()).min(1).required(),
  cc: Joi.array().items(Joi.string().email()),
  bcc: Joi.array().items(Joi.string().email()),
  subject: Joi.string().required(),
  body: Joi.string().required(),
  htmlBody: Joi.string(),
  scheduledFor: Joi.date().min('now'),
  attachments: Joi.array().items(Joi.object({
    filename: Joi.string().required(),
    contentType: Joi.string().required(),
    size: Joi.number().required(),
    path: Joi.string().required()
  }))
});

// =================== EMAIL CRUD OPERATIONS ===================

// GET /api/v1/emails - Get all emails with filtering
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 50,
    accountId,
    folder = 'inbox',
    isRead,
    isStarred,
    isArchived,
    aiCategory,
    search,
    sortBy = 'receivedDate',
    sortOrder = 'desc'
  } = req.query;

  // Build filter query
  const filter: any = {
    isDeleted: false
  };

  if (accountId) filter.accountId = accountId;
  if (folder && folder !== 'all') {
    if (['inbox', 'sent', 'drafts', 'archive', 'deleted', 'spam', 'scheduled'].includes(folder as string)) {
      filter.folder = folder;
    } else {
      // AI Category filter
      filter.aiCategory = folder;
    }
  }
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (isStarred !== undefined) filter.isStarred = isStarred === 'true';
  if (isArchived !== undefined) filter.isArchived = isArchived === 'true';
  if (aiCategory) filter.aiCategory = aiCategory;

  // Text search
  if (search) {
    filter.$text = { $search: search as string };
  }

  // Build sort
  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

  const emails = await Email
    .find(filter)
    .sort(sort)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .populate('accountId', 'email provider')
    .lean();

  const total = await Email.countDocuments(filter);

  res.json({
    success: true,
    data: {
      emails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    }
  });
}));

// GET /api/v1/emails/:id - Get single email
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id)
    .populate('accountId', 'email provider');
  
  if (!email) {
    res.status(404).json({ 
      success: false, 
      error: 'Email not found' 
    });
    return;
  }

  res.json({ success: true, data: email });
}));

// PUT /api/v1/emails/:id - Update email
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = updateEmailSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ 
      success: false, 
      error: 'Email not found' 
    });
    return;
  }

  // Update fields
  Object.assign(email, value);
  
  // Add action to history
  const changedFields = Object.keys(value);
  email.actions.push({
    type: 'update',
    timestamp: new Date(),
    metadata: { fields: changedFields }
  });
  
  await email.save();

  res.json({
    success: true,
    message: 'Email updated successfully',
    data: email
  });
}));

// DELETE /api/v1/emails/:id - Soft delete email
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ 
      success: false, 
      error: 'Email not found' 
    });
    return;
  }

  email.isDeleted = true;
  email.folder = 'deleted';
  email.actions.push({ type: 'delete', timestamp: new Date() });
  await email.save();

  res.json({
    success: true,
    message: 'Email moved to deleted folder'
  });
}));

// =================== EMAIL STATE MANAGEMENT ===================

// PUT /api/v1/emails/:id/read - Mark as read
router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.markAsRead();
  res.json({ success: true, message: 'Email marked as read', data: email });
}));

// PUT /api/v1/emails/:id/unread - Mark as unread
router.put('/:id/unread', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.markAsUnread();
  res.json({ success: true, message: 'Email marked as unread', data: email });
}));

// PUT /api/v1/emails/:id/star - Toggle star
router.put('/:id/star', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.toggleStar();
  res.json({ 
    success: true, 
    message: `Email ${email.isStarred ? 'starred' : 'unstarred'}`, 
    data: email 
  });
}));

// PUT /api/v1/emails/:id/archive - Archive email
router.put('/:id/archive', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.archive();
  res.json({ success: true, message: 'Email archived', data: email });
}));

// PUT /api/v1/emails/:id/restore - Restore from archive
router.put('/:id/restore', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.restore();
  res.json({ success: true, message: 'Email restored to inbox', data: email });
}));

// PUT /api/v1/emails/:id/move - Move to folder
router.put('/:id/move', asyncHandler(async (req: Request, res: Response) => {
  const { targetFolder } = req.body;
  
  if (!targetFolder) {
    res.status(400).json({ success: false, error: 'Target folder is required' });
    return;
  }

  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  await email.moveToFolder(targetFolder);
  res.json({ 
    success: true, 
    message: `Email moved to ${targetFolder}`, 
    data: email 
  });
}));

// =================== BULK OPERATIONS ===================

// POST /api/v1/emails/bulk-actions - Bulk operations
router.post('/bulk-actions', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = bulkActionSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { action, emailIds, targetFolder, labels } = value;

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
  
  for (const email of emails) {
    try {
      switch (action) {
        case 'markRead':
          await email.markAsRead();
          break;
        case 'markUnread':
          await email.markAsUnread();
          break;
        case 'star':
        case 'unstar':
          await email.toggleStar();
          break;
        case 'archive':
          await email.archive();
          break;
        case 'restore':
          await email.restore();
          break;
        case 'delete':
          email.isDeleted = true;
          email.folder = 'deleted';
          email.actions.push({ type: 'delete', timestamp: new Date() });
          await email.save();
          break;
        case 'move':
          if (targetFolder) {
            await email.moveToFolder(targetFolder);
          }
          break;
      }
      results.push({ id: email._id, success: true });
    } catch (err) {
      results.push({ id: email._id, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  res.json({
    success: true,
    message: `Bulk ${action} completed: ${successCount}/${emailIds.length} emails processed`,
    data: { results, successCount, totalCount: emailIds.length }
  });
}));

// =================== SEARCH & FILTERING ===================

// GET /api/v1/emails/search - Advanced search
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    from,
    to,
    subject,
    body,
    dateFrom,
    dateTo,
    hasAttachments,
    aiCategory,
    folder,
    page = 1,
    limit = 20
  } = req.query;

  const filter: any = { isDeleted: false };
  
  // Build search filter
  if (q) {
    filter.$text = { $search: q as string };
  }
  
  if (from) {
    filter['from.address'] = new RegExp(from as string, 'i');
  }
  
  if (to) {
    filter['to.address'] = new RegExp(to as string, 'i');
  }
  
  if (subject) {
    filter.subject = new RegExp(subject as string, 'i');
  }
  
  if (body) {
    filter.textBody = new RegExp(body as string, 'i');
  }
  
  if (dateFrom || dateTo) {
    filter.receivedDate = {};
    if (dateFrom) filter.receivedDate.$gte = new Date(dateFrom as string);
    if (dateTo) filter.receivedDate.$lte = new Date(dateTo as string);
  }
  
  if (hasAttachments === 'true') {
    filter['attachments.0'] = { $exists: true };
  }
  
  if (aiCategory) {
    filter.aiCategory = aiCategory;
  }
  
  if (folder) {
    filter.folder = folder;
  }

  const emails = await Email
    .find(filter)
    .sort({ receivedDate: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .populate('accountId', 'email provider');

  const total = await Email.countDocuments(filter);

  res.json({
    success: true,
    data: {
      emails,
      searchQuery: { q, from, to, subject, body, dateFrom, dateTo, hasAttachments, aiCategory, folder },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// =================== AI FEATURES ===================

// POST /api/v1/emails/:id/classify - Reclassify email
router.post('/:id/classify', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  const classification = await aiService.classifyEmail(email);
  
  email.aiCategory = classification.category;
  email.aiConfidence = classification.confidence;
  email.aiProcessed = true;
  email.actions.push({ 
    type: 'classify', 
    timestamp: new Date(), 
    metadata: classification 
  });
  
  await email.save();

  res.json({
    success: true,
    message: 'Email reclassified successfully',
    data: { email, classification }
  });
}));

// POST /api/v1/emails/:id/generate-reply - Generate AI reply
router.post('/:id/generate-reply', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  const reply = await aiService.generateResponse(email, email.aiCategory || 'interested');
  
  res.json({
    success: true,
    data: {
      originalEmail: {
        id: email._id,
        subject: email.subject,
        from: email.from
      },
      generatedReply: reply,
      category: email.aiCategory,
      confidence: email.aiConfidence
    }
  });
}));

// GET /api/v1/emails/:id/insights - Get AI insights
router.get('/:id/insights', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  // Generate insights if not already available
  let insights = email.aiInsights;
  if (!insights) {
    const classification = await aiService.classifyEmail(email);
    insights = {
      sentiment: email.aiCategory === 'interested' ? 'positive' : 
                email.aiCategory === 'not_interested' ? 'negative' : 'neutral',
      urgency: email.aiCategory === 'meeting_booked' ? 'high' : 
              email.aiCategory === 'interested' ? 'medium' : 'low',
      intent: classification.category,
      keyTopics: email.subject.split(' ').filter(word => word.length > 3).slice(0, 5)
    };
    
    email.aiInsights = insights;
    await email.save();
  }

  res.json({
    success: true,
    data: {
      emailId: email._id,
      insights,
      category: email.aiCategory,
      confidence: email.aiConfidence,
      lastProcessed: email.updatedAt
    }
  });
}));

// =================== COMPOSE & SEND ===================

// POST /api/v1/emails/compose - Compose and send email
router.post('/compose', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = composeEmailSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { accountId, to, cc, bcc, subject, body, htmlBody, scheduledFor, attachments } = value;

  // Verify account exists
  const account = await EmailAccount.findById(accountId);
  if (!account) {
    res.status(404).json({ success: false, error: 'Email account not found' });
    return;
  }

  const emailData = {
    accountId,
    messageId: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from: {
      address: account.email,
      name: account.displayName || 'User'
    },
    to: to.map(addr => ({ address: addr })),
    cc: cc?.map(addr => ({ address: addr })) || [],
    bcc: bcc?.map(addr => ({ address: addr })) || [],
    subject,
    textBody: body,
    htmlBody: htmlBody || body,
    snippet: body.substring(0, 150),
    folder: scheduledFor ? 'scheduled' : 'sent',
    isRead: true,
    receivedDate: scheduledFor || new Date(),
    sentDate: scheduledFor || new Date(),
    attachments: attachments || [],
    actions: [{
      type: scheduledFor ? 'schedule' : 'send',
      timestamp: new Date(),
      metadata: { scheduledFor }
    }]
  };

  const email = await Email.create(emailData);

  res.status(201).json({
    success: true,
    message: scheduledFor ? 'Email scheduled successfully' : 'Email sent successfully',
    data: {
      email,
      scheduledFor,
      recipients: { to: to.length, cc: cc?.length || 0, bcc: bcc?.length || 0 }
    }
  });
}));

// POST /api/v1/emails/:id/reply - Reply to email
router.post('/:id/reply', asyncHandler(async (req: Request, res: Response) => {
  const { body, htmlBody, cc, bcc, scheduledFor, attachments } = req.body;

  if (!body) {
    res.status(400).json({ success: false, error: 'Reply body is required' });
    return;
  }

  const originalEmail = await Email.findById(req.params.id).populate('accountId');
  if (!originalEmail) {
    res.status(404).json({ success: false, error: 'Original email not found' });
    return;
  }

  const account = originalEmail.accountId as any;
  
  const replyData = {
    accountId: originalEmail.accountId,
    messageId: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    threadId: originalEmail.threadId || originalEmail.messageId,
    from: {
      address: account.email,
      name: account.displayName || 'User'
    },
    to: [originalEmail.from],
    cc: cc?.map(addr => ({ address: addr })) || [],
    bcc: bcc?.map(addr => ({ address: addr })) || [],
    subject: originalEmail.subject.startsWith('Re: ') ? originalEmail.subject : `Re: ${originalEmail.subject}`,
    textBody: body,
    htmlBody: htmlBody || body,
    snippet: body.substring(0, 150),
    folder: scheduledFor ? 'scheduled' : 'sent',
    isRead: true,
    receivedDate: scheduledFor || new Date(),
    sentDate: scheduledFor || new Date(),
    inReplyTo: originalEmail.messageId,
    references: [originalEmail.messageId, ...(originalEmail.references || [])],
    attachments: attachments || [],
    actions: [{
      type: scheduledFor ? 'schedule-reply' : 'reply',
      timestamp: new Date(),
      metadata: { originalEmailId: originalEmail._id, scheduledFor }
    }]
  };

  const reply = await Email.create(replyData);

  res.status(201).json({
    success: true,
    message: scheduledFor ? 'Reply scheduled successfully' : 'Reply sent successfully',
    data: {
      reply,
      originalEmail: { id: originalEmail._id, subject: originalEmail.subject },
      scheduledFor
    }
  });
}));

// =================== DRAFTS MANAGEMENT ===================

// GET /api/v1/emails/drafts - Get all drafts
router.get('/drafts', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, page = 1, limit = 20 } = req.query;

  const filter: any = {};
  if (accountId) filter.accountId = accountId;

  const drafts = await Draft
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .populate('accountId', 'email provider');

  const total = await Draft.countDocuments(filter);

  res.json({
    success: true,
    data: {
      drafts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/v1/emails/drafts - Save draft
router.post('/drafts', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, to, cc, bcc, subject, body, htmlBody, scheduledFor, attachments } = req.body;

  if (!accountId || !subject || !body) {
    res.status(400).json({
      success: false,
      error: 'Account ID, subject, and body are required'
    });
    return;
  }

  const draftData = {
    accountId,
    to: Array.isArray(to) ? to : [to],
    cc: cc || [],
    bcc: bcc || [],
    subject,
    body,
    htmlBody,
    scheduledFor,
    isScheduled: !!scheduledFor,
    attachments: attachments || [],
    lastSavedAt: new Date()
  };

  const draft = await Draft.create(draftData);

  res.status(201).json({
    success: true,
    message: 'Draft saved successfully',
    data: draft
  });
}));

// PUT /api/v1/emails/drafts/:id - Update draft
router.put('/drafts/:id', asyncHandler(async (req: Request, res: Response) => {
  const draft = await Draft.findById(req.params.id);
  if (!draft) {
    res.status(404).json({ success: false, error: 'Draft not found' });
    return;
  }

  const updateData = { ...req.body, lastSavedAt: new Date() };
  Object.assign(draft, updateData);
  await draft.save();

  res.json({
    success: true,
    message: 'Draft updated successfully',
    data: draft
  });
}));

// DELETE /api/v1/emails/drafts/:id - Delete draft
router.delete('/drafts/:id', asyncHandler(async (req: Request, res: Response) => {
  const draft = await Draft.findByIdAndDelete(req.params.id);
  if (!draft) {
    res.status(404).json({ success: false, error: 'Draft not found' });
    return;
  }

  res.json({
    success: true,
    message: 'Draft deleted successfully'
  });
}));

// =================== ANALYTICS ===================

// GET /api/v1/emails/analytics/overview - Email analytics overview
router.get('/analytics/overview', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, days = 30 } = req.query;

  const filter: any = { 
    isDeleted: false,
    receivedDate: { 
      $gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) 
    }
  };
  
  if (accountId) filter.accountId = accountId;

  const [
    totalEmails,
    unreadEmails,
    categoryStats,
    folderStats,
    recentActivity
  ] = await Promise.all([
    Email.countDocuments(filter),
    Email.countDocuments({ ...filter, isRead: false }),
    Email.aggregate([
      { $match: filter },
      { $group: { _id: '$aiCategory', count: { $sum: 1 }, avgConfidence: { $avg: '$aiConfidence' } } }
    ]),
    Email.aggregate([
      { $match: filter },
      { $group: { _id: '$folder', count: { $sum: 1 } } }
    ]),
    Email.find(filter)
      .sort({ receivedDate: -1 })
      .limit(10)
      .select('subject from receivedDate aiCategory')
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalEmails,
        unreadEmails,
        readRate: totalEmails > 0 ? ((totalEmails - unreadEmails) / totalEmails * 100).toFixed(1) : 0
      },
      categories: categoryStats,
      folders: folderStats,
      recentActivity,
      timeRange: `${days} days`
    }
  });
}));

// GET /api/v1/emails/analytics/trends - Email trends
router.get('/analytics/trends', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, period = 'daily' } = req.query;

  const filter: any = { 
    isDeleted: false,
    receivedDate: { 
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  };
  
  if (accountId) filter.accountId = accountId;

  const groupFormat = period === 'daily' 
    ? { $dateToString: { format: "%Y-%m-%d", date: "$receivedDate" } }
    : { $dateToString: { format: "%Y-%m", date: "$receivedDate" } };

  const trends = await Email.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          date: groupFormat,
          category: '$aiCategory'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      trends,
      period,
      totalDataPoints: trends.length
    }
  });
}));

// =================== EMAIL COUNTS & STATS ===================

// GET /api/v1/emails/stats - Get email statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query;

  const filter: any = { isDeleted: false };
  if (accountId) filter.accountId = accountId;

  const stats = await Email.aggregate([
    { $match: filter },
    {
      $facet: {
        folderCounts: [
          { $group: { _id: '$folder', count: { $sum: 1 } } }
        ],
        categoryCounts: [
          { $group: { _id: '$aiCategory', count: { $sum: 1 } } }
        ],
        statusCounts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
              starred: { $sum: { $cond: [{ $eq: ['$isStarred', true] }, 1, 0] } },
              archived: { $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] } }
            }
          }
        ]
      }
    }
  ]);

  const result = stats[0];
  const folderCounts = {};
  const categoryCounts = {};

  result.folderCounts.forEach(item => {
    folderCounts[item._id] = item.count;
  });

  result.categoryCounts.forEach(item => {
    if (item._id) categoryCounts[item._id] = item.count;
  });

  const statusStats = result.statusCounts[0] || { total: 0, unread: 0, starred: 0, archived: 0 };

  res.json({
    success: true,
    data: {
      folders: folderCounts,
      categories: categoryCounts,
      status: statusStats,
      lastUpdated: new Date()
    }
  });
}));

// =================== REAL-TIME SYNC STATUS ===================

// GET /api/v1/emails/sync/status - Get sync status
router.get('/sync/status', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await EmailAccount.find({ isActive: true });
  
  const syncStatus = accounts.map(account => ({
    id: account._id,
    email: account.email,
    provider: account.provider,
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
    totalEmails: account.syncStats?.totalEmails || 0,
    errorCount: account.syncStats?.errorCount || 0
  }));

  const overallStatus = {
    totalAccounts: accounts.length,
    connectedAccounts: accounts.filter(a => a.syncStatus === 'connected').length,
    syncingAccounts: accounts.filter(a => a.syncStatus === 'syncing').length,
    errorAccounts: accounts.filter(a => a.syncStatus === 'error').length
  };

  res.json({
    success: true,
    data: {
      accounts: syncStatus,
      summary: overallStatus,
      timestamp: new Date()
    }
  });
}));

// POST /api/v1/emails/sync/trigger - Trigger manual sync
router.post('/sync/trigger', asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.body;

  if (accountId) {
    const account = await EmailAccount.findById(accountId);
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    // Trigger sync for specific account
    account.syncStatus = 'syncing';
    await account.save();

    res.json({
      success: true,
      message: `Sync triggered for ${account.email}`,
      data: { accountId, email: account.email, status: 'syncing' }
    });
  } else {
    // Trigger sync for all accounts
    await EmailAccount.updateMany(
      { isActive: true },
      { syncStatus: 'syncing' }
    );

    res.json({
      success: true,
      message: 'Sync triggered for all active accounts',
      data: { triggeredAt: new Date() }
    });
  }
}));

export default router;
