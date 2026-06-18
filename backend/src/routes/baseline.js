import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listBaselineRecords, getBaselineRecord, upsertBaselineRecord, attestBaseline,
} from '../controllers/baselineController.js';

const router = express.Router();
router.use(requireAuth);
router.get('/farm/:farmId', listBaselineRecords);
router.get('/:id', getBaselineRecord);
router.post('/', upsertBaselineRecord);
router.post('/:id/attest', attestBaseline);

export default router;
