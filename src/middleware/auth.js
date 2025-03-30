import { OAuth2Client } from 'google-auth-library';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from './errorHandler.js';
import jwt from 'jsonwebtoken';

// In-memory store for tracking IP requests
// Structure: { ip: { count: number, resetTime: timestamp } }
const ipRequestTracker = new Map();

// Rate limit values
const MAX_REQUESTS = 10;  // Maximum requests per IP
const WINDOW_MS = 60 * 60 * 1000;  // Reset window (1 hour in milliseconds)

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
  
  // Check if IP is in the tracker
  if (!ipRequestTracker.has(ip)) {
    // First request from this IP
    ipRequestTracker.set(ip, {
      count: 1,
      resetTime: Date.now() + WINDOW_MS
    });
    req.ipRequestCount = 1;
  } else {
    const tracker = ipRequestTracker.get(ip);
    
    // Check if the reset time has passed
    if (Date.now() > tracker.resetTime) {
      // Reset the counter
      ipRequestTracker.set(ip, {
        count: 1,
        resetTime: Date.now() + WINDOW_MS
      });
      req.ipRequestCount = 1;
    } else {
      // Increment the counter
      if (tracker.count >= MAX_REQUESTS) {
        // Rate limit exceeded
        req.ipRequestCount = tracker.count;
        throw new AppError('Rate limit exceeded. Try again later.', 429);
      }
      
      // Update counter
      tracker.count += 1;
      ipRequestTracker.set(ip, tracker);
      req.ipRequestCount = tracker.count;
      req.maxQuotaReached = tracker.count >= MAX_REQUESTS;
    }
  }

  next();
});

// Cleanup function to prevent memory leaks (can be called periodically)
export const cleanupIpTracker = () => {
  const now = Date.now();
  for (const [ip, data] of ipRequestTracker.entries()) {
    if (now > data.resetTime) {
      ipRequestTracker.delete(ip);
    }
  }
};