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
  
  // Aplicar multiplicador para jogadores provisórios (MVP)
  const multiplier = winner.provisional || loser.provisional ? 1.5 : 1;
  
  const finalWinnerPoints = Math.round(Math.max(winnerPoints, 1) * multiplier); // Mínimo 1 ponto para vitória
  const finalLoserPoints = Math.round(Math.max(loserPoints, POINTS_CONFIG.MIN_POINTS - loser.points) * multiplier); // Não pode ficar negativo
  
  return {
    winner: finalWinnerPoints,
    loser: finalLoserPoints,
    multiplier: multiplier,
    isProvisional: winner.provisional || loser.provisional
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
 * Calcula o alcance dinâmico de desafios baseado no total de jogadores no nível
 * Fórmula: alcance = max(1, ceil(0.05 * totalJogadoresNoNivel))
 * @param {Number} totalPlayersInLevel - Total de jogadores no nível
 * @returns {Number} Alcance máximo de posições para desafio
 */
const getChallengeReach = (totalPlayersInLevel) => {
  return Math.max(1, Math.ceil(0.05 * totalPlayersInLevel));
};

/**
 * Verifica se um jogador pode desafiar outro (considerando níveis e alcance dinâmico)
 * @param {Object} challenger - Jogador desafiante
 * @param {Object} challenged - Jogador desafiado
 * @returns {Object} Resultado da verificação
 */
const canChallenge = async (challenger, challenged) => {
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
  
  // Se for do mesmo nível, verificar ranking dentro do nível com alcance dinâmico
  if (levelDifference === 0) {
    const rankingDifference = challenger.rankingLevel - challenged.rankingLevel;
    
    if (rankingDifference <= 0) {
      return { canChallenge: false, reason: 'Só é possível desafiar jogadores em posições superiores no seu nível' };
    }
    
    // Calcular alcance dinâmico baseado no total de jogadores no nível
    const totalPlayersInLevel = await Player.countDocuments({ 
      isActive: true, 
      level: challenger.level 
    });
    
    const maxPositionsUp = getChallengeReach(totalPlayersInLevel);
    
    if (rankingDifference > maxPositionsUp) {
      return { 
        canChallenge: false, 
        reason: `Só é possível desafiar jogadores até ${maxPositionsUp} posições acima no seu nível (${totalPlayersInLevel} jogadores no nível)` 
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
 * Atualiza o status provisional de um jogador após uma partida (MVP)
 * @param {Object} player - Jogador a ser atualizado
 * @returns {Object} Resultado da atualização
 */
const updateProvisionalStatus = async (player) => {
  if (!player.provisional) {
    return { wasProvisional: false, becameRegular: false };
  }
  
  // Incrementar contador de partidas provisórias
  player.provisionalMatches += 1;
  
  // Se completou 3 partidas, sair do status provisional
  if (player.provisionalMatches >= 3) {
    player.provisional = false;
    await player.save();
    
    return {
      wasProvisional: true,
      becameRegular: true,
      message: `${player.name} completou 3 partidas e não é mais um jogador provisório!`
    };
  }
  
  await player.save();
  
  return {
    wasProvisional: true,
    becameRegular: false,
    remainingMatches: 3 - player.provisionalMatches,
    message: `${player.name} ainda é provisório. Faltam ${3 - player.provisionalMatches} partidas para se tornar regular.`
  };
};

/**
 * Aplica penalidade por recusa de desafio (MVP)
 * Cada jogador tem 2 recusas grátis por mês
 * A partir da 3ª recusa, perde 10 pontos e o desafiante ganha 10 pontos
 * @param {Object} recuser - Jogador que recusou o desafio
 * @param {Object} challenger - Jogador que fez o desafio
 * @returns {Object} Resultado da aplicação da penalidade
 */
const applyDeclinePenalty = async (recuser, challenger) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Verificar se é o mesmo mês da última recusa
  const recusaMesRef = new Date(recuser.recusaMesRef);
  const refMonth = recusaMesRef.getMonth();
  const refYear = recusaMesRef.getFullYear();
  
  // Se for um novo mês, zerar o contador
  if (currentMonth !== refMonth || currentYear !== refYear) {
    recuser.recusasMesAtual = 0;
    recuser.recusaMesRef = now;
  }
  
  // Incrementar contador de recusas
  recuser.recusasMesAtual += 1;
  
  let penaltyApplied = false;
  let pointsTransferred = 0;
  
  // Aplicar penalidade se for a 3ª recusa ou mais
  if (recuser.recusasMesAtual > 2) {
    const penalty = 10;
    
    // Recuser perde pontos
    recuser.points = Math.max(0, recuser.points - penalty);
    
    // Challenger ganha pontos
    challenger.points += penalty;
    
    penaltyApplied = true;
    pointsTransferred = penalty;
    
    // Salvar ambos os jogadores
    await recuser.save();
    await challenger.save();
    
    // Atualizar rankings após mudança de pontos
    await updateRankings();
  } else {
    // Apenas salvar o recuser com o contador atualizado
    await recuser.save();
  }
  
  return {
    penaltyApplied,
    pointsTransferred,
    recusasNoMes: recuser.recusasMesAtual,
    recusasRestantes: Math.max(0, 2 - recuser.recusasMesAtual),
    message: penaltyApplied 
      ? `Penalidade aplicada! ${recuser.name} perdeu ${pointsTransferred} pontos e ${challenger.name} ganhou ${pointsTransferred} pontos.`
      : `Recusa registrada. ${recuser.name} tem ${Math.max(0, 2 - recuser.recusasMesAtual)} recusas grátis restantes este mês.`
  };
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
  getChallengeReach,
  canChallenge,
  updateProvisionalStatus,
  applyDeclinePenalty,
  getPlayerStats,
  POINTS_CONFIG
};

