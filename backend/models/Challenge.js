const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'completed'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  proposedDate: {
    type: Date
  },
  acceptedDate: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas
    }
  },
  matchDeadline: {
    type: Date
  },
  challengerRankingAtTime: {
    type: Number
  },
  challengedRankingAtTime: {
    type: Number
  },
  challengerPointsAtTime: {
    type: Number
  },
  challengedPointsAtTime: {
    type: Number
  }
}, {
  timestamps: true
});

// Middleware para definir deadline da partida quando aceito
challengeSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'accepted' && !this.matchDeadline) {
    this.matchDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    this.acceptedDate = new Date();
  }
  next();
});

// Índices para otimizar consultas
challengeSchema.index({ challenger: 1, status: 1 });
challengeSchema.index({ challenged: 1, status: 1 });
challengeSchema.index({ expiresAt: 1 });
challengeSchema.index({ matchDeadline: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);

