const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get emergency contacts
router.get('/emergency-contacts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ contacts: user.emergencyContacts || [] });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Search users by phone number (for emergency response)
router.get('/search/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    const user = await User.findOne({ 
      phone,
      isActive: true 
    }).select('name phone aadhar location emergencyContacts');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name || 'Anonymous',
        phone: user.phone,
        aadhar: user.aadhar,
        location: user.location,
        emergencyContacts: user.emergencyContacts
      }
    });

  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Failed to search user' });
  }
});

// Get user statistics (for admin dashboard)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const usersWithEmergencyContacts = await User.countDocuments({
      isActive: true,
      'emergencyContacts.0': { $exists: true }
    });
    const usersWithLocation = await User.countDocuments({
      isActive: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });

    res.json({
      totalUsers,
      usersWithEmergencyContacts,
      usersWithLocation,
      percentageWithContacts: totalUsers > 0 ? Math.round((usersWithEmergencyContacts / totalUsers) * 100) : 0,
      percentageWithLocation: totalUsers > 0 ? Math.round((usersWithLocation / totalUsers) * 100) : 0
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Get all users (for emergency response - limited info)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name phone aadhar location emergencyContacts')
      .limit(100);

    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name || 'Anonymous',
        phone: user.phone,
        aadhar: user.aadhar,
        location: user.location,
        emergencyContacts: user.emergencyContacts
      })),
      count: users.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (should be last)
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toPublicJSON() });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, email, location } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (email) user.email = email;
    if (location) user.location = location;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Add emergency contact
router.post('/emergency-contacts', authenticateToken, [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Contact name must be at least 2 characters long'),
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian mobile number'),
  body('relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship must be less than 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, phone, relationship } = req.body;
    const user = req.user;

    // Check if contact already exists
    const existingContact = user.emergencyContacts.find(
      contact => contact.phone === phone
    );

    if (existingContact) {
      return res.status(400).json({ error: 'Emergency contact with this phone number already exists' });
    }

    // Add new emergency contact
    user.emergencyContacts.push({
      name,
      phone,
      relationship: relationship || ''
    });

    await user.save();

    res.status(201).json({
      message: 'Emergency contact added successfully',
      contacts: user.emergencyContacts
    });

  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

// Update emergency contact
router.put('/emergency-contacts/:contactId', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Contact name must be at least 2 characters long'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian mobile number'),
  body('relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship must be less than 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, phone, relationship } = req.body;
    const user = req.user;

    // Find the contact to update
    const contactIndex = user.emergencyContacts.findIndex(
      contact => contact._id.toString() === req.params.contactId
    );

    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    // Update contact fields
    if (name) user.emergencyContacts[contactIndex].name = name;
    if (phone) user.emergencyContacts[contactIndex].phone = phone;
    if (relationship !== undefined) user.emergencyContacts[contactIndex].relationship = relationship;

    await user.save();

    res.json({
      message: 'Emergency contact updated successfully',
      contacts: user.emergencyContacts
    });

  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

// Delete emergency contact
router.delete('/emergency-contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Find and remove the contact
    const contactIndex = user.emergencyContacts.findIndex(
      contact => contact._id.toString() === req.params.contactId
    );

    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    user.emergencyContacts.splice(contactIndex, 1);
    await user.save();

    res.json({
      message: 'Emergency contact deleted successfully',
      contacts: user.emergencyContacts
    });

  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

module.exports = router; 