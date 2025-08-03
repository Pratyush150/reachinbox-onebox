import express, { Request, Response } from 'express';
import { Email, Draft, EmailAccount } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { cleanEmailText, extractEmailSnippet } from '../utils/emailUtils';
import { elasticClient } from '../config/elasticsearch';
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

// Helper function for formatting bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET /api/v1/emails/stats - FIXED: Better folder counting
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query;

  const filter: any = {}; // Remove isDeleted filter to count all emails
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
              archived: { $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] } },
              deleted: { $sum: { $cond: [{ $eq: ['$folder', 'deleted'] }, 1, 0] } }
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

  const statusStats = result.statusCounts[0] || { total: 0, unread: 0, starred: 0, archived: 0, deleted: 0 };

  res.json({
    success: true,
    data: {
      folders: {
        inbox: folderCounts.inbox || 0,
        sent: folderCounts.sent || 0,
        drafts: folderCounts.drafts || 0,
        archive: folderCounts.archive || 0,
        deleted: folderCounts.deleted || 0,
        spam: folderCounts.spam || 0,
        scheduled: folderCounts.scheduled || 0
      },
      categories: categoryCounts,
      status: statusStats,
      lastUpdated: new Date()
    }
  });
}));

// GET /api/v1/emails/search
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

  try {
    // Build Elasticsearch query
    const esQuery: any = {
      bool: {
        must: [],
        filter: [],
        should: []
      }
    };

    // If no search params, show all emails
    if (!q && !from && !to && !subject && !body && !aiCategory && !folder) {
      esQuery.bool.must.push({
        match_all: {}
      });
    }

    // Multi-field search with boosting
    if (q) {
      esQuery.bool.must.push({
        multi_match: {
          query: q as string,
          fields: [
            'subject^3',      // Boost subject matches most
            'from^2',         // Boost sender matches
            'body^1',         // Standard body search
            'to^1.5'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          minimum_should_match: '70%'
        }
      });
    }

    // Specific field searches
    if (from) {
      esQuery.bool.filter.push({
        wildcard: { 
          from: `*${(from as string).toLowerCase()}*` 
        }
      });
    }

    if (to) {
      esQuery.bool.filter.push({
        wildcard: { 
          to: `*${(to as string).toLowerCase()}*` 
        }
      });
    }

    if (subject) {
      esQuery.bool.should.push({
        match: { 
          subject: {
            query: subject as string,
            boost: 2
          }
        }
      });
    }

    if (body) {
      esQuery.bool.should.push({
        match: { 
          body: body as string 
        }
      });
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = new Date(dateFrom as string);
      if (dateTo) dateRange.lte = new Date(dateTo as string);
      
      esQuery.bool.filter.push({
        range: { receivedDate: dateRange }
      });
    }

    // Category and folder filters
    if (aiCategory) {
      esQuery.bool.filter.push({
        term: { aiCategory: aiCategory as string }
      });
    }

    if (folder) {
      esQuery.bool.filter.push({
        term: { folder: folder as string }
      });
    }

    // Attachments filter
    if (hasAttachments === 'true') {
      esQuery.bool.filter.push({
        exists: { field: 'attachments' }
      });
    }

    console.log('🔍 Elasticsearch Query:', JSON.stringify(esQuery, null, 2));

    // Execute Elasticsearch query - NO FALLBACK
    const esResponse = await elasticClient.search({
      index: 'emails',
      body: {
        query: esQuery,
        from: (Number(page) - 1) * Number(limit),
        size: Number(limit),
        sort: [
          { _score: { order: 'desc' } },  // Relevance first
          { receivedDate: { order: 'desc' } }  // Then by date
        ],
        highlight: {
          pre_tags: ['<mark class="bg-yellow-200 dark:bg-yellow-500/30">'],
          post_tags: ['</mark>'],
          fields: {
            subject: { 
              fragment_size: 100,
              number_of_fragments: 1
            },
            body: { 
              fragment_size: 200, 
              number_of_fragments: 2 
            },
            from: { 
              fragment_size: 50,
              number_of_fragments: 1
            }
          }
        },
        _source: ['messageId', 'accountId'], // Only get IDs from ES
        track_total_hits: true
      },
      timeout: '10s'
    });

    console.log(`🎯 Elasticsearch found ${esResponse.hits.total.value} results in ${esResponse.took}ms`);

    // Get email IDs maintaining Elasticsearch order
    const emailIds = esResponse.hits.hits.map((hit: any) => hit._source.messageId);
    
    let orderedEmails = [];
    
    if (emailIds.length > 0) {
      // Fetch full documents from MongoDB in correct order
      const emailsMap = new Map();
      const emails = await Email.find({ 
        messageId: { $in: emailIds } 
      })
      .populate('accountId', 'email provider')
      .lean();

      // Create map for fast lookup
      emails.forEach(email => {
        emailsMap.set(email.messageId, email);
      });

      // Maintain Elasticsearch order and add highlights + scores
      orderedEmails = emailIds.map((messageId, index) => {
        const email = emailsMap.get(messageId);
        if (!email) return null;

        const esHit = esResponse.hits.hits[index];
        
        return {
          ...email,
          textBody: cleanEmailText(email.textBody),
          snippet: extractEmailSnippet(email.textBody),
          _searchScore: esHit._score,
          _searchRank: index + 1,
          _highlights: esHit.highlight || {},
          _elasticsearchId: esHit._id
        };
      }).filter(Boolean);
    }

    // Response with detailed Elasticsearch metadata
    res.json({
      success: true,
      data: {
        emails: orderedEmails,
        searchQuery: { q, from, to, subject, body, dateFrom, dateTo, hasAttachments, aiCategory, folder },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: esResponse.hits.total.value,
          pages: Math.ceil(esResponse.hits.total.value / Number(limit)),
          hasNext: Number(page) * Number(limit) < esResponse.hits.total.value,
          hasPrev: Number(page) > 1
        },
        searchMetadata: {
          engine: 'elasticsearch',
          took: esResponse.took,
          totalHits: esResponse.hits.total.value,
          maxScore: esResponse.hits.max_score,
          timedOut: esResponse.timed_out,
          shards: {
            total: esResponse._shards.total,
            successful: esResponse._shards.successful,
            failed: esResponse._shards.failed
          },
          elasticsearchVersion: true,
          fallbackUsed: false,
          queryType: q ? 'full_text_search' : 'filtered_browse'
        }
      }
    });

  } catch (esError: any) {
    console.error('💥 Elasticsearch search failed:', esError.message);
    
    // ELASTICSEARCH ONLY - Return error instead of fallback
    res.status(503).json({
      success: false,
      error: 'Search service temporarily unavailable',
      details: {
        engine: 'elasticsearch',
        message: esError.message,
        type: esError.type || 'elasticsearch_error',
        fallbackUsed: false,
        suggestion: 'Please try again in a moment or contact support if the issue persists'
      }
    });
  }
}));

// GET /api/v1/emails/search-status
router.get('/search-status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Test Elasticsearch health
    const health = await elasticClient.cluster.health({
      timeout: '5s'
    });

    // Test search functionality
    const testSearch = await elasticClient.search({
      index: 'emails',
      body: {
        query: { match_all: {} },
        size: 1
      },
      timeout: '3s'
    });

    // Get index statistics
    const stats = await elasticClient.indices.stats({
      index: 'emails'
    });

    const indexStats = stats.indices?.emails;

    res.json({
      success: true,
      data: {
        elasticsearch: {
          available: true,
          status: health.status,
          clusterName: health.cluster_name,
          nodes: health.number_of_nodes,
          dataNodes: health.number_of_data_nodes,
          activePrimaryShards: health.active_primary_shards,
          activeShards: health.active_shards,
          relocatingShards: health.relocating_shards,
          initializingShards: health.initializing_shards,
          unassignedShards: health.unassigned_shards
        },
        index: {
          name: 'emails',
          totalDocuments: indexStats?.total?.docs?.count || 0,
          indexSize: indexStats?.total?.store?.size_in_bytes || 0,
          indexSizeHuman: formatBytes(indexStats?.total?.store?.size_in_bytes || 0),
          lastIndexed: new Date().toISOString()
        },
        searchTest: {
          successful: true,
          took: testSearch.took,
          totalHits: testSearch.hits.total?.value || 0
        },
        configuration: {
          engine: 'elasticsearch_only',
          fallbackEnabled: false,
          timeout: '10s',
          highlighting: true,
          fuzzySearch: true
        }
      }
    });

  } catch (error: any) {
    res.status(503).json({
      success: false,
      data: {
        elasticsearch: {
          available: false,
          error: error.message,
          type: error.type || 'connection_error'
        },
        configuration: {
          engine: 'elasticsearch_only',
          fallbackEnabled: false,
          status: 'unavailable'
        }
      }
    });
  }
}));

// POST /api/v1/emails/bulk-actions - FIXED: Proper delete handling
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
      // FIXED: Move to deleted folder instead of marking isDeleted
      updateData.folder = 'deleted';
      updateData.isArchived = false; // Remove from archive if it was there
      break;
    case 'restore':
      // FIXED: Restore from deleted back to inbox
      updateData.folder = 'inbox';
      break;
  }

  const result = await Email.updateMany(
    { _id: { $in: emailIds } }, // Remove isDeleted filter
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

// GET /api/v1/emails - FIXED: Better folder filtering
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

  // Build filter query - FIXED: No isDeleted filter
  const filter: any = {};

  if (accountId) filter.accountId = accountId;
  
  // FIXED: Better folder filtering
  if (folder && folder !== 'all') {
    if (['inbox', 'sent', 'drafts', 'archive', 'deleted', 'spam', 'scheduled'].includes(folder as string)) {
      filter.folder = folder;
    } else {
      // AI Category filter
      filter.aiCategory = folder;
      filter.folder = { $ne: 'deleted' }; // Exclude deleted emails from category views
    }
  } else if (folder === 'all') {
    filter.folder = { $ne: 'deleted' }; // Show all except deleted
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

  // Clean email text for better display
  const cleanedEmails = emails.map(email => ({
    ...email,
    textBody: cleanEmailText(email.textBody),
    snippet: extractEmailSnippet(email.textBody)
  }));

  const total = await Email.countDocuments(filter);

  res.json({
    success: true,
    data: {
      emails: cleanedEmails,
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

// GET /api/v1/emails/:id - Get single email with cleaned text
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id)
    .populate('accountId', 'email provider')
    .lean();
  
  if (!email) {
    res.status(404).json({ 
      success: false, 
      error: 'Email not found' 
    });
    return;
  }

  // Clean the email text
  const cleanedEmail = {
    ...email,
    textBody: cleanEmailText(email.textBody),
    snippet: extractEmailSnippet(email.textBody)
  };

  res.json({ success: true, data: cleanedEmail });
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
