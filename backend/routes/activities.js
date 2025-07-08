const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Activity = require('../models/Activity');

// Buscar feed de atividades (privado - requer autenticação)
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const activities = await Activity.find()
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
      .populate({
        path: 'relatedChallenge',
        select: 'status deadline',
        populate: {
          path: 'challenger challenged',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await Activity.countDocuments();
    const totalPages = Math.ceil(totalActivities / limit);

    // Formatar dados para resposta
    const formattedFeed = activities.map(activity => ({
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
      relatedChallenge: activity.relatedChallenge ? {
        id: activity.relatedChallenge._id,
        status: activity.relatedChallenge.status,
        deadline: activity.relatedChallenge.deadline,
        challenger: activity.relatedChallenge.challenger ? activity.relatedChallenge.challenger.name : null,
        challenged: activity.relatedChallenge.challenged ? activity.relatedChallenge.challenged.name : null
      } : null,
      metadata: activity.metadata,
      isPublic: activity.isPublic,
      createdAt: activity.createdAt
    }));

    res.json({
      feed: formattedFeed,
      pagination: {
        currentPage: page,
        totalPages,
        totalActivities,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar feed de atividades:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar atividades por tipo
router.get('/type/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ type })
      .populate('players', 'name profilePhoto')
      .populate('createdBy', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await Activity.countDocuments({ type });
    const totalPages = Math.ceil(totalActivities / limit);

    res.json({
      feed: activities,
      pagination: {
        currentPage: page,
        totalPages,
        totalActivities,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar atividades por tipo:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar atividades de um jogador específico
router.get('/player/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ 
      $or: [
        { players: playerId },
        { createdBy: playerId }
      ]
    })
      .populate('players', 'name profilePhoto')
      .populate('createdBy', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await Activity.countDocuments({ 
      $or: [
        { players: playerId },
        { createdBy: playerId }
      ]
    });
    const totalPages = Math.ceil(totalActivities / limit);

    res.json({
      feed: activities,
      pagination: {
        currentPage: page,
        totalPages,
        totalActivities,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar atividades do jogador:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

