const Player = require('../models/Player');

// Constantes para cálculo de pontuação
const POINTS_CONFIG = {
  BASE_VICTORY: 20,
  BASE_DEFEAT: -10,
  RANKING_FACTOR: 2,
  DEFEAT_FACTOR: 1,
  PARTICIPATION_BONUS: 10,
  MIN_POINTS: 0
};

/**
 * Calcula os pontos ganhos/perdidos em uma partida
 * @param {Object} winner - Jogador vencedor
 * @param {Object} loser - Jogador perdedor
 * @returns {Object} Pontos para vencedor e perdedor
 */
const calculateMatchPoints = (winner, loser) => {
  // Diferença de ranking (posição do perdedor - posição do vencedor)
  const rankingDifference = loser.ranking - winner.ranking;
  
  // Pontos para o vencedor
  const winnerPoints = POINTS_CONFIG.BASE_VICTORY + 
    (rankingDifference * POINTS_CONFIG.RANKING_FACTOR) + 
    POINTS_CONFIG.PARTICIPATION_BONUS;
  
  // Pontos para o perdedor
  let loserPoints = POINTS_CONFIG.BASE_DEFEAT - 
    (rankingDifference * POINTS_CONFIG.DEFEAT_FACTOR) + 
    POINTS_CONFIG.PARTICIPATION_BONUS;
  
  // Se o perdedor estava em posição superior e perdeu para alguém abaixo,
  // a penalidade é maior
  if (rankingDifference > 0) {
    loserPoints = Math.min(loserPoints, -5); // Penalidade mínima de -5
  } else {
    // Se perdeu para alguém melhor ranqueado, penalidade menor ou nenhuma
    loserPoints = Math.max(loserPoints, 0);
  }
  
  return {
    winner: Math.max(winnerPoints, 1), // Mínimo 1 ponto para vitória
    loser: Math.max(loserPoints, POINTS_CONFIG.MIN_POINTS - loser.points) // Não pode ficar negativo
  };
};

/**
 * Atualiza o ranking de todos os jogadores (geral e por categorias)
 */
const updateRankings = async () => {
  try {
    // Ranking Geral
    await updateGeneralRanking();
    
    // Rankings por Gênero
    await updateGenderRankings();
    
    // Rankings por Região
    await updateRegionRankings();
    
    // Rankings por Nível
    await updateLevelRankings();
    
    console.log('Todos os rankings atualizados com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar rankings:', error);
    throw error;
  }
};

/**
 * Atualiza o ranking geral
 */
const updateGeneralRanking = async () => {
  const players = await Player.find({ isActive: true })
    .sort({ points: -1, wins: -1, name: 1 });
  
  const updatePromises = players.map((player, index) => {
    return Player.findByIdAndUpdate(player._id, { ranking: index + 1 });
  });
  
  await Promise.all(updatePromises);
};

/**
 * Atualiza os rankings por gênero
 */
const updateGenderRankings = async () => {
  const genders = ['masculino', 'feminino', 'outro'];
  
  for (const gender of genders) {
    const players = await Player.find({ isActive: true, gender })
      .sort({ points: -1, wins: -1, name: 1 });
    
    const updatePromises = players.map((player, index) => {
      return Player.findByIdAndUpdate(player._id, { rankingGender: index + 1 });
    });
    
    await Promise.all(updatePromises);
  }
};

/**
 * Atualiza os rankings por região
 */
const updateRegionRankings = async () => {
  // Buscar todas as regiões únicas
  const regions = await Player.distinct('region', { isActive: true, region: { $ne: '' } });
  
  for (const region of regions) {
    const players = await Player.find({ isActive: true, region })
      .sort({ points: -1, wins: -1, name: 1 });
    
    const updatePromises = players.map((player, index) => {
      return Player.findByIdAndUpdate(player._id, { rankingRegion: index + 1 });
    });
    
    await Promise.all(updatePromises);
  }
};

/**
 * Atualiza os rankings por nível
 */
const updateLevelRankings = async () => {
  const levels = ['iniciante', 'intermediario', 'avancado', 'profissional'];
  
  for (const level of levels) {
    const players = await Player.find({ isActive: true, level })
      .sort({ points: -1, wins: -1, name: 1 });
    
    const updatePromises = players.map((player, index) => {
      return Player.findByIdAndUpdate(player._id, { rankingLevel: index + 1 });
    });
    
    await Promise.all(updatePromises);
  }
};

/**
 * Obtém ranking por categoria específica
 */
const getRankingByCategory = async (category, value, limit = 50) => {
  let filter = { isActive: true };
  let sortField = 'ranking';
  
  switch (category) {
    case 'gender':
      filter.gender = value;
      sortField = 'rankingGender';
      break;
    case 'region':
      filter.region = value;
      sortField = 'rankingRegion';
      break;
    case 'level':
      filter.level = value;
      sortField = 'rankingLevel';
      break;
    case 'general':
    default:
      // Ranking geral já está no filtro padrão
      break;
  }
  
  const players = await Player.find(filter)
    .sort({ [sortField]: 1 })
    .limit(limit)
    .select('-password -googleId');
  
  return players.map(player => ({
    ...player.toObject(),
    age: player.getAge(),
    winRate: player.getWinRate(),
    progress: player.getProgress()
  }));
};

/**
 * Obtém estatísticas de uma categoria
 */
const getCategoryStats = async (category, value) => {
  let filter = { isActive: true };
  
  switch (category) {
    case 'gender':
      filter.gender = value;
      break;
    case 'region':
      filter.region = value;
      break;
    case 'level':
      filter.level = value;
      break;
  }
  
  const totalPlayers = await Player.countDocuments(filter);
  const avgPoints = await Player.aggregate([
    { $match: filter },
    { $group: { _id: null, avgPoints: { $avg: '$points' } } }
  ]);
  
  const topPlayer = await Player.findOne(filter)
    .sort({ points: -1 })
    .select('name points');
  
  return {
    totalPlayers,
    averagePoints: avgPoints[0]?.avgPoints || 0,
    topPlayer: topPlayer || null
  };
};

/**
 * Verifica se um jogador pode desafiar outro (considerando níveis)
 * @param {Object} challenger - Jogador desafiante
 * @param {Object} challenged - Jogador desafiado
 * @returns {Object} Resultado da verificação
 */
const canChallenge = (challenger, challenged) => {
  // Não pode desafiar a si mesmo
  if (challenger._id.toString() === challenged._id.toString()) {
    return { canChallenge: false, reason: 'Não é possível desafiar a si mesmo' };
  }
  
  // Ambos devem estar ativos
  if (!challenger.isActive || !challenged.isActive) {
    return { canChallenge: false, reason: 'Jogador inativo' };
  }
  
  // Verificar diferença de níveis
  const levelOrder = {
    'iniciante': 1,
    'intermediario': 2,
    'avancado': 3,
    'profissional': 4
  };
  
  const challengerLevel = levelOrder[challenger.level] || 1;
  const challengedLevel = levelOrder[challenged.level] || 1;
  const levelDifference = challengedLevel - challengerLevel;
  
  // Só pode desafiar jogadores do mesmo nível ou até 1 nível acima
  if (levelDifference > 1) {
    return { 
      canChallenge: false, 
      reason: `Só é possível desafiar jogadores do mesmo nível ou até 1 nível acima` 
    };
  }
  
  if (levelDifference < 0) {
    return { 
      canChallenge: false, 
      reason: 'Não é possível desafiar jogadores de nível inferior' 
    };
  }
  
  // Se for do mesmo nível, verificar ranking dentro do nível
  if (levelDifference === 0) {
    const rankingDifference = challenger.rankingLevel - challenged.rankingLevel;
    const maxPositionsUp = challenger.rankingLevel > 20 ? 5 : 3;
    
    if (rankingDifference <= 0) {
      return { canChallenge: false, reason: 'Só é possível desafiar jogadores em posições superiores no seu nível' };
    }
    
    if (rankingDifference > maxPositionsUp) {
      return { 
        canChallenge: false, 
        reason: `Só é possível desafiar jogadores até ${maxPositionsUp} posições acima no seu nível` 
      };
    }
  }
  
  // Verificar limite de desafios ativos
  if (challenger.activeChallenges >= 3) {
    return { 
      canChallenge: false, 
      reason: 'Limite de 3 desafios ativos atingido' 
    };
  }
  
  return { canChallenge: true };
};

/**
 * Calcula estatísticas de um jogador
 * @param {String} playerId - ID do jogador
 * @returns {Object} Estatísticas do jogador
 */
const getPlayerStats = async (playerId) => {
  const Match = require('../models/Match');
  
  const matches = await Match.find({
    $or: [{ player1: playerId }, { player2: playerId }]
  }).sort({ matchDate: -1 });
  
  const wins = matches.filter(match => match.winner.toString() === playerId).length;
  const losses = matches.filter(match => match.loser.toString() === playerId).length;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0;
  
  // Sequência atual
  let currentStreak = 0;
  let streakType = null;
  
  for (const match of matches) {
    const isWin = match.winner.toString() === playerId;
    
    if (streakType === null) {
      streakType = isWin ? 'win' : 'loss';
      currentStreak = 1;
    } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return {
    totalMatches,
    wins,
    losses,
    winRate: parseFloat(winRate),
    currentStreak,
    streakType,
    recentMatches: matches.slice(0, 5)
  };
};

module.exports = {
  calculateMatchPoints,
  updateRankings,
  updateGeneralRanking,
  updateGenderRankings,
  updateRegionRankings,
  updateLevelRankings,
  getRankingByCategory,
  getCategoryStats,
  canChallenge,
  getPlayerStats,
  POINTS_CONFIG
};

