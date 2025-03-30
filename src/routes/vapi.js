import express from 'express';
import { getCalls, getAssistants ,getPhoneNumbers} from '../controllers/vapi.js';
import vapiTokenMiddleware from '../middleware/vapiTokenMiddleware.js';

import {verifyGoogleToken} from '../middleware/auth.js'

const router = express.Router();


router.get('/calls',verifyGoogleToken,vapiTokenMiddleware, getCalls);
router.get('/assistants',verifyGoogleToken,vapiTokenMiddleware, getAssistants);
router.get('/phone-numbers',verifyGoogleToken,vapiTokenMiddleware, getPhoneNumbers);

export default router; 