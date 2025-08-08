import React, { useState, useEffect } from "react";
import { Container, Typography, Paper, CircularProgress, Box } from "@mui/material";
import api from "../../utils/api";

const Scheduler = () => {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching scheduler data...");
      
      // Fetch status
      console.log("Fetching status...");
      const statusResponse = await api.get("/api/scheduler/status");
      console.log("Status response:", statusResponse.data);
      setStatus(statusResponse.data);
      
      // Fetch config
      console.log("Fetching config...");
      const configResponse = await api.get("/api/scheduler/config");
      console.log("Config response:", configResponse.data);
      setConfig(configResponse.data);
    } catch (err) {
      console.error("Error in fetchData:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setError(`Error: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scheduler
      </Typography>

      <Box sx={{ mb: 3 }}>
        <button 
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Data
        </button>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Status</Typography>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {JSON.stringify(status || "No status data available", null, 2)}
          </pre>
        </Paper>

        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Configuration</Typography>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {JSON.stringify(config || "No config data available", null, 2)}
          </pre>
        </Paper>
      </Box>
    </Container>
  );
};

export default Scheduler;
