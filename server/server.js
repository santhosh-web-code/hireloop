import './utils/loadEnv.js';
import checkEnv from './utils/checkEnv.js';
checkEnv();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import tpoRoutes from './routes/tpoRoutes.js';
import jdRoutes from './routes/jdRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import mockInterviewRoutes from './routes/mockInterviewRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tpo', tpoRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/mock-interview', mockInterviewRoutes);
app.use('/api/assessment', assessmentRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
