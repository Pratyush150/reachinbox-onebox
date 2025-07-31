import express, { Request, Response } from 'express';
import { EmailAccount } from '../models';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await EmailAccount.find({ isActive: true });
  res.json({ success: true, data: accounts });
}));

export const accountRouter = router;
