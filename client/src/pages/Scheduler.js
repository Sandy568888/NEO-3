import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, CircularProgress, Box } from '@mui/material';
import api from '../utils/api';

const Scheduler = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await api.get('/api/scheduler');
        setSchedules(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching schedules:', err);
        setError('Failed to load schedules');
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scheduler
      </Typography>
      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Scheduled Tasks
        </Typography>
        {schedules.length > 0 ? (
          <pre>{JSON.stringify(schedules, null, 2)}</pre>
        ) : (
          <Typography>No scheduled tasks found.</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Scheduler;
