import dotenv from 'dotenv';
dotenv.config();
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginExpress from '@bugsnag/plugin-express';
import userRoutes from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import vapiRoutes from './routes/vapi.js';

// Initialize Bugsnag
Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY,
  plugins: [BugsnagPluginExpress]
});

const app = express();

// Middleware
app.use(Bugsnag.getPlugin('express').requestHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Improved CORS handling with better debugging
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN, 'https://app.agenticaller.com', 'https://app.agenticaller.com/','https://agenticaller.com/','https://agenticaller.com'] // Include with and without trailing slash
  : ['http://localhost:3000', 'http://localhost:3033'];

console.log('CORS allowed origins:', allowedOrigins); // Debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORS_ORIGIN env value:', process.env.CORS_ORIGIN);

app.use(cors({
  origin: function(origin, callback) {
    console.log('Request origin:', origin); // Log every request origin
    
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin); 
      console.log('Allowed origins:', allowedOrigins);
      // In production, temporarily allow all origins to diagnose the issue
      if (process.env.NODE_ENV === 'production') {
        console.log('Temporarily allowing all origins in production for diagnosis');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x_auth_token_sso']
}));

app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/vapi', vapiRoutes);

app.get('/api/healthy', (req, res) => {
  console.log("health check");
  res.status(200).json({ status: 'OssK' });
});

// Error handling middleware (should be last)
app.use(Bugsnag.getPlugin('express').errorHandler);
app.use(errorHandler);

// Database connection
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
} catch (err) {
  console.error('MongoDB connection error:', err);
}

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

/* // Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
}); */

// Store server in a variable for graceful shutdown
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 