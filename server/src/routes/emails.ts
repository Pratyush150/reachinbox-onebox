import express, { Request, Response } from 'express';
import { Email } from '../models';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  
  const emails = await Email
    .find()
    .sort({ receivedDate: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Email.countDocuments();

  res.json({
    success: true,
    data: { emails, total, page: Number(page), limit: Number(limit) }
  });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const email = await Email.findById(req.params.id);
  
  if (!email) {
    res.status(404).json({ success: false, error: 'Email not found' });
    return;
  }

  res.json({ success: true, data: email });
}));

export default router;
