import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listControlSites, getControlSite, createControlSite } from '../controllers/controlSiteController.js';
const router = express.Router();
router.use(requireAuth);
router.get('/', listControlSites);
router.get('/:id', getControlSite);
router.post('/', createControlSite);
export default router;
