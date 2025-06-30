const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userAadhar: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_alarm'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  emergencyType: {
    type: String,
    enum: ['harassment', 'assault', 'medical', 'accident', 'other'],
    default: 'other'
  },
  notifiedContacts: [{
    name: String,
    phone: String,
    notifiedAt: {
      type: Date,
      default: Date.now
    },
    response: {
      type: String,
      enum: ['pending', 'acknowledged', 'responding', 'unreachable'],
      default: 'pending'
    }
  }],
  policeNotified: {
    type: Boolean,
    default: false
  },
  policeResponse: {
    notifiedAt: Date,
    responseTime: Number, // in minutes
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'arrived', 'resolved'],
      default: 'pending'
    }
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
sosAlertSchema.index({ status: 1, createdAt: -1 });
sosAlertSchema.index({ userId: 1, createdAt: -1 });
sosAlertSchema.index({ location: '2dsphere' });

// Method to get alert summary
sosAlertSchema.methods.getSummary = function() {
  return {
    id: this._id,
    status: this.status,
    priority: this.priority,
    emergencyType: this.emergencyType,
    location: this.location,
    createdAt: this.createdAt,
    userName: this.userName,
    userPhone: this.userPhone
  };
};

// Static method to get active alerts
sosAlertSchema.statics.getActiveAlerts = function() {
  return this.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .populate('userId', 'name phone aadhar');
};

// Static method to get alerts by user
sosAlertSchema.statics.getUserAlerts = function(userId) {
  return this.find({ userId })
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('SOSAlert', sosAlertSchema); 