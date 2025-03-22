import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const createToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET is not configured in environment variables', 500);
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

export const setTokenCookie = (res, token, googleToken) => {
  console.log("setTokenCookie starting with NODE_ENV:", process.env.NODE_ENV);
  const expiresIn = parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 90; // default 90 days

  // For cross-site cookies in modern browsers, we need proper settings
  const cookieOptions = {
    expires: new Date(
      Date.now() + expiresIn * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // Remove the leading dot which is causing issues in some browsers
    domain:'.agenticaller.com',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'  // Ensure cookie is available across the entire site
  };

  // Ensure secure is true when sameSite is 'none'
  if (cookieOptions.sameSite === 'none') {
    cookieOptions.secure = true;
  }

  // Set our JWT token
  console.log("Setting cookie with options:", JSON.stringify(cookieOptions));
  res.cookie('x_auth_token_sso', token, cookieOptions);
  
  // Set Google token with shorter expiration (1 hour)
  const googleCookieOptions = {
    ...cookieOptions,
    expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };
  
  res.cookie('google_token', googleToken, googleCookieOptions);
  
  // Log response headers to verify cookies are being set
  console.log("Response headers:", res.getHeaders ? res.getHeaders() : "Headers not available");
};

export const verifyGoogleTokenAndGetPayload = async (token) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    return ticket.getPayload();
    console.log("OK")
  } catch (error) {
    console.log("error",error.message)
    throw new AppError('Failed to verify Google token', 401);
  }
}; 