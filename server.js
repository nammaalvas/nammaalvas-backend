import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import connectDB from './config/db.js';
import { seedAdminUsers } from './config/seedAdmin.js';
import { setupSwagger } from './config/swagger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route Imports
import healthRoutes from './routes/healthRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { verifyEmailSetup } from './helpers/emailHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

// Connect to Database, Seed Admin Users, and Verify SMTP Email Setup
connectDB().then(() => {
  seedAdminUsers();
  verifyEmailSetup();
});

const app = express();
app.set('trust proxy', 1);

// Security and Optimization Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// CORS configuration allowing nammaalvas.org and configured frontend URL
const allowedOrigins = [
  'https://nammaalvas.org',
  'https://www.nammaalvas.org',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Apply generic rate limiter to all routes
app.use('/api', apiLimiter);

// Setup Swagger Documentation
setupSwagger(app);

// Mount API Routes
app.use('/api/health', healthRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// Static frontend distribution path
const frontendDistPath = process.env.FRONTEND_DIST_PATH 
  ? path.resolve(process.env.FRONTEND_DIST_PATH)
  : fs.existsSync(path.resolve(__dirname, './public_dist'))
    ? path.resolve(__dirname, './public_dist')
    : path.resolve(__dirname, '../Aiet-Verse-Frontend/dist');

// Serve static frontend assets if available
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // Single-Page Application (SPA) routing fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🛰️  Backend system active in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});