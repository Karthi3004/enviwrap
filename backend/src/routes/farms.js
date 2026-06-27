import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listFarms, getFarm, createFarm, updateFarm, deleteFarm,
  uploadBoundaryPhotos, checkOverlap, getFarmQAQC, uploadFile,
} from '../controllers/farmController.js';

const router = express.Router();
router.use(requireAuth);

router.get('/',           listFarms);
router.get('/:id',        getFarm);
router.post('/',          createFarm);
router.put('/:id',        updateFarm);
router.delete('/:id',     requireRole('admin', 'manager'), deleteFarm);
router.post('/:id/photos', uploadBoundaryPhotos);
router.post('/check-overlap', checkOverlap);
router.get('/:id/qaqc',   getFarmQAQC);
router.post('/:farmId/upload/:fileType', uploadFile);  // NEW

export default router;