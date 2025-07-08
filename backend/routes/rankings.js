const express = require('express');
const Player = require('../models/Player');
const { getRankingByCategory, getCategoryStats } = require('../utils/ranking');

const router = express.Router();

// Ranking geral
router.get('/general', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const players = await getRankingByCategory('general', null, parseInt(limit));
    
    res.json({
      success: true,
      data: players,
      total: players.length
    });
  } catch (error) {
    console.error('Erro ao buscar ranking geral:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Ranking por gênero
router.get('/gender/:gender', async (req, res) => {
  try {
    const { gender } = req.params;
    const { limit = 50 } = req.query;
    
    if (!['masculino', 'feminino', 'outro'].includes(gender)) {
      return res.status(400).json({ message: 'Gênero inválido' });
    }
    
    const players = await getRankingByCategory('gender', gender, parseInt(limit));
    const stats = await getCategoryStats('gender', gender);
    
    res.json({
      success: true,
      data: players,
      stats: stats,
      total: players.length,
      category: { type: 'gender', value: gender }
    });
  } catch (error) {
    console.error('Erro ao buscar ranking por gênero:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Ranking por região
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { limit = 50 } = req.query;
    
    const players = await getRankingByCategory('region', region, parseInt(limit));
    const stats = await getCategoryStats('region', region);
    
    res.json({
      success: true,
      data: players,
      stats: stats,
      total: players.length,
      category: { type: 'region', value: region }
    });
  } catch (error) {
    console.error('Erro ao buscar ranking por região:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Ranking por nível
router.get('/level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const { limit = 50 } = req.query;
    
    if (!['iniciante', 'intermediario', 'avancado', 'profissional'].includes(level)) {
      return res.status(400).json({ message: 'Nível inválido' });
    }
    
    const players = await getRankingByCategory('level', level, parseInt(limit));
    const stats = await getCategoryStats('level', level);
    
    res.json({
      success: true,
      data: players,
      stats: stats,
      total: players.length,
      category: { type: 'level', value: level }
    });
  } catch (error) {
    console.error('Erro ao buscar ranking por nível:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar todas as regiões disponíveis
router.get('/regions', async (req, res) => {
  try {
    const regions = await Player.distinct('region', { 
      isActive: true, 
      region: { $ne: '' } 
    });
    
    const regionsWithStats = await Promise.all(
      regions.map(async (region) => {
        const stats = await getCategoryStats('region', region);
        return {
          name: region,
          ...stats
        };
      })
    );
    
    res.json({
      success: true,
      data: regionsWithStats
    });
  } catch (error) {
    console.error('Erro ao buscar regiões:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Estatísticas gerais dos rankings
router.get('/stats', async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments({ isActive: true });
    
    // Estatísticas por gênero
    const genderStats = await Player.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);
    
    // Estatísticas por nível
    const levelStats = await Player.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);
    
    // Estatísticas por região (top 10)
    const regionStats = await Player.aggregate([
      { $match: { isActive: true, region: { $ne: '' } } },
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        totalPlayers,
        byGender: genderStats,
        byLevel: levelStats,
        topRegions: regionStats
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar jogadores (com filtros)
router.get('/search', async (req, res) => {
  try {
    const { 
      name, 
      gender, 
      region, 
      level, 
      minPoints, 
      maxPoints,
      limit = 20,
      page = 1 
    } = req.query;
    
    let filter = { isActive: true };
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    if (gender) {
      filter.gender = gender;
    }
    
    if (region) {
      filter.region = { $regex: region, $options: 'i' };
    }
    
    if (level) {
      filter.level = level;
    }
    
    if (minPoints || maxPoints) {
      filter.points = {};
      if (minPoints) filter.points.$gte = parseInt(minPoints);
      if (maxPoints) filter.points.$lte = parseInt(maxPoints);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const players = await Player.find(filter)
      .sort({ points: -1, wins: -1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -googleId');
    
    const total = await Player.countDocuments(filter);
    
    const playersWithDetails = players.map(player => ({
      ...player.toObject(),
      age: player.getAge(),
      winRate: player.getWinRate(),
      progress: player.getProgress()
    }));
    
    res.json({
      success: true,
      data: playersWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

