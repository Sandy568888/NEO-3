const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// For testing purposes - simple user object
const testUser = {
  id: 1,
  username: 'admin',
  password: 'password', // Plain text for testing
  email: 'admin@example.com'
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password }); // Debug log

    // Simple check for testing
    if (username === testUser.username && password === testUser.password) {
      console.log('Login successful for user:', username);
      
      // Create JWT token
      const token = jwt.sign(
        { userId: testUser.id, username: testUser.username },
        'your_jwt_secret', // In production, use process.env.JWT_SECRET
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        user: {
          id: testUser.id,
          username: testUser.username,
          email: testUser.email
        }
      });
    }

    console.log('Invalid credentials for user:', username);
    return res.status(401).json({ message: 'Invalid credentials' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, 'your_jwt_secret');
    
    // Return user data (in production, fetch from database)
    res.json({ 
      id: testUser.id,
      username: testUser.username,
      email: testUser.email
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

module.exports = router;
