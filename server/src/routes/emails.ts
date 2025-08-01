import express, { Request, Response } from 'express';
import { Email, Draft, EmailAccount } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
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

// CRITICAL: SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES

// GET /api/v1/emails/stats - FIXED: Moved before /:id
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
  const folderCounts: any = {};
  const categoryCounts: any = {};

  result.folderCounts.forEach((item: any) => {
    folderCounts[item._id] = item.count;
  });

  result.categoryCounts.forEach((item: any) => {
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

// GET /api/v1/emails/search - FIXED: Moved before /:id
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
  
  if (q) filter.$text = { $search: q as string };
  if (from) filter['from.address'] = new RegExp(from as string, 'i');
  if (to) filter['to.address'] = new RegExp(to as string, 'i');
  if (subject) filter.subject = new RegExp(subject as string, 'i');
  if (body) filter.textBody = new RegExp(body as string, 'i');
  if (dateFrom || dateTo) {
    filter.receivedDate = {};
    if (dateFrom) filter.receivedDate.$gte = new Date(dateFrom as string);
    if (dateTo) filter.receivedDate.$lte = new Date(dateTo as string);
  }
  if (hasAttachments === 'true') filter['attachments.0'] = { $exists: true };
  if (aiCategory) filter.aiCategory = aiCategory;
  if (folder) filter.folder = folder;

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

// POST /api/v1/emails/bulk-actions - FIXED: Moved before /:id
router.post('/bulk-actions', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = bulkActionSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const { action, emailIds } = value;

  let updateData: any = { lastActionAt: new Date() };
  const actionEntry = { type: action, timestamp: new Date() };

  switch (action) {
    case 'markRead':
      updateData.isRead = true;
      break;
    case 'markUnread':
      updateData.isRead = false;
      break;
    case 'archive':
      updateData.isArchived = true;
      updateData.folder = 'archive';
      break;
    case 'delete':
      updateData.isDeleted = true;
      updateData.folder = 'deleted';
      break;
  }

  const result = await Email.updateMany(
    { _id: { $in: emailIds }, isDeleted: false },
    { 
      ...updateData,
      $push: { actions: actionEntry }
    }
  );

  res.json({
    success: true,
    message: `Bulk ${action} completed: ${result.modifiedCount}/${emailIds.length} emails processed`,
    data: { modifiedCount: result.modifiedCount, totalCount: emailIds.length }
  });
}));

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

// PARAMETERIZED ROUTES MUST COME AFTER SPECIFIC ROUTES

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

// PUT /api/v1/emails/:id/read - Mark as read
router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findByIdAndUpdate(
    req.params.id,
    { 
      isRead: true,
      lastActionAt: new Date(),
      $push: { actions: { type: 'read', timestamp: new Date() } }
    },
    { new: true }
  );
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  res.json({ success: true, message: 'Email marked as read', data: email });
}));

// PUT /api/v1/emails/:id/unread - Mark as unread
router.put('/:id/unread', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findByIdAndUpdate(
    req.params.id,
    { 
      isRead: false,
      lastActionAt: new Date(),
      $push: { actions: { type: 'unread', timestamp: new Date() } }
    },
    { new: true }
  );
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  res.json({ success: true, message: 'Email marked as unread', data: email });
}));

// PUT /api/v1/emails/:id/star - Toggle star
router.put('/:id/star', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  const updatedEmail = await Email.findByIdAndUpdate(
    req.params.id,
    { 
      isStarred: !email.isStarred,
      lastActionAt: new Date(),
      $push: { actions: { type: email.isStarred ? 'unstar' : 'star', timestamp: new Date() } }
    },
    { new: true }
  );

  res.json({ 
    success: true, 
    message: `Email ${updatedEmail?.isStarred ? 'starred' : 'unstarred'}`, 
    data: updatedEmail 
  });
}));

// PUT /api/v1/emails/:id/archive - Archive email
router.put('/:id/archive', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findByIdAndUpdate(
    req.params.id,
    { 
      isArchived: true,
      folder: 'archive',
      lastActionAt: new Date(),
      $push: { actions: { type: 'archive', timestamp: new Date() } }
    },
    { new: true }
  );
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  res.json({ success: true, message: 'Email archived', data: email });
}));

export default router;
