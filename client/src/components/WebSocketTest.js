import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

const WebSocketTest = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data) => {
      setMessages(prev => [...prev, data]);
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.emit('message', { text: input, from: 'user' });
      setInput('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>WebSocket Test</h2>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: '5px 0' }}>
            <strong>{msg.from}:</strong> {msg.text} <em>({new Date().toLocaleTimeString()})</em>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebSocketTest;
