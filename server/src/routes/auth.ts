import express from 'express';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Auth service working' });
});

export const authRouter = router;
