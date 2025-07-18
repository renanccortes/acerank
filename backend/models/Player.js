const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Senha obrigatória apenas se não for login Google
      },
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },

    // Informações pessoais
    gender: {
      type: String,
      enum: ['masculino', 'feminino', 'outro'],
      default: 'masculino',
    },
    region: {
      type: String,
      trim: true,
      default: '',
    },
    birthDate: {
      type: Date,
      default: null,
    },

    // Sistema de pontos e níveis
    points: {
      type: Number,
      default: 1000,
    },
    level: {
      type: String,
      enum: ['iniciante', 'intermediario', 'avancado', 'profissional'],
      default: 'iniciante',
    },

    // Rankings separados
    ranking: {
      type: Number,
      default: null,
    },
    rankingGender: {
      type: Number,
      default: null,
    },
    rankingRegion: {
      type: Number,
      default: null,
    },
    rankingLevel: {
      type: Number,
      default: null,
    },

    // Estatísticas
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    winStreak: {
      type: Number,
      default: 0,
    },

    // Sistema de recusas (MVP)
    recusasMesAtual: {
      type: Number,
      default: 0,
    },
    recusaMesRef: {
      type: Date,
      default: Date.now,
    },

    // Sistema de jogadores provisórios (MVP)
    provisional: {
      type: Boolean,
      default: true,
    },
    provisionalMatches: {
      type: Number,
      default: 0,
    },

    // Outros campos
    activeChallenges: {
      type: Number,
      default: 0,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Permite valores null únicos
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash da senha antes de salvar
playerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
playerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para calcular taxa de vitórias
playerSchema.methods.getWinRate = function () {
  const totalMatches = this.wins + this.losses;
  return totalMatches > 0 ? ((this.wins / totalMatches) * 100).toFixed(1) : 0;
};

// Método para calcular idade
playerSchema.methods.getAge = function () {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

// Sistema híbrido de níveis
playerSchema.methods.calculateLevel = function () {
  const totalGames = this.wins + this.losses;
  const winRate = parseFloat(this.getWinRate());

  // Critérios para cada nível
  if (this.points >= 1800 && totalGames >= 25 && winRate >= 65) {
    return 'profissional';
  } else if (this.points >= 1400 && totalGames >= 15 && winRate >= 55) {
    return 'avancado';
  } else if (this.points >= 1100 && totalGames >= 5 && winRate >= 40) {
    return 'intermediario';
  } else {
    return 'iniciante';
  }
};

playerSchema.methods.canPromoteToNextLevel = function () {
  const currentLevel = this.level;
  const calculatedLevel = this.calculateLevel();

  const levelOrder = {
    iniciante: 1,
    intermediario: 2,
    avancado: 3,
    profissional: 4,
  };

  const currentOrder = levelOrder[currentLevel] || 1;
  const calculatedOrder = levelOrder[calculatedLevel] || 1;

  return calculatedOrder > currentOrder;
};

playerSchema.methods.getPromotionRequirements = function () {
  const requirements = {
    iniciante: {
      nextLevel: 'intermediario',
      pointsNeeded: 1100,
      gamesNeeded: 5,
      winRateNeeded: 40,
      description: 'Para Intermediário: 1100+ pontos, 5+ jogos, 40%+ vitórias',
    },
    intermediario: {
      nextLevel: 'avancado',
      pointsNeeded: 1400,
      gamesNeeded: 15,
      winRateNeeded: 55,
      description: 'Para Avançado: 1400+ pontos, 15+ jogos, 55%+ vitórias',
    },
    avancado: {
      nextLevel: 'profissional',
      pointsNeeded: 1800,
      gamesNeeded: 25,
      winRateNeeded: 65,
      description: 'Para Profissional: 1800+ pontos, 25+ jogos, 65%+ vitórias',
    },
    profissional: {
      nextLevel: null,
      pointsNeeded: null,
      gamesNeeded: null,
      winRateNeeded: null,
      description: 'Nível máximo atingido!',
    },
  };

  return requirements[this.level] || requirements['iniciante'];
};

playerSchema.methods.updateLevel = function () {
  const newLevel = this.calculateLevel();
  if (newLevel !== this.level) {
    const oldLevel = this.level;
    this.level = newLevel;
    return {
      promoted: true,
      oldLevel: oldLevel,
      newLevel: newLevel,
    };
  }
  return { promoted: false };
};

// Método para obter progresso atual
playerSchema.methods.getProgress = function () {
  const requirements = this.getPromotionRequirements();
  const totalGames = this.wins + this.losses;
  const winRate = parseFloat(this.getWinRate());

  if (requirements.nextLevel) {
    return {
      currentLevel: this.level,
      nextLevel: requirements.nextLevel,
      progress: {
        points: {
          current: this.points,
          needed: requirements.pointsNeeded,
          percentage: Math.min(
            100,
            (this.points / requirements.pointsNeeded) * 100
          ),
        },
        games: {
          current: totalGames,
          needed: requirements.gamesNeeded,
          percentage: Math.min(
            100,
            (totalGames / requirements.gamesNeeded) * 100
          ),
        },
        winRate: {
          current: winRate,
          needed: requirements.winRateNeeded,
          percentage: Math.min(
            100,
            (winRate / requirements.winRateNeeded) * 100
          ),
        },
      },
      canPromote: this.canPromoteToNextLevel(),
    };
  }

  return {
    currentLevel: this.level,
    nextLevel: null,
    progress: null,
    canPromote: false,
  };
};

module.exports = mongoose.model('Player', playerSchema);
