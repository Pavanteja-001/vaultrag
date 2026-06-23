require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());

// Capture raw body for webhook HMAC verification BEFORE json parsing
app.use('/api/webhooks', (req, res, next) => {
  let data = Buffer.alloc(0);
  req.on('data', (chunk) => { data = Buffer.concat([data, chunk]); });
  req.on('end', () => {
    req.rawBody = data.toString('utf-8');
    next();
  });
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/query', require('./routes/query'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/scope', require('./routes/scope'));
app.use('/api/todos', require('./routes/todos'));
app.use('/api/audit-logs', require('./routes/audit'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/sync-status', require('./routes/syncStatus'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 VaultRAG server running on port ${PORT}`);
  });
};

start();
