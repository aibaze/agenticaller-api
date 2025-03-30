import express from 'express';
import { googleLogin, logout, getMe, checkSSOToken, googleLogout } from '../controllers/auth.js';
import { verifyGoogleToken,verifyIPRequestCount } from '../middleware/auth.js';

const router = express.Router();

router.post('/google/login', googleLogin);
router.post('/google/logout', googleLogout);
router.get('/logout', logout);
router.get('/me', verifyGoogleToken, getMe);
router.post('/check-sso-token', checkSSOToken);

router.get('/verify-ip-request', verifyIPRequestCount, (req, res, next) => {
    res.status(200).json({
        message: 'IP request verified',
        ip: req.ip,
        count: req.ipRequestCount,
        maxQuotaReached: req.maxQuotaReached
    });
});

export default router; 