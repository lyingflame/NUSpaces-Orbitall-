// Backend server API 

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const { testConnection } = require('./config/database');
const scoringService = require('./services/scoringService');

const app = express();
const PORT = process.env.PORT; 

// Security stuff
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/spots', require('./routes/spotRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

// Health check (debugging)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Schedule to update scores every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try { //update scores
    const result = await scoringService.recalculateAllScores();
    console.log(`[CRON] Scores updated for ${result.spotsUpdated} spots at ${result.time}`);
  } catch (error) {
    console.error('[CRON] Score recalculation failed:', error.message);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

async function startServer() {
  await testConnection();

  // Run score calculation on startup
  try {
    const result = await scoringService.recalculateAllScores();
    console.log(`Initial scores calculated for ${result.spotsUpdated} spots`);
  } catch (error) {
    console.error('Initial score calculation failed:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`NUSpaces API running on http://localhost:${PORT}`);
  });
}

startServer();
