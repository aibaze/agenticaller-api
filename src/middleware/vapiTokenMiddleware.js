import generateJWT from '../utils/jwtGenerator.js';
import { decrypt } from '../utils/encryption.js';
import User from '../models/User.js';

// In-memory cache using a Map
const tokenCache = new Map();

/**
 * Cache a token for a given user email.
 * @param {string} email - User's email address.
 * @param {string} token - The JWT token.
 * @param {number} ttlSeconds - Time-to-live for the token in seconds.
 */
function cacheToken(email, token, ttlSeconds) {
  const expiry = Date.now() + ttlSeconds * 1000;
  tokenCache.set(email, { token, expiry });
}

/**
 * Retrieve a cached token if it exists and hasn't expired.
 * @param {string} email - User's email address.
 * @returns {string|null} - The valid token or null if expired/not found.
 */
function getCachedToken(email) {
  const cached = tokenCache.get(email);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    tokenCache.delete(email);
    return null;
  }
  return cached.token;
}

const vapiTokenMiddleware = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }

    let token = getCachedToken(userEmail);
    
    if (!token) {
      // Fetch user from database
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        throw new Error('User not found in database');
      }

      // Check if user has required VAPI properties
      if (!user.vapiKey || !user.vapiOrgId) {
        throw new Error('User missing required VAPI credentials');
      }
      req.userKey = user.vapiKey;


      // Decrypt the VAPI key
      const privateKey = decrypt(user.vapiKey);

      const payload = {
        orgId: user.vapiOrgId,
        email: userEmail,
        iat: Math.floor(Date.now() / 1000),
      };
      
      const options = {
        expiresIn: '1h',
        algorithm: 'HS256',
      };

      token = generateJWT(payload, privateKey, options);
      cacheToken(userEmail, token, 3600); // Cache for 60 minutes
    }
    req.vapiToken = token;
    next();
  } catch (error) {
    console.error('Token generation failed:', error.message,user);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

export default vapiTokenMiddleware; 