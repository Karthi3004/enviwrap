import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import farmRoutes from './routes/farms.js';
import baselineRoutes from './routes/baseline.js';
import socRoutes from './routes/soc.js';
import monitoringRoutes from './routes/monitoring.js';
import controlSiteRoutes from './routes/controlSites.js';
import verificationRoutes from './routes/verification.js';
import qaqcRoutes from './routes/qaqc.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/baseline', baselineRoutes);
app.use('/api/soc', socRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/control-sites', controlSiteRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/qaqc', qaqcRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => console.log(`Enviwrap API running on port ${PORT}`));

export default app;
