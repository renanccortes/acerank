const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Destinatário da notificação
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },

    // Remetente da notificação (opcional, para notificações do sistema)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: false,
    },

    // Tipo de notificação
    type: {
      type: String,
      required: true,
      enum: [
        'challenge_received', // Desafio recebido
        'challenge_accepted', // Desafio aceito
        'challenge_declined', // Desafio recusado
        'challenge_expired', // Desafio expirado
        'match_result_submitted', // Resultado de partida enviado
        'match_result_validated', // Resultado de partida validado
        'match_result_disputed', // Resultado de partida contestado
        'ranking_updated', // Ranking atualizado
        'new_message', // Nova mensagem no chat
        'system_announcement', // Anúncio do sistema
      ],
    },

    // Título da notificação
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Mensagem da notificação
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Dados relacionados (IDs de desafios, partidas, etc.)
    relatedData: {
      challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge',
      },
      matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
      },
      chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
      },
    },

    // Status da notificação
    read: {
      type: Boolean,
      default: false,
    },

    // Prioridade da notificação
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // URL de ação (para redirecionamento)
    actionUrl: {
      type: String,
      trim: true,
    },

    // Data de expiração (opcional)
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para otimização
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para marcar como lida
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  return this.save();
};

// Método estático para criar notificação
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  await notification.save();
  return notification.populate(['recipient', 'sender']);
};

// Método estático para buscar notificações não lidas
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

// Método estático para buscar notificações do usuário
notificationSchema.statics.getUserNotifications = async function (
  userId,
  limit = 20,
  skip = 0
) {
  return this.find({ recipient: userId })
    .populate('sender', 'name profilePhoto')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Método estático para marcar todas como lidas
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany({ recipient: userId, read: false }, { read: true });
};

module.exports = mongoose.model('Notification', notificationSchema);
