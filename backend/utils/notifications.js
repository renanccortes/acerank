const Notification = require('../models/Notification');

// Utilitário para criar notificações de forma padronizada
class NotificationService {
  
  // Notificação de desafio recebido
  static async challengeReceived(challengerId, challengedId, challengeId) {
    const challenger = await require('../models/Player').findById(challengerId);
    
    return await Notification.createNotification({
      recipient: challengedId,
      sender: challengerId,
      type: 'challenge_received',
      title: 'Novo Desafio Recebido!',
      message: `${challenger.name} te desafiou para uma partida de tênis!`,
      relatedData: { challengeId },
      priority: 'high',
      actionUrl: '/challenges'
    });
  }
  
  // Notificação de desafio aceito
  static async challengeAccepted(challengedId, challengerId, challengeId) {
    const challenged = await require('../models/Player').findById(challengedId);
    
    return await Notification.createNotification({
      recipient: challengerId,
      sender: challengedId,
      type: 'challenge_accepted',
      title: 'Desafio Aceito!',
      message: `${challenged.name} aceitou seu desafio! Agora vocês podem combinar a partida.`,
      relatedData: { challengeId },
      priority: 'high',
      actionUrl: '/challenges'
    });
  }
  
  // Notificação de desafio recusado
  static async challengeDeclined(challengedId, challengerId, challengeId) {
    const challenged = await require('../models/Player').findById(challengedId);
    
    return await Notification.createNotification({
      recipient: challengerId,
      sender: challengedId,
      type: 'challenge_declined',
      title: 'Desafio Recusado',
      message: `${challenged.name} recusou seu desafio. Tente desafiar outro jogador!`,
      relatedData: { challengeId },
      priority: 'medium',
      actionUrl: '/challenges'
    });
  }
  
  // Notificação de desafio expirado
  static async challengeExpired(challengerId, challengedId, challengeId) {
    const challenged = await require('../models/Player').findById(challengedId);
    
    return await Notification.createNotification({
      recipient: challengerId,
      type: 'challenge_expired',
      title: 'Desafio Expirado',
      message: `Seu desafio para ${challenged.name} expirou por falta de resposta.`,
      relatedData: { challengeId },
      priority: 'low',
      actionUrl: '/challenges'
    });
  }
  
  // Notificação de resultado de partida enviado
  static async matchResultSubmitted(submitterId, opponentId, matchId) {
    const submitter = await require('../models/Player').findById(submitterId);
    
    return await Notification.createNotification({
      recipient: opponentId,
      sender: submitterId,
      type: 'match_result_submitted',
      title: 'Resultado de Partida Enviado',
      message: `${submitter.name} enviou o resultado da partida. Confirme se está correto!`,
      relatedData: { matchId },
      priority: 'high',
      actionUrl: '/matches'
    });
  }
  
  // Notificação de resultado validado
  static async matchResultValidated(validatorId, submitterId, matchId) {
    const validator = await require('../models/Player').findById(validatorId);
    
    return await Notification.createNotification({
      recipient: submitterId,
      sender: validatorId,
      type: 'match_result_validated',
      title: 'Resultado Confirmado!',
      message: `${validator.name} confirmou o resultado da partida. Seu ranking foi atualizado!`,
      relatedData: { matchId },
      priority: 'medium',
      actionUrl: '/matches'
    });
  }
  
  // Notificação de resultado contestado
  static async matchResultDisputed(disputerId, submitterId, matchId) {
    const disputer = await require('../models/Player').findById(disputerId);
    
    return await Notification.createNotification({
      recipient: submitterId,
      sender: disputerId,
      type: 'match_result_disputed',
      title: 'Resultado Contestado',
      message: `${disputer.name} contestou o resultado da partida. Verifique os detalhes.`,
      relatedData: { matchId },
      priority: 'urgent',
      actionUrl: '/matches'
    });
  }
  
  // Notificação de ranking atualizado
  static async rankingUpdated(playerId, newPosition, oldPosition) {
    const positionChange = oldPosition - newPosition;
    let message;
    
    if (positionChange > 0) {
      message = `Parabéns! Você subiu ${positionChange} posição(ões) no ranking! Nova posição: #${newPosition}`;
    } else if (positionChange < 0) {
      message = `Você desceu ${Math.abs(positionChange)} posição(ões) no ranking. Nova posição: #${newPosition}`;
    } else {
      message = `Seu ranking foi atualizado. Posição atual: #${newPosition}`;
    }
    
    return await Notification.createNotification({
      recipient: playerId,
      type: 'ranking_updated',
      title: 'Ranking Atualizado',
      message,
      priority: positionChange > 0 ? 'medium' : 'low',
      actionUrl: '/ranking'
    });
  }
  
  // Notificação de nova mensagem no chat
  static async newMessage(senderId, recipientId, challengeId, chatId) {
    const sender = await require('../models/Player').findById(senderId);
    
    return await Notification.createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'new_message',
      title: 'Nova Mensagem',
      message: `${sender.name} enviou uma nova mensagem no chat do desafio.`,
      relatedData: { challengeId, chatId },
      priority: 'low',
      actionUrl: '/challenges'
    });
  }
  
  // Notificação do sistema
  static async systemAnnouncement(recipientId, title, message, priority = 'medium') {
    return await Notification.createNotification({
      recipient: recipientId,
      type: 'system_announcement',
      title,
      message,
      priority,
      actionUrl: '/dashboard'
    });
  }
  
  // Enviar notificação para todos os usuários
  static async broadcastToAllUsers(title, message, priority = 'medium') {
    const Player = require('../models/Player');
    const players = await Player.find({ isActive: true }, '_id');
    
    const notifications = players.map(player => ({
      recipient: player._id,
      type: 'system_announcement',
      title,
      message,
      priority,
      actionUrl: '/dashboard'
    }));
    
    return await Notification.insertMany(notifications);
  }
}

module.exports = NotificationService;

