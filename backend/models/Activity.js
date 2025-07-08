const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'challenge_created',
      'challenge_accepted',
      'challenge_declined',
      'match_completed',
      'ranking_change',
      'photo_uploaded',
      'player_joined'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  relatedChallenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  },
  relatedMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ players: 1, createdAt: -1 });
activitySchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);

