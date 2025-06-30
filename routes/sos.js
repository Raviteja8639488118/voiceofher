const express = require('express');
const { body, validationResult } = require('express-validator');
const SOSAlert = require('../models/SOSAlert');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = accountSid && authToken ? new twilio(accountSid, authToken) : null;

const router = express.Router();

// Validation rules
const createAlertValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('emergencyType')
    .optional()
    .isIn(['harassment', 'assault', 'medical', 'accident', 'other'])
    .withMessage('Invalid emergency type')
];

// Create SOS alert
router.post('/create', authenticateToken, createAlertValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { latitude, longitude, address, description, emergencyType } = req.body;
    const user = req.user;

    // Create new SOS alert
    const sosAlert = new SOSAlert({
      userId: user._id,
      userAadhar: user.aadhar,
      userName: user.name || 'Anonymous',
      userPhone: user.phone,
      location: {
        latitude,
        longitude,
        address: address || ''
      },
      description: description || '',
      emergencyType: emergencyType || 'other'
    });

    await sosAlert.save();

    // TODO: Send notifications to emergency contacts
    // TODO: Send SMS/email alerts
    // TODO: Notify nearby users or authorities

    res.status(201).json({
      message: 'SOS alert created successfully',
      alert: sosAlert.getSummary()
    });

  } catch (error) {
    console.error('SOS creation error:', error);
    res.status(500).json({ error: 'Failed to create SOS alert' });
  }
});

// Get all active SOS alerts (for emergency response)
router.get('/active', async (req, res) => {
  try {
    const activeAlerts = await SOSAlert.getActiveAlerts();
    
    res.json({
      alerts: activeAlerts.map(alert => alert.getSummary()),
      count: activeAlerts.length
    });

  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ error: 'Failed to get active alerts' });
  }
});

// Get user's SOS alerts
router.get('/my-alerts', authenticateToken, async (req, res) => {
  try {
    const userAlerts = await SOSAlert.getUserAlerts(req.user._id);
    
    res.json({
      alerts: userAlerts.map(alert => alert.getSummary()),
      count: userAlerts.length
    });

  } catch (error) {
    console.error('Get user alerts error:', error);
    res.status(500).json({ error: 'Failed to get user alerts' });
  }
});

// Get specific SOS alert
router.get('/:alertId', async (req, res) => {
  try {
    const alert = await SOSAlert.findById(req.params.alertId)
      .populate('userId', 'name phone aadhar')
      .populate('resolvedBy', 'name phone');

    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    res.json({ alert });

  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: 'Failed to get alert' });
  }
});

// Update SOS alert status
router.put('/:alertId/status', authenticateToken, [
  body('status')
    .isIn(['active', 'resolved', 'false_alarm'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { status, resolutionNotes } = req.body;
    const alert = await SOSAlert.findById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    // Only allow status updates for active alerts
    if (alert.status !== 'active') {
      return res.status(400).json({ error: 'Can only update active alerts' });
    }

    alert.status = status;
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.user._id;
    }

    await alert.save();

    res.json({
      message: 'Alert status updated successfully',
      alert: alert.getSummary()
    });

  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

// Add emergency contact response
router.post('/:alertId/contact-response', [
  body('contactPhone').notEmpty().withMessage('Contact phone is required'),
  body('response').isIn(['acknowledged', 'responding', 'unreachable']).withMessage('Invalid response')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { contactPhone, response } = req.body;
    const alert = await SOSAlert.findById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    // Find and update the contact response
    const contact = alert.notifiedContacts.find(c => c.phone === contactPhone);
    if (contact) {
      contact.response = response;
      contact.notifiedAt = new Date();
    } else {
      alert.notifiedContacts.push({
        phone: contactPhone,
        response,
        notifiedAt: new Date()
      });
    }

    await alert.save();

    res.json({
      message: 'Contact response recorded successfully',
      alert: alert.getSummary()
    });

  } catch (error) {
    console.error('Contact response error:', error);
    res.status(500).json({ error: 'Failed to record contact response' });
  }
});

// Get nearby alerts (for emergency response)
router.get('/nearby/:latitude/:longitude/:radius', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.params;
    const radiusInMeters = parseFloat(radius) * 1000; // Convert km to meters

    const nearbyAlerts = await SOSAlert.find({
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).populate('userId', 'name phone aadhar');

    res.json({
      alerts: nearbyAlerts.map(alert => alert.getSummary()),
      count: nearbyAlerts.length
    });

  } catch (error) {
    console.error('Get nearby alerts error:', error);
    res.status(500).json({ error: 'Failed to get nearby alerts' });
  }
});

// Emergency contact notification endpoint
router.post('/:alertId/notify-contacts', authenticateToken, async (req, res) => {
  try {
    const alert = await SOSAlert.findById(req.params.alertId)
      .populate('userId');

    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    // Fix: Compare user IDs correctly whether populated or not
    const alertUserId = alert.userId._id ? alert.userId._id.toString() : alert.userId.toString();
    if (alertUserId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to notify contacts for this alert' });
    }

    // New notification logic (Twilio, all users except sender)
    const allUsers = await User.find({ isActive: true, _id: { $ne: req.user._id } });

    const notificationResults = [];
    const alertLocation = alert.location && alert.location.latitude && alert.location.longitude
      ? `https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`
      : 'Location not available';

    for (const userDoc of allUsers) {
      let status = 'sent';
      let errorMsg = '';
      try {
        if (twilioClient) {
          await twilioClient.messages.create({
            body: `EMERGENCY: ${req.user.name || 'A user'} (${req.user.phone}) is in danger! Please help. Location: ${alertLocation}`,
            from: twilioPhone,
            to: userDoc.phone
          });
        } else {
          status = 'failed';
          errorMsg = 'Twilio not configured';
        }
      } catch (err) {
        status = 'failed';
        errorMsg = err.message;
        console.error('Failed to send SMS to', userDoc.phone, err);
      }
      notificationResults.push({
        name: userDoc.name,
        phone: userDoc.phone,
        status,
        error: errorMsg
      });
    }

    res.json({
      message: 'Emergency contacts notified successfully',
      notifications: notificationResults,
      alert: alert.getSummary()
    });

  } catch (error) {
    console.error('Notify contacts error:', error);
    res.status(500).json({ error: 'Failed to notify contacts' });
  }
});

module.exports = router; 