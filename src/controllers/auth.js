import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyGoogleTokenAndGetPayload, createToken, setTokenCookie } from '../utils/auth.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    const googlePayload = await verifyGoogleTokenAndGetPayload(token);
    // Create our JWT
    const jwtToken = createToken({ email: googlePayload.email });

    const user = await User.findOne({ email: googlePayload.email });

    if (!user) {
      user = await User.create({ 
        email: googlePayload.email ,
        name: googlePayload.name,
        image: googlePayload.picture,
        role: 'user'
      });
    }


    // Set both tokens in cookies
    setTokenCookie(res, jwtToken, token);
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const logout = asyncHandler(async (req, res) => {
  res.cookie('x_auth_token_sso', 'logged_out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ status: 'success' });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    user: req.user
  });
});

export const checkSSOToken = async (req, res, next) => {
  try {
    const token = req.cookies.x_auth_token_sso;
    
    if (!token || token === 'logged_out') {
      throw new AppError('No SSO token found in cookies', 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    // Verify our JWT token instead of using Google verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({
      status: 'success',
      data: {
        email: decoded.email
      }
    });

  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
}; 