const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  loser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  score: {
    type: String,
    required: true,
    trim: true
  },
  sets: [{
    player1Score: {
      type: Number,
      required: true
    },
    player2Score: {
      type: Number,
      required: true
    }
  }],
  matchDate: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  duration: {
    type: Number // em minutos
  },
  pointsAwarded: {
    winner: {
      type: Number,
      required: true
    },
    loser: {
      type: Number,
      required: true
    }
  },
  rankingBefore: {
    player1: {
      ranking: Number,
      points: Number
    },
    player2: {
      ranking: Number,
      points: Number
    }
  },
  rankingAfter: {
    player1: {
      ranking: Number,
      points: Number
    },
    player2: {
      ranking: Number,
      points: Number
    }
  },
  // Sistema de validação
  status: {
    type: String,
    enum: ['pending_validation', 'validated', 'disputed', 'rejected'],
    default: 'pending_validation'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  validationDeadline: {
    type: Date,
    required: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  validatedAt: {
    type: Date
  },
  disputeReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  disputedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player' // Admin que resolveu a disputa
  },
  resolvedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resultPhoto: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
matchSchema.index({ player1: 1, matchDate: -1 });
matchSchema.index({ player2: 1, matchDate: -1 });
matchSchema.index({ winner: 1, matchDate: -1 });
matchSchema.index({ matchDate: -1 });
matchSchema.index({ status: 1, validationDeadline: 1 });
matchSchema.index({ reportedBy: 1, status: 1 });

// Middleware para definir prazo de validação automaticamente
matchSchema.pre('save', function(next) {
  if (this.isNew && !this.validationDeadline) {
    // Define prazo de 48 horas para validação
    this.validationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);

