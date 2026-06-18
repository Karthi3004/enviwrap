import express from 'express';
import { login, logout, getMe, refreshToken } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.post('/refresh', refreshToken);
router.get('/me', requireAuth, getMe);

export default router;
