const express = require('express');
const router = express.Router();

// Scheduler status endpoint
router.get('/status', (req, res) => {
  console.log('Scheduler status requested');
  res.json({
    success: true,
    status: 'idle',
    lastRun: new Date().toISOString(),
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// Scheduler config endpoint
router.get('/config', (req, res) => {
  console.log('Scheduler config requested');
  res.json({
    success: true,
    config: {
      interval: 3600,
      enabled: true,
      maxParallelTasks: 5,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router;
