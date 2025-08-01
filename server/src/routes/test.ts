import express, { Request, Response } from 'express';
import { Email, EmailAccount, User } from '../models';
import { elasticClient } from '../config/elasticsearch';
import { asyncHandler } from '../middleware/errorHandler';
import { imapService, aiService, notificationService } from '../services';
import { logger } from '../utils/logger';

const router = express.Router();

// System health check
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const emailCount = await Email.countDocuments();
  const accountCount = await EmailAccount.countDocuments({ isActive: true });
  const userCount = await User.countDocuments();

  // Test Elasticsearch
  let elasticsearchStatus = 'unknown';
  try {
    const health = await elasticClient.cluster.health();
    elasticsearchStatus = health.status || 'unknown';
  } catch (error) {
    elasticsearchStatus = 'error';
  }

  // Get IMAP connection status
  const imapStatus = imapService?.getConnectionStatus() || {};

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      mongodb: {
        connected: true,
        collections: { 
          emails: emailCount, 
          accounts: accountCount, 
          users: userCount 
        }
      },
      elasticsearch: {
        status: elasticsearchStatus
      },
      imap: {
        connections: Object.keys(imapStatus).length,
        status: imapStatus
      },
      services: {
        imapService: !!imapService,
        aiService: !!aiService,
        notificationService: !!notificationService
      }
    }
  });
}));

// Setup test accounts from environment variables
router.post('/setup-accounts', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Create test user
    const testUser = await User.findOneAndUpdate(
      { email: 'test@reachinbox.com' },
      { 
        email: 'test@reachinbox.com', 
        name: 'Test User' 
      },
      { upsert: true, new: true }
    );

    const createdAccounts = [];
    const errors = [];

    // Setup Gmail Account 1
    if (process.env.GMAIL_USER_1 && process.env.GMAIL_PASS_1) {
      try {
        const account1Data = {
          userId: (testUser._id as any).toString(),
          email: process.env.GMAIL_USER_1,
          provider: 'gmail',
          imapConfig: {
            host: process.env.GMAIL_IMAP_HOST_1 || 'imap.gmail.com',
            port: parseInt(process.env.GMAIL_IMAP_PORT_1 || '993'),
            secure: true,
            user: process.env.GMAIL_USER_1,
            pass: process.env.GMAIL_PASS_1
          }
        };

        // Check if account already exists
        const existingAccount1 = await EmailAccount.findOne({ 
          email: account1Data.email,
          isActive: true 
        });

        if (!existingAccount1) {
          const account1 = await imapService.addAccount(account1Data);
          createdAccounts.push({
            email: account1.email,
            provider: account1.provider,
            status: 'created'
          });
        } else {
          createdAccounts.push({
            email: existingAccount1.email,
            provider: existingAccount1.provider,
            status: 'already_exists'
          });
        }
      } catch (error: any) {
        errors.push({ account: 'gmail_1', error: error.message });
      }
    }

    // Setup Gmail Account 2
    if (process.env.GMAIL_USER_2 && process.env.GMAIL_PASS_2) {
      try {
        const account2Data = {
          userId: (testUser._id as any).toString(),
          email: process.env.GMAIL_USER_2,
          provider: 'gmail',
          imapConfig: {
            host: process.env.GMAIL_IMAP_HOST_2 || 'imap.gmail.com',
            port: parseInt(process.env.GMAIL_IMAP_PORT_2 || '993'),
            secure: true,
            user: process.env.GMAIL_USER_2,
            pass: process.env.GMAIL_PASS_2
          }
        };

        const existingAccount2 = await EmailAccount.findOne({ 
          email: account2Data.email,
          isActive: true 
        });

        if (!existingAccount2) {
          const account2 = await imapService.addAccount(account2Data);
          createdAccounts.push({
            email: account2.email,
            provider: account2.provider,
            status: 'created'
          });
        } else {
          createdAccounts.push({
            email: existingAccount2.email,
            provider: existingAccount2.provider,
            status: 'already_exists'
          });
        }
      } catch (error: any) {
        errors.push({ account: 'gmail_2', error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Test accounts setup completed',
      data: {
        user: {
          id: testUser._id,
          email: testUser.email,
          name: testUser.name
        },
        accounts: createdAccounts,
        errors: errors
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to setup test accounts: ' + error.message
    });
  }
}));

// Generate sample emails for testing (5 categories) - FIXED folder enum issue
router.post('/sample-emails', asyncHandler(async (req: Request, res: Response) => {
  const { count = 10 } = req.body;
  
  const account = await EmailAccount.findOne({ isActive: true });
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'No active email accounts found. Please setup accounts first.'
    });
    return;
  }

  const sampleData = [
    {
      from: { address: 'john.doe@startup.com', name: 'John Doe' },
      subject: 'Very interested in your product!',
      body: 'Hi there! I saw your product demo and I am very interested. Can we schedule a call to discuss pricing and implementation?',
      category: 'interested'
    },
    {
      from: { address: 'sarah@techcorp.com', name: 'Sarah Johnson' },
      subject: 'Meeting confirmed for tomorrow',
      body: 'Hi, just confirming our meeting tomorrow at 2 PM. I have added it to my calendar and looking forward to our discussion.',
      category: 'meeting_booked'
    },
    {
      from: { address: 'mike@company.com', name: 'Mike Wilson' },
      subject: 'Not a good fit',
      body: 'Thank you for reaching out, but your solution is not suitable for our current needs. Please remove me from your mailing list.',
      category: 'not_interested'
    },
    {
      from: { address: 'noreply@marketing.com', name: 'Marketing Team' },
      subject: 'CONGRATULATIONS! You have won $1,000,000!!!',
      body: 'Claim your prize now! Limited time offer! Click here to get your million dollars today!',
      category: 'spam'
    },
    {
      from: { address: 'lisa@enterprise.com', name: 'Lisa Chen' },
      subject: 'Out of Office - Back Monday',
      body: 'Thank you for your email. I am currently out of the office and will return on Monday. I will respond to your message when I return.',
      category: 'out_of_office'
    },
    {
      from: { address: 'prospect@bigco.com', name: 'David Smith' },
      subject: 'Ready to move forward with purchase',
      body: 'We have reviewed your proposal and are ready to proceed. Please send us the contract and next steps for implementation.',
      category: 'interested'
    },
    {
      from: { address: 'calendar@zoom.us', name: 'Zoom' },
      subject: 'Meeting Reminder: Product Demo - Tomorrow 3 PM',
      body: 'This is a reminder for your upcoming Zoom meeting scheduled for tomorrow at 3:00 PM EST. Meeting ID: 123-456-789',
      category: 'meeting_booked'
    },
    {
      from: { address: 'sales@competitor.com', name: 'Competitor Sales' },
      subject: 'Limited Time Offer - 50% Off Our Premium Plan',
      body: 'Act now! Get 50% off our premium plan. This offer expires in 24 hours. Click now to claim your discount!',
      category: 'spam'
    },
    {
      from: { address: 'contact@client.com', name: 'Client Support' },
      subject: 'Thanks but we found another solution',
      body: 'Thank you for the proposal. We have decided to go with another vendor that better fits our requirements. Good luck!',
      category: 'not_interested'
    },
    {
      from: { address: 'vacation@company.org', name: 'Auto Reply' },
      subject: 'Automatic Reply: Currently on vacation',
      body: 'I am currently on vacation until next Friday. For urgent matters, please contact my colleague at colleague@company.org',
      category: 'out_of_office'
    }
  ];

  const sampleEmails = [];
  const selectedSamples = sampleData.slice(0, Math.min(count, sampleData.length));
  
  for (let i = 0; i < selectedSamples.length; i++) {
    const sample = selectedSamples[i];
    const emailData = {
      accountId: (account._id as any).toString(),
      messageId: `sample-${Date.now()}-${i}`,
      from: sample.from,
      to: [{ address: account.email }],
      subject: sample.subject,
      textBody: sample.body,
      folder: 'inbox', // FIXED: Changed from 'INBOX' to 'inbox' to match enum
      isRead: Math.random() > 0.7,
      receivedDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      aiProcessed: true,
      aiCategory: sample.category,
      aiConfidence: 0.8 + Math.random() * 0.2
    };

    const email = await Email.create(emailData);
    
    try {
      await elasticClient.index({
        index: 'emails',
        id: (email._id as any).toString(),
        body: {
          messageId: email.messageId,
          accountId: email.accountId,
          from: email.from.address,
          to: email.to.map(t => t.address).join(', '),
          subject: email.subject,
          body: email.textBody,
          folder: email.folder,
          aiCategory: email.aiCategory,
          receivedDate: email.receivedDate
        }
      });
    } catch (esError) {
      logger.error('Failed to index sample email:', esError);
    }

    sampleEmails.push({
      id: email._id,
      subject: email.subject,
      from: email.from.address,
      category: email.aiCategory,
      confidence: email.aiConfidence
    });
  }

  res.json({
    success: true,
    message: `Created ${sampleEmails.length} sample emails`,
    data: {
      account: account.email,
      emails: sampleEmails,
      categories: {
        interested: sampleEmails.filter(e => e.category === 'interested').length,
        meeting_booked: sampleEmails.filter(e => e.category === 'meeting_booked').length,
        not_interested: sampleEmails.filter(e => e.category === 'not_interested').length,
        spam: sampleEmails.filter(e => e.category === 'spam').length,
        out_of_office: sampleEmails.filter(e => e.category === 'out_of_office').length
      }
    }
  });
}));

// Test AI classification
router.post('/test-ai', asyncHandler(async (req: Request, res: Response) => {
  const { subject, body, from } = req.body;

  if (!subject || !body) {
    res.status(400).json({
      success: false,
      error: 'Subject and body are required'
    });
    return;
  }

  const testEmail = {
    subject,
    textBody: body,
    from: {
      address: from || 'test@example.com',
      name: 'Test Sender'
    }
  };

  try {
    const result = await aiService.classifyEmail(testEmail);
    
    res.json({
      success: true,
      data: {
        input: testEmail,
        classification: result
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'AI classification failed: ' + error.message
    });
  }
}));

// Test notifications
router.post('/test-notifications', asyncHandler(async (req: Request, res: Response) => {
  try {
    const testResults = await notificationService.testNotifications();
    
    res.json({
      success: true,
      message: 'Notification tests completed',
      data: testResults
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Notification test failed: ' + error.message
    });
  }
}));

// Monitor email sync progress
router.get('/sync-status', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await EmailAccount.find({ isActive: true });
  const imapStatus = imapService?.getConnectionStatus() || {};
  
  const accountsWithStatus = accounts.map(account => ({
    id: account._id,
    email: account.email,
    provider: account.provider,
    syncStatus: account.syncStatus,
    lastSyncAt: account.lastSyncAt,
    syncStats: account.syncStats,
    connectionStatus: imapStatus[(account._id as any).toString()] || { connected: false }
  }));

  res.json({
    success: true,
    data: {
      accounts: accountsWithStatus,
      summary: {
        totalAccounts: accounts.length,
        connectedAccounts: Object.values(imapStatus).filter((s: any) => s.connected).length
      }
    }
  });
}));

export default router;
