const express = require('express');
const router = express.Router();

// Mock data for processing jobs
const mockJobs = [
  { 
    id: 1, 
    name: 'Video Processing Job', 
    status: 'completed', 
    progress: 100,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date().toISOString()
  },
  { 
    id: 2, 
    name: 'Audio Processing Job', 
    status: 'in-progress', 
    progress: 45,
    startTime: new Date().toISOString(),
    endTime: null
  }
];

// Get all processing jobs
router.get('/jobs', (req, res) => {
  console.log('Fetching processing jobs...');
  res.json({ success: true, data: mockJobs });
});

// Get job by ID
router.get('/jobs/:id', (req, res) => {
  const job = mockJobs.find(j => j.id === parseInt(req.params.id));
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

module.exports = router;
