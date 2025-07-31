import express, { Request, Response } from 'express';
import { EmailAccount, User } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { ImapService } from '../services/ImapService';
import Joi from 'joi';

const router = express.Router();

let imapService: ImapService;

export function setImapService(service: ImapService) {
  imapService = service;
}

const addAccountSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().email().required(),
  provider: Joi.string().valid('gmail', 'outlook', 'yahoo', 'other').required(),
  imapConfig: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    secure: Joi.boolean().required(),
    user: Joi.string().required(),
    pass: Joi.string().required()
  }).required()
});

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.query;
  
  const filter = userId ? { userId, isActive: true } : { isActive: true };
  const accounts = await EmailAccount.find(filter).select('-imapConfig.pass');
  
  const accountsWithStatus = accounts.map(account => {
    const connectionStatus = imapService?.getConnectionStatus() || {};
    return {
      ...account.toObject(),
      connectionStatus: connectionStatus[(account._id as any).toString()] || { connected: false }
    };
  });

  res.json({ 
    success: true, 
    data: accountsWithStatus,
    count: accounts.length 
  });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const account = await EmailAccount.findById(req.params.id).select('-imapConfig.pass');
  
  if (!account) {
    res.status(404).json({ 
      success: false, 
      error: 'Account not found' 
    });
    return;
  }

  const connectionStatus = imapService?.getConnectionStatus() || {};
  const accountWithStatus = {
    ...account.toObject(),
    connectionStatus: connectionStatus[(account._id as any).toString()] || { connected: false }
  };

  res.json({ success: true, data: accountWithStatus });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = addAccountSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  const user = await User.findById(value.userId);
  if (!user) {
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
    return;
  }

  const existingAccount = await EmailAccount.findOne({ 
    email: value.email,
    isActive: true 
  });
  
  if (existingAccount) {
    res.status(409).json({
      success: false,
      error: 'Email account already exists'
    });
    return;
  }

  try {
    const account = await imapService.addAccount(value);
    
    const accountResponse = { ...account.toObject() };
    delete accountResponse.imapConfig.pass;
    
    res.status(201).json({
      success: true,
      message: 'Email account added successfully',
      data: accountResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to add email account: ' + error.message
    });
  }
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  delete updateData.imapConfig;
  delete updateData.userId;

  const account = await EmailAccount.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).select('-imapConfig.pass');

  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Account updated successfully',
    data: account
  });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const account = await EmailAccount.findById(id);
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found'
    });
    return;
  }

  try {
    await imapService.removeAccount(id);
    
    res.json({
      success: true,
      message: 'Email account removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove email account: ' + error.message
    });
  }
}));

router.post('/:id/test-connection', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const account = await EmailAccount.findById(id);
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found'
    });
    return;
  }

  try {
    await imapService.removeAccount(id);
    await imapService.addAccount(account);
    
    res.json({
      success: true,
      message: 'Connection test successful'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed: ' + error.message
    });
  }
}));

router.get('/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const account = await EmailAccount.findById(id);
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found'
    });
    return;
  }

  const totalEmails = await EmailAccount.aggregate([
    { $match: { _id: account._id } },
    {
      $lookup: {
        from: 'emails',
        localField: '_id',
        foreignField: 'accountId',
        as: 'emails'
      }
    },
    {
      $addFields: {
        totalEmails: { $size: '$emails' },
        unreadEmails: {
          $size: {
            $filter: {
              input: '$emails',
              cond: { $eq: ['$$this.isRead', false] }
            }
          }
        },
        interestedEmails: {
          $size: {
            $filter: {
              input: '$emails',
              cond: { $eq: ['$$this.aiCategory', 'interested'] }
            }
          }
        }
      }
    },
    {
      $project: {
        email: 1,
        syncStatus: 1,
        totalEmails: 1,
        unreadEmails: 1,
        interestedEmails: 1,
        lastSyncAt: '$updatedAt'
      }
    }
  ]);

  const stats = totalEmails[0] || {
    email: account.email,
    syncStatus: account.syncStatus,
    totalEmails: 0,
    unreadEmails: 0,
    interestedEmails: 0,
    lastSyncAt: account.updatedAt
  };

  res.json({
    success: true,
    data: stats
  });
}));

const providerConfigs = {
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    secure: true
  },
  outlook: {
    host: 'outlook.office365.com',
    port: 993,
    secure: true
  },
  yahoo: {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true
  }
};

router.get('/providers/:provider/config', (req: Request, res: Response) => {
  const { provider } = req.params;
  
  const config = providerConfigs[provider as keyof typeof providerConfigs];
  
  if (!config) {
    res.status(404).json({
      success: false,
      error: 'Provider configuration not found'
    });
    return;
  }

  res.json({
    success: true,
    data: config
  });
});

router.get('/providers', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.keys(providerConfigs).map(provider => ({
      name: provider,
      displayName: provider.charAt(0).toUpperCase() + provider.slice(1),
      ...providerConfigs[provider as keyof typeof providerConfigs]
    }))
  });
});

export const accountRouter = router;
