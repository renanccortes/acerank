const express = require('express');
const Match = require('../models/Match');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const {
  calculateMatchPoints,
  updateRankings,
  updateProvisionalStatus,
} = require('../utils/ranking');
const NotificationService = require('../utils/notifications');

const router = express.Router();

// Registrar resultado de partida (agora com validação)
router.post('/', auth, async (req, res) => {
  try {
    const {
      challengeId,
      winnerId,
      score,
      sets,
      matchDate,
      location,
      duration,
      notes,
    } = req.body;

    // Buscar desafio
    const challenge = await Challenge.findById(challengeId)
      .populate('challenger')
      .populate('challenged');

    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }

    // Verificar se o jogador está envolvido no desafio
    const isInvolved =
      challenge.challenger._id.toString() === req.player._id.toString() ||
      challenge.challenged._id.toString() === req.player._id.toString();

    if (!isInvolved) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Verificar se o desafio foi aceito
    if (challenge.status !== 'accepted') {
      return res.status(400).json({ message: 'Desafio não foi aceito' });
    }

    // Verificar se o vencedor é um dos jogadores do desafio
    const validWinner =
      winnerId === challenge.challenger._id.toString() ||
      winnerId === challenge.challenged._id.toString();

    if (!validWinner) {
      return res.status(400).json({ message: 'Vencedor inválido' });
    }

    // Determinar vencedor e perdedor
    const winner =
      winnerId === challenge.challenger._id.toString()
        ? challenge.challenger
        : challenge.challenged;
    const loser =
      winnerId === challenge.challenger._id.toString()
        ? challenge.challenged
        : challenge.challenger;

    // Calcular pontos
    const pointsCalculation = calculateMatchPoints(winner, loser);

    // Salvar dados antes da atualização
    const rankingBefore = {
      player1: {
        ranking: challenge.challenger.ranking,
        points: challenge.challenger.points,
      },
      player2: {
        ranking: challenge.challenged.ranking,
        points: challenge.challenged.points,
      },
    };

    // Criar partida com status de validação pendente
    const match = new Match({
      challenge: challengeId,
      player1: challenge.challenger._id,
      player2: challenge.challenged._id,
      winner: winnerId,
      loser: loser._id,
      score,
      sets: sets || [],
      matchDate: matchDate ? new Date(matchDate) : new Date(),
      location,
      duration,
      pointsAwarded: pointsCalculation,
      rankingBefore,
      notes,
      reportedBy: req.player._id,
      status: 'pending_validation',
    });

    await match.save();

    // Enviar notificação para o oponente sobre o resultado enviado
    const opponentId =
      req.player._id.toString() === challenge.challenger._id.toString()
        ? challenge.challenged._id
        : challenge.challenger._id;

    try {
      await NotificationService.matchResultSubmitted(
        req.player._id,
        opponentId,
        match._id
      );
    } catch (notificationError) {
      console.error(
        'Erro ao enviar notificação de resultado:',
        notificationError
      );
      // Não falha o registro se a notificação falhar
    }

    // Atualizar status do desafio para aguardando validação
    challenge.status = 'awaiting_validation';
    await challenge.save();

    // Popular dados para resposta
    await match.populate([
      { path: 'player1', select: 'name ranking points' },
      { path: 'player2', select: 'name ranking points' },
      { path: 'winner', select: 'name ranking points' },
      { path: 'loser', select: 'name ranking points' },
      { path: 'reportedBy', select: 'name' },
    ]);

    res.status(201).json({
      message: 'Resultado registrado. Aguardando validação do adversário.',
      match,
      pointsAwarded: pointsCalculation,
    });
  } catch (error) {
    console.error('Erro ao registrar partida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Validar resultado de partida
router.put('/:id/validate', auth, async (req, res) => {
  try {
    const { action, disputeReason } = req.body; // action: 'confirm' ou 'dispute'

    const match = await Match.findById(req.params.id)
      .populate('player1')
      .populate('player2')
      .populate('winner')
      .populate('loser');

    if (!match) {
      return res.status(404).json({ message: 'Partida não encontrada' });
    }

    // Verificar se o jogador é o perdedor (quem deve validar)
    if (match.loser._id.toString() !== req.player._id.toString()) {
      return res
        .status(403)
        .json({ message: 'Apenas o perdedor pode validar o resultado' });
    }

    // Verificar se ainda está no prazo
    if (new Date() > match.validationDeadline && action !== 'confirm') {
      return res.status(400).json({ message: 'Prazo de validação expirado' });
    }

    if (action === 'confirm') {
      // Confirmar resultado
      match.status = 'validated';
      match.validatedBy = req.player._id;
      match.validatedAt = new Date();

      // Aplicar pontos e atualizar rankings
      await applyMatchResults(match);

      // Enviar notificação para quem reportou o resultado
      try {
        await NotificationService.matchResultValidated(
          req.player._id,
          match.reportedBy,
          match._id
        );
      } catch (notificationError) {
        console.error(
          'Erro ao enviar notificação de validação:',
          notificationError
        );
      }

      res.json({ message: 'Resultado confirmado com sucesso', match });
    } else if (action === 'dispute') {
      // Contestar resultado
      match.status = 'disputed';
      match.disputeReason = disputeReason;
      match.disputedAt = new Date();

      // Enviar notificação para quem reportou o resultado
      try {
        await NotificationService.matchResultDisputed(
          req.player._id,
          match.reportedBy,
          match._id
        );
      } catch (notificationError) {
        console.error(
          'Erro ao enviar notificação de contestação:',
          notificationError
        );
      }

      res.json({
        message: 'Resultado contestado. Será analisado pela administração.',
        match,
      });
    } else {
      return res.status(400).json({ message: 'Ação inválida' });
    }

    await match.save();
  } catch (error) {
    console.error('Erro ao validar partida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar partidas pendentes de validação
router.get('/pending-validation', auth, async (req, res) => {
  try {
    const matches = await Match.find({
      loser: req.player._id,
      status: 'pending_validation',
      validationDeadline: { $gte: new Date() },
    })
      .populate('player1', 'name ranking')
      .populate('player2', 'name ranking')
      .populate('winner', 'name')
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ matches });
  } catch (error) {
    console.error('Erro ao buscar partidas pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Função auxiliar para aplicar resultados da partida
async function applyMatchResults(match) {
  // Buscar jogadores para verificar status provisional
  const winner = await Player.findById(match.winner._id);
  const loser = await Player.findById(match.loser._id);

  // Atualizar pontos dos jogadores
  await Player.findByIdAndUpdate(match.winner._id, {
    $inc: {
      points: match.pointsAwarded.winner,
      wins: 1,
      winStreak: 1,
    },
    lastActivity: new Date(),
  });

  await Player.findByIdAndUpdate(match.loser._id, {
    $inc: {
      points: match.pointsAwarded.loser,
      losses: 1,
    },
    winStreak: 0,
    lastActivity: new Date(),
  });

  // Atualizar status provisional dos jogadores (MVP)
  const winnerProvisionalUpdate = await updateProvisionalStatus(winner);
  const loserProvisionalUpdate = await updateProvisionalStatus(loser);

  // Adicionar informações sobre mudanças de status provisional ao match
  match.provisionalUpdates = {
    winner: winnerProvisionalUpdate,
    loser: loserProvisionalUpdate,
  };

  // Decrementar contador de desafios ativos
  const challenge = await Challenge.findById(match.challenge);
  if (challenge) {
    await Player.findByIdAndUpdate(challenge.challenger, {
      $inc: { activeChallenges: -1 },
    });

    // Atualizar status do desafio
    challenge.status = 'completed';
    await challenge.save();
  }

  // Atualizar rankings
  await updateRankings();

  // Buscar dados atualizados para salvar no match
  const updatedWinner = await Player.findById(match.winner._id);
  const updatedLoser = await Player.findById(match.loser._id);

  match.rankingAfter = {
    player1:
      match.player1.toString() === updatedWinner._id.toString()
        ? { ranking: updatedWinner.ranking, points: updatedWinner.points }
        : { ranking: updatedLoser.ranking, points: updatedLoser.points },
    player2:
      match.player2.toString() === updatedWinner._id.toString()
        ? { ranking: updatedWinner.ranking, points: updatedWinner.points }
        : { ranking: updatedLoser.ranking, points: updatedLoser.points },
  };
}

// Job para auto-validar partidas expiradas
router.post('/auto-validate-expired', async (req, res) => {
  try {
    const expiredMatches = await Match.find({
      status: 'pending_validation',
      validationDeadline: { $lt: new Date() },
    }).populate('winner loser');

    for (const match of expiredMatches) {
      match.status = 'validated';
      match.validatedAt = new Date();
      await match.save();

      await applyMatchResults(match);
    }

    res.json({
      message: `${expiredMatches.length} partidas auto-validadas`,
      count: expiredMatches.length,
    });
  } catch (error) {
    console.error('Erro ao auto-validar partidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar partidas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, playerId, status } = req.query;

    let query = {};

    if (playerId) {
      query.$or = [{ player1: playerId }, { player2: playerId }];
    }

    if (status) {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate('player1', 'name ranking')
      .populate('player2', 'name ranking')
      .populate('winner', 'name')
      .sort({ matchDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Match.countDocuments(query);

    res.json({
      matches,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Erro ao buscar partidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar partida por ID
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('player1', 'name ranking points')
      .populate('player2', 'name ranking points')
      .populate('winner', 'name ranking points')
      .populate('loser', 'name ranking points')
      .populate('reportedBy', 'name')
      .populate('validatedBy', 'name')
      .populate('challenge');

    if (!match) {
      return res.status(404).json({ message: 'Partida não encontrada' });
    }

    res.json({ match });
  } catch (error) {
    console.error('Erro ao buscar partida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar partidas do jogador
router.get('/my/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let query = {
      $or: [{ player1: req.player._id }, { player2: req.player._id }],
    };

    if (status) {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate('player1', 'name ranking')
      .populate('player2', 'name ranking')
      .populate('winner', 'name')
      .populate('reportedBy', 'name')
      .sort({ matchDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Match.countDocuments(query);

    res.json({
      matches,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;
