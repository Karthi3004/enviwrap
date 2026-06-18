import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listFarms, getFarm, createFarm, updateFarm, deleteFarm,
  uploadBoundaryPhotos, checkOverlap, getFarmQAQC,
} from '../controllers/farmController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', listFarms);
router.get('/:id', getFarm);
router.post('/', createFarm);
router.put('/:id', updateFarm);
router.delete('/:id', requireRole('admin', 'manager'), deleteFarm);

// Field boundary helpers
router.post('/:id/photos', uploadBoundaryPhotos);
router.post('/check-overlap', checkOverlap);

// QA/QC for a specific farm
router.get('/:id/qaqc', getFarmQAQC);

export default router;
