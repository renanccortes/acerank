const express = require('express');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const { getPlayerStats, canChallenge } = require('../utils/ranking');

const router = express.Router();

// Listar todos os jogadores (ranking)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const players = await Player.find(query)
      .select('-password -googleId')
      .sort({ ranking: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Player.countDocuments(query);
    
    // Adicionar informações extras para cada jogador
    const playersWithDetails = players.map(player => ({
      ...player.toObject(),
      age: player.getAge(),
      winRate: player.getWinRate(),
      progress: player.getProgress()
    }));
    
    res.json({
      players: playersWithDetails,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erro ao buscar jogadores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar jogador por ID
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).select('-password -googleId');
    
    if (!player) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    
    // Buscar estatísticas detalhadas
    const stats = await getPlayerStats(player._id);
    
    res.json({
      ...player.toObject(),
      age: player.getAge(),
      winRate: player.getWinRate(),
      progress: player.getProgress(),
      promotionRequirements: player.getPromotionRequirements(),
      canPromote: player.canPromoteToNextLevel(),
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar jogador:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do jogador
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, gender, region, birthDate } = req.body;
    
    const updateData = {
      lastActivity: new Date()
    };
    
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (region !== undefined) updateData.region = region;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    
    const player = await Player.findByIdAndUpdate(
      req.player._id,
      updateData,
      { new: true }
    ).select('-password -googleId');
    
    res.json({
      message: 'Perfil atualizado com sucesso',
      player: {
        ...player.toObject(),
        age: player.getAge(),
        winRate: player.getWinRate(),
        progress: player.getProgress()
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar jogadores que podem ser desafiados
router.get('/available/challenge', auth, async (req, res) => {
  try {
    const currentPlayer = req.player;
    
    // Buscar jogadores do mesmo nível ou 1 nível acima
    const levelOrder = {
      'iniciante': 1,
      'intermediario': 2,
      'avancado': 3,
      'profissional': 4
    };
    
    const currentLevelOrder = levelOrder[currentPlayer.level] || 1;
    const targetLevels = Object.keys(levelOrder).filter(level => {
      const levelOrderValue = levelOrder[level];
      return levelOrderValue >= currentLevelOrder && levelOrderValue <= currentLevelOrder + 1;
    });
    
    const availablePlayers = await Player.find({
      isActive: true,
      _id: { $ne: currentPlayer._id },
      level: { $in: targetLevels }
    })
    .select('-password -googleId')
    .sort({ level: 1, rankingLevel: 1 });
    
    // Filtrar jogadores que realmente podem ser desafiados
    const challengeablePlayers = availablePlayers.filter(player => {
      const result = canChallenge(currentPlayer, player);
      return result.canChallenge;
    });
    
    const playersWithDetails = challengeablePlayers.map(player => ({
      ...player.toObject(),
      age: player.getAge(),
      winRate: player.getWinRate()
    }));
    
    res.json({ 
      availablePlayers: playersWithDetails,
      total: playersWithDetails.length
    });
  } catch (error) {
    console.error('Erro ao buscar jogadores disponíveis:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar estatísticas do jogador atual
router.get('/me/stats', auth, async (req, res) => {
  try {
    const stats = await getPlayerStats(req.player._id);
    const player = req.player;
    
    res.json({ 
      stats,
      player: {
        ...player.toObject(),
        age: player.getAge(),
        winRate: player.getWinRate(),
        progress: player.getProgress(),
        promotionRequirements: player.getPromotionRequirements(),
        canPromote: player.canPromoteToNextLevel()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Verificar se pode desafiar um jogador específico
router.get('/can-challenge/:id', auth, async (req, res) => {
  try {
    const targetPlayer = await Player.findById(req.params.id);
    
    if (!targetPlayer) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    
    const result = canChallenge(req.player, targetPlayer);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao verificar desafio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

