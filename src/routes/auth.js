import express from 'express';
import { googleLogin, logout, getMe, checkSSOToken } from '../controllers/auth.js';
import { verifyGoogleToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/google/login', googleLogin);
router.get('/logout', logout);
router.get('/me', verifyGoogleToken, getMe);
router.post('/check-sso-token', checkSSOToken);

export default router; 