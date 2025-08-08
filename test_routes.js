const express = require('express');
const app = express();

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// Scheduler routes
const schedulerRouter = require('./server/routes/scheduler');
app.use('/api/scheduler', schedulerRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nTest server running on port ${PORT}`);
  console.log(`Test route: http://localhost:${PORT}/test`);
  console.log(`Scheduler status: http://localhost:${PORT}/api/scheduler/status`);
  console.log(`Scheduler config: http://localhost:${PORT}/api/scheduler/config\n`);
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});
