import { OAuth2Client } from 'google-auth-library';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from './errorHandler.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = asyncHandler(async (req, res, next) => {
  // Get token from header or cookie
  const token = req.header('x_auth_token_sso') || req.cookies.x_auth_token_sso;

  if (!token) {
    throw new AppError('No authentication token provided', 401);
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Add user data to request
    req.user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub
    };

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