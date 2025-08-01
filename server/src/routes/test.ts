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

// Generate enhanced sample emails for testing - ENHANCED with better spam and sales data
router.post('/sample-emails', asyncHandler(async (req: Request, res: Response) => {
  const { count = 15 } = req.body;
  
  const account = await EmailAccount.findOne({ isActive: true });
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'No active email accounts found. Please setup accounts first.'
    });
    return;
  }

  const enhancedSampleData = [
    // High Intent Interested Emails
    {
      from: { address: 'ceo@techstartup.com', name: 'John Williams' },
      subject: 'Budget approved - Ready to purchase your solution',
      body: 'Hi there! Great news - our board has approved the budget for your solution. We have $50k allocated and need to implement by Q4. Can we schedule a call this week to discuss contract terms? Our team of 25 developers is excited to get started.',
      category: 'interested'
    },
    {
      from: { address: 'procurement@enterprise.com', name: 'Sarah Chen' },
      subject: 'Urgent: Need pricing for 100 licenses by Friday',
      body: 'Hello, we are in the final stages of vendor selection and need your pricing for 100 licenses ASAP. Timeline is critical - we need to sign by end of week. Please include enterprise support and training costs.',
      category: 'interested'
    },
    {
      from: { address: 'david@fastgrowth.io', name: 'David Rodriguez' },
      subject: 'Demo was impressive - next steps?',
      body: 'Thank you for the excellent demo yesterday. Our technical team was very impressed with the API capabilities. What are the next steps to move forward? We are comparing 3 vendors and you are our top choice.',
      category: 'interested'
    },
    
    // Meeting Booked Emails
    {
      from: { address: 'calendar@zoom.us', name: 'Zoom Meetings' },
      subject: 'Meeting Reminder: Enterprise Sales Call - Tomorrow 2 PM',
      body: 'This is a reminder for your upcoming meeting: Enterprise Sales Discovery Call scheduled for tomorrow at 2:00 PM EST. Meeting ID: 987-654-321. The prospect has confirmed attendance.',
      category: 'meeting_booked'
    },
    {
      from: { address: 'lisa@bigcorp.com', name: 'Lisa Thompson' },
      subject: 'Confirming our meeting tomorrow at 3 PM',
      body: 'Hi, just confirming our scheduled call tomorrow at 3 PM EST. I will have our CTO and procurement team on the call. Looking forward to discussing the technical implementation details.',
      category: 'meeting_booked'
    },
    
    // Not Interested Emails
    {
      from: { address: 'mike@company.com', name: 'Mike Johnson' },
      subject: 'Re: Partnership proposal - Not interested',
      body: 'Thank you for reaching out, but we have decided to go with a different solution. Your pricing is outside our budget range. Please remove me from your mailing list.',
      category: 'not_interested'
    },
    {
      from: { address: 'admin@corporate.com', name: 'IT Admin' },
      subject: 'Unsubscribe - Stop sending emails',
      body: 'We are not interested in your services. Please remove our domain from all your marketing lists immediately. We have found an internal solution.',
      category: 'not_interested'
    },
    
    // Enhanced Spam Emails
    {
      from: { address: 'winner@mega-lottery.com', name: 'Lottery Commission' },
      subject: '🎉 CONGRATULATIONS! You won $5,000,000 in our international lottery!',
      body: 'URGENT NOTICE: Your email has been randomly selected in our international lottery draw! You have won FIVE MILLION DOLLARS ($5,000,000.00)! To claim your prize, reply immediately with your full name, address, and bank details. This offer expires in 24 hours! Act now before someone else claims your prize!',
      category: 'spam'
    },
    {
      from: { address: 'offers@super-deals.net', name: 'Mega Deals Alert' },
      subject: '🔥 LIMITED TIME: 99% OFF Everything + FREE iPhone 15!',
      body: 'FLASH SALE ALERT! For the next 2 hours only, get 99% OFF everything in our store PLUS a FREE iPhone 15 with any purchase! Over 10,000 products available. Click here NOW before this incredible deal expires forever! FREE worldwide shipping!',
      category: 'spam'
    },
    {
      from: { address: 'crypto-millionaire@richfast.biz', name: 'Crypto Expert' },
      subject: 'Make $10,000 per day with this simple crypto trick!',
      body: 'I made $2.5 million last month using this ONE WEIRD CRYPTO TRICK that banks don\'t want you to know! Join 50,000+ people already making money. Click here for instant access to my secret system. Warning: Only 100 spots left!',
      category: 'spam'
    },
    {
      from: { address: 'pharmacy@cheap-meds.ru', name: 'Online Pharmacy' },
      subject: 'Save 90% on prescription drugs - No prescription needed!',
      body: 'Get all your medications at 90% discount! No prescription required. Worldwide shipping. FDA approved generics. Order now and save thousands! Click here for instant access to our pharmacy.',
      category: 'spam'
    },
    
    // Out of Office Emails
    {
      from: { address: 'vacation@company.org', name: 'Lisa Martinez' },
      subject: 'Out of Office: Returning Monday, November 4th',
      body: 'Thank you for your email. I am currently out of the office on vacation and will return on Monday, November 4th. For urgent matters, please contact my colleague Sarah at sarah@company.org. I will respond to your message upon my return.',
      category: 'out_of_office'
    }
