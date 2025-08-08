const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/auth');
const schedulerRoutes = require('./routes/scheduler');
const uploadRoutes = require('./routes/upload');
const assetsRoutes = require('./routes/assets');
const processingRoutes = require('./routes/processing');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://168.119.110.41:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/'
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3001', 'http://168.119.110.41:3001'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/processing', processingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
