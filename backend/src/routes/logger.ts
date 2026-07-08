import { Router, Response } from 'express';

const router = Router();

router.post('/', (req, res: Response) => {
  console.log('\n\n🚨🚨🚨 FRONTEND ERROR CAPTURED 🚨🚨🚨');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Error Details:', JSON.stringify(req.body, null, 2));
  console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n\n');
  res.status(200).json({ received: true });
});

export default router;
