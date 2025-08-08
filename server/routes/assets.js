const express = require('express');
const router = express.Router();

// Mock data for assets
const mockAssets = [
  { id: 1, name: 'Asset 1', type: 'image', size: '2.5 MB', status: 'processed' },
  { id: 2, name: 'Asset 2', type: 'video', size: '150 MB', status: 'processing' },
  { id: 3, name: 'Asset 3', type: 'audio', size: '45 MB', status: 'pending' }
];

// Get all assets
router.get('/', (req, res) => {
  console.log('Fetching assets...');
  res.json({ success: true, data: mockAssets });
});

// Get asset by ID
router.get('/:id', (req, res) => {
  const asset = mockAssets.find(a => a.id === parseInt(req.params.id));
  if (!asset) {
    return res.status(404).json({ success: false, error: 'Asset not found' });
  }
  res.json({ success: true, data: asset });
});

module.exports = router;
