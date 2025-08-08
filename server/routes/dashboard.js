const express = require('express');
const router = express.Router();

// Mock data for dashboard
const mockDashboardData = {
  stats: {
    totalUsers: 1,
    totalSongs: 0,
    totalArtists: 0,
    totalPlays: 0
  },
  recentActivity: [
    {
      id: 1,
      action: 'User Login',
      user: 'admin',
      timestamp: new Date().toISOString()
    }
  ],
  metricsHistory: {
    labels: Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    data: Array.from({length: 7}, () => Math.floor(Math.random() * 100))
  }
};

// Dashboard stats
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: mockDashboardData.stats
  });
});

// Recent activity
router.get('/recent-activity', (req, res) => {
  res.json({
    success: true,
    data: mockDashboardData.recentActivity
  });
});

// Metrics history
router.get('/metrics-history', (req, res) => {
  res.json({
    success: true,
    data: mockDashboardData.metricsHistory
  });
});

module.exports = router;
