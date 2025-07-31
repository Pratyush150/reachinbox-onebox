import express, { Request, Response } from 'express';
import { Email, EmailAccount, User } from '../models';
import { elasticClient } from '../config/elasticsearch';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.get('/db', asyncHandler(async (req: Request, res: Response) => {
  const emailCount = await Email.countDocuments();
  const accountCount = await EmailAccount.countDocuments();
  const userCount = await User.countDocuments();

  res.json({
    success: true,
    data: {
      mongodb: {
        connected: true,
        collections: { emails: emailCount, accounts: accountCount, users: userCount }
      }
    }
  });
}));

router.get('/elasticsearch', asyncHandler(async (req: Request, res: Response) => {
  const health = await elasticClient.cluster.health();
  
  res.json({
    success: true,
    data: { elasticsearch: { status: health.status } }
  });
}));

router.post('/sample-data', asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOneAndUpdate(
    { email: 'test@example.com' },
    { email: 'test@example.com', name: 'Test User' },
    { upsert: true, new: true }
  );

  const account = await EmailAccount.findOneAndUpdate(
    { email: 'test@gmail.com' },
    {
      userId: user._id,
      email: 'test@gmail.com',
      provider: 'gmail',
      imapConfig: {
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        user: 'test@gmail.com',
        pass: 'password'
      }
    },
    { upsert: true, new: true }
  );

  const sampleEmails = [
    {
      accountId: account._id,
      messageId: 'msg-1-' + Date.now(),
      from: { address: 'prospect@startup.com', name: 'John Doe' },
      to: [{ address: 'test@gmail.com' }],
      subject: 'Interested in your product',
      textBody: 'Hi, I saw your product and I am very interested!',
      folder: 'INBOX',
      isRead: false,
      receivedDate: new Date(),
      aiCategory: 'interested',
      aiConfidence: 0.9
    }
  ];

  const emails = await Email.insertMany(sampleEmails);

  res.json({
    success: true,
    message: 'Sample data created',
    data: { user: user.email, account: account.email, emails: emails.length }
  });
}));

export default router;
