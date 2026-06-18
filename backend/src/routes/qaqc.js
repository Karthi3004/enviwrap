import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runFarmQAQC, listAllFlags, resolveFlag } from '../controllers/qaqcController.js';
const router = express.Router();
router.use(requireAuth);
router.post('/run/:farmId', runFarmQAQC);
router.get('/flags', listAllFlags);
router.patch('/flags/:id/resolve', resolveFlag);
export default router;
