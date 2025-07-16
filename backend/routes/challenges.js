const express = require('express');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const { canChallenge, applyDeclinePenalty } = require('../utils/ranking');
const NotificationService = require('../utils/notifications');

const router = express.Router();

// Criar novo desafio
router.post('/', auth, async (req, res) => {
  try {
    const { challengedId, message, proposedDate } = req.body;
    
    // Buscar jogadores
    const challenger = req.player;
    const challenged = await Player.findById(challengedId);
    
    if (!challenged) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    
    // Verificar se pode desafiar
    const challengeCheck = await canChallenge(challenger, challenged);
    if (!challengeCheck.canChallenge) {
      return res.status(400).json({ message: challengeCheck.reason });
    }
    
    // Verificar se já existe desafio pendente entre os jogadores
    const existingChallenge = await Challenge.findOne({
      challenger: challenger._id,
      challenged: challengedId,
      status: { $in: ['pending', 'accepted'] }
    });
    
    if (existingChallenge) {
      return res.status(400).json({ message: 'Já existe um desafio pendente com este jogador' });
    }
    
    // Criar desafio
    const challenge = new Challenge({
      challenger: challenger._id,
      challenged: challengedId,
      message,
      proposedDate: proposedDate ? new Date(proposedDate) : null,
      challengerRankingAtTime: challenger.ranking,
      challengedRankingAtTime: challenged.ranking,
      challengerPointsAtTime: challenger.points,
      challengedPointsAtTime: challenged.points
    });
    
    await challenge.save();
    
    // Enviar notificação para o jogador desafiado
    try {
      await NotificationService.challengeReceived(challenger._id, challengedId, challenge._id);
    } catch (notificationError) {
      console.error('Erro ao enviar notificação de desafio:', notificationError);
      // Não falha a criação do desafio se a notificação falhar
    }
    
    // Atualizar contador de desafios ativos
    await Player.findByIdAndUpdate(challenger._id, {
      $inc: { activeChallenges: 1 },
      lastActivity: new Date()
    });
    
    // Popular dados para resposta
    await challenge.populate([
      { path: 'challenger', select: 'name ranking points' },
      { path: 'challenged', select: 'name ranking points' }
    ]);
    
    res.status(201).json({
      message: 'Desafio enviado com sucesso',
      challenge
    });
  } catch (error) {
    console.error('Erro ao criar desafio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar desafios do jogador
router.get('/my', auth, async (req, res) => {
  try {
    const { status, type = 'all' } = req.query;
    
    let query = {};
    
    if (type === 'sent') {
      query.challenger = req.player._id;
    } else if (type === 'received') {
      query.challenged = req.player._id;
    } else {
      query.$or = [
        { challenger: req.player._id },
        { challenged: req.player._id }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const challenges = await Challenge.find(query)
      .populate('challenger', 'name ranking points')
      .populate('challenged', 'name ranking points')
      .sort({ createdAt: -1 });
    
    res.json({ challenges });
  } catch (error) {
    console.error('Erro ao buscar desafios:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Responder a um desafio
router.put('/:id/respond', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' ou 'decline'
    
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }
    
    // Verificar se é o jogador desafiado
    if (challenge.challenged.toString() !== req.player._id.toString()) {
      return res.status(403).json({ message: 'Não autorizado' });
    }
    
    // Verificar se ainda está pendente
    if (challenge.status !== 'pending') {
      return res.status(400).json({ message: 'Desafio não está mais pendente' });
    }
    
    // Atualizar status
    if (action === 'accept') {
      challenge.status = 'accepted';
      challenge.acceptedDate = new Date();
      challenge.matchDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    } else if (action === 'decline') {
      challenge.status = 'declined';
      
      // Aplicar penalidade por recusa (MVP)
      const challenger = await Player.findById(challenge.challenger);
      const penaltyResult = await applyDeclinePenalty(req.player, challenger);
      
      // Enviar notificações de mudança de pontos se penalidade foi aplicada
      if (penaltyResult.penaltyApplied) {
        try {
          await NotificationService.pointsChanged(
            req.player._id, `-10 pts por recusa`
          );
          await NotificationService.pointsChanged(
            challenger._id, `+10 pts do desafio recusado`
          );
        } catch (notificationError) {
          console.error('Erro ao enviar notificação de pontos:', notificationError);
        }
      }
      
      // Decrementar contador de desafios ativos do desafiante
      await Player.findByIdAndUpdate(challenge.challenger, {
        $inc: { activeChallenges: -1 }
      });
      
      // Adicionar informações da penalidade ao challenge
      challenge.declinePenalty = {
        applied: penaltyResult.penaltyApplied,
        pointsTransferred: penaltyResult.pointsTransferred,
        recusasNoMes: penaltyResult.recusasNoMes,
        message: penaltyResult.message
      };
    } else {
      return res.status(400).json({ message: 'Ação inválida' });
    }
    
    await challenge.save();
    
    // Enviar notificação para o desafiante
    try {
      if (action === 'accept') {
        await NotificationService.challengeAccepted(req.player._id, challenge.challenger, challenge._id);
      } else if (action === 'decline') {
        await NotificationService.challengeDeclined(req.player._id, challenge.challenger, challenge._id);
      }
    } catch (notificationError) {
      console.error('Erro ao enviar notificação de resposta:', notificationError);
      // Não falha a resposta se a notificação falhar
    }
    
    // Atualizar última atividade
    await Player.findByIdAndUpdate(req.player._id, {
      lastActivity: new Date()
    });
    
    await challenge.populate([
      { path: 'challenger', select: 'name ranking points' },
      { path: 'challenged', select: 'name ranking points' }
    ]);
    
    res.json({
      message: `Desafio ${action === 'accept' ? 'aceito' : 'recusado'} com sucesso`,
      challenge
    });
  } catch (error) {
    console.error('Erro ao responder desafio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar desafio por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('challenger', 'name ranking points')
      .populate('challenged', 'name ranking points');
    
    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }
    
    // Verificar se o jogador está envolvido no desafio
    const isInvolved = challenge.challenger._id.toString() === req.player._id.toString() ||
                      challenge.challenged._id.toString() === req.player._id.toString();
    
    if (!isInvolved) {
      return res.status(403).json({ message: 'Não autorizado' });
    }
    
    res.json({ challenge });
  } catch (error) {
    console.error('Erro ao buscar desafio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

