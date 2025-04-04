import { OAuth2Client } from 'google-auth-library';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from './errorHandler.js';
import jwt from 'jsonwebtoken';
import IpTracker from '../models/IpTracker.js';

// Rate limit values
const MAX_REQUESTS = 10;  // Maximum requests per IP
const WINDOW_MS = 24 * 60 * 60 * 1000;  // Reset window (1 day in milliseconds)

export const verifyGoogleToken = asyncHandler(async (req, res, next) => {
  // Get token from header or cookie
  const token = req.header('x_auth_token_sso') || req.cookies.x_auth_token_sso;

  if (!token) {
    throw new AppError('No authentication token provided', 401);
  }

  try {
    // Replace Google verification with JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user data to request
    req.user = decoded;

    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
});

// Optional: Middleware to check specific roles or permissions
export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
}; 

export const verifyIPRequestCount = asyncHandler(async (req, res, next) => {
  // Get the client's IP address
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Calculate the reset time for new entries
  const resetTime = new Date(Date.now() + WINDOW_MS);
  
  // Try to find an existing record for this IP
  let ipTracker = await IpTracker.findOne({ ip });
  
  if (!ipTracker) {
    // First request from this IP - create a new record
    ipTracker = await IpTracker.create({
      ip,
      count: 1,
      resetTime
    });
    req.ipRequestCount = 1;
  } else {
    // Check if the reset time has passed
    if (Date.now() > ipTracker.resetTime) {
      // Reset the counter
      ipTracker.count = 1;
      ipTracker.resetTime = resetTime;
      await ipTracker.save();
      req.ipRequestCount = 1;
    } else {
      // Increment the counter
      if (ipTracker.count >= MAX_REQUESTS) {
        // Rate limit exceeded
        req.ipRequestCount = ipTracker.count;
        throw new AppError('Rate limit exceeded.', 429);
      }
      
      // Update counter
      ipTracker.count += 1;
      await ipTracker.save();
      req.ipRequestCount = ipTracker.count;
      req.maxQuotaReached = ipTracker.count >= MAX_REQUESTS;
    }
  }

  next();
});

// Cleanup function to prevent database bloat (can be scheduled to run periodically)
export const cleanupIpTracker = async () => {
  try {
    console.log('Running IP tracker cleanup job at:', new Date().toISOString());
    
    const now = new Date();
    
    // Find expired IP trackers
    const expiredTrackers = await IpTracker.find({ resetTime: { $lt: now } });
    console.log(`Found ${expiredTrackers.length} expired IP trackers to clean up`);
    
    // Delete expired IP trackers
    if (expiredTrackers.length > 0) {
      const result = await IpTracker.deleteMany({ resetTime: { $lt: now } });
      console.log(`Deleted ${result.deletedCount} expired IP trackers`);
    }
    
    // Get statistics on remaining IP trackers
    const activeTrackers = await IpTracker.find({});
    console.log(`${activeTrackers.length} active IP trackers remain in the database`);
    
    // Optional: perform additional maintenance as needed
    
    return {
      deleted: expiredTrackers.length,
      remaining: activeTrackers.length
    };
  } catch (error) {
    console.error('Error cleaning up IP trackers:', error);
    return {
      error: error.message
    };
  }
};