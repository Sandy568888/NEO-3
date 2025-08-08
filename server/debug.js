// Enable all debug logs
process.env.DEBUG = 'express:*,socket.io:*,*';
require('dotenv').config();

console.log('Starting server with debug logging...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3000);

try {
  // Load the main server
  require('./index');
  console.log('Server started successfully');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
