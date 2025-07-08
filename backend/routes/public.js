const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Activity = require('../models/Activity');
const Match = require('../models/Match');

// Ranking público
router.get('/ranking', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const players = await Player.find({ isActive: true })
      .select('name points ranking wins losses profilePhoto joinedAt')
      .sort({ points: -1, wins: -1 })
      .skip(skip)
      .limit(limit);

    // Atualizar rankings se necessário
    players.forEach((player, index) => {
      player.ranking = skip + index + 1;
    });

    const totalPlayers = await Player.countDocuments({ isActive: true });
    const totalPages = Math.ceil(totalPlayers / limit);

    // Formatar dados para resposta pública
    const publicRanking = players.map(player => ({
      id: player._id,
      name: player.name,
      ranking: player.ranking,
      points: player.points,
      wins: player.wins,
      losses: player.losses,
      winRate: player.getWinRate(),
      profilePhoto: player.profilePhoto ? `/api/uploads/${player.profilePhoto}` : null,
      joinedAt: player.joinedAt
    }));

    res.json({
      ranking: publicRanking,
      pagination: {
        currentPage: page,
        totalPages,
        totalPlayers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar ranking público:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Feed público de atividades
router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ isPublic: true })
      .populate('players', 'name profilePhoto')
      .populate('createdBy', 'name profilePhoto')
      .populate({
        path: 'relatedMatch',
        select: 'score matchDate resultPhoto',
        populate: {
          path: 'winner loser',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await Activity.countDocuments({ isPublic: true });
    const totalPages = Math.ceil(totalActivities / limit);

    // Formatar dados para resposta pública
    const publicFeed = activities.map(activity => ({
      id: activity._id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      players: activity.players.map(player => ({
        id: player._id,
        name: player.name,
        profilePhoto: player.profilePhoto ? `/api/uploads/${player.profilePhoto}` : null
      })),
      createdBy: activity.createdBy ? {
        id: activity.createdBy._id,
        name: activity.createdBy.name,
        profilePhoto: activity.createdBy.profilePhoto ? `/api/uploads/${activity.createdBy.profilePhoto}` : null
      } : null,
      relatedMatch: activity.relatedMatch ? {
        id: activity.relatedMatch._id,
        score: activity.relatedMatch.score,
        matchDate: activity.relatedMatch.matchDate,
        resultPhoto: activity.relatedMatch.resultPhoto ? `/api/uploads/${activity.relatedMatch.resultPhoto}` : null,
        winner: activity.relatedMatch.winner ? activity.relatedMatch.winner.name : null,
        loser: activity.relatedMatch.loser ? activity.relatedMatch.loser.name : null
      } : null,
      metadata: activity.metadata,
      createdAt: activity.createdAt
    }));

    res.json({
      feed: publicFeed,
      pagination: {
        currentPage: page,
        totalPages,
        totalActivities,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar feed público:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Estatísticas gerais públicas
router.get('/stats', async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments({ isActive: true });
    const totalMatches = await Match.countDocuments({ status: 'validated' });
    
    // Jogador com mais vitórias
    const topWinner = await Player.findOne({ isActive: true })
      .select('name wins profilePhoto')
      .sort({ wins: -1 });

    // Última atividade
    const lastActivity = await Activity.findOne({ isPublic: true })
      .populate('players', 'name')
      .sort({ createdAt: -1 });

    res.json({
      totalPlayers,
      totalMatches,
      topWinner: topWinner ? {
        name: topWinner.name,
        wins: topWinner.wins,
        profilePhoto: topWinner.profilePhoto ? `/api/uploads/${topWinner.profilePhoto}` : null
      } : null,
      lastActivity: lastActivity ? {
        title: lastActivity.title,
        description: lastActivity.description,
        createdAt: lastActivity.createdAt
      } : null
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas públicas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

