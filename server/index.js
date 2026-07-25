// Backend server API 

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');

dotenv.config({
  path: path.resolve(__dirname, '.env')
});

const { testConnection } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimit');
const scoringService = require('./services/scoringService');
const RefreshToken = require('./models/RefreshToken');
const { scrapeOccupancy, scrapeSchedules } = require('./services/libraryScraper');

const app = express();
const PORT = process.env.PORT; 

// HTTP: Express Server with socket.io attached for web socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});
app.set('io', io); // req.app.get('io')

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', apiLimiter); // rate limiting
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/spots', require('./routes/spotRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// Health check (debugging)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io log (debugging)
io.on('connection', (socket) => {
  console.log(`[WEB SOCKET] User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WEB SOCKET] User disconnected: ${socket.id}`);
  });
});

// CRON: Update scores every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try { 
    const result = await scoringService.recalculateAllScores(io);
    console.log(`[CRON] Scores updated for ${result.spotsUpdated} spots at ${result.time}`);
  } catch (error) {
    console.error('[CRON] Score recalculation failed:', error.message);
  }
});

// CRON: Clear expired tokens every hour
cron.schedule('0 * * * *', async () => {
  try {
    const deleted = await RefreshToken.deleteExpired();
    if (deleted > 0) console.log(`[CRON] Cleared ${deleted} expired refresh tokens`);
  } catch (error) {
    console.error('[CRON] Token cleanup failed:', error.message);
  }
});

// CRON: Scrape library occupancy every hour
cron.schedule('0 * * * *', async () => {
  try {
    await scrapeOccupancy();
  } catch (error) {
    console.error('[CRON] Occupancy scrape failed:', error.message);
  }
});

// CRON: Scrape library schedules and closures daily at 6am (might change)
cron.schedule('0 6 * * *', async () => {
  try {
    await scrapeSchedules();
  } catch (error) {
    console.error('[CRON] Schedule scrape failed:', error.message);
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
    const result = await scoringService.recalculateAllScores(io);
    console.log(`Initial scores calculated for ${result.spotsUpdated} spots`);
  } catch (error) {
    console.error('Initial score calculation failed:', error.message);
  }

  server.listen(PORT, () => {
    console.log(`NUSpaces API (with socket.io) running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}
module.exports = app;