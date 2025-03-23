import { OAuth2Client } from 'google-auth-library';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from './errorHandler.js';
import jwt from 'jsonwebtoken';


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