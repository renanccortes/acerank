/**
 * Calcula os pontos ganhos/perdidos em um desafio
 * Baseado no sistema ELO adaptado para tênis
 */

const POINTS_CONFIG = {
  // Fator K para cálculo ELO (quanto maior, mais volátil)
  K_FACTOR: 32,
  
  // Multiplicadores por nível
  LEVEL_MULTIPLIERS: {
    'INIC': 1.0,
    'INT': 1.2,
    'AV': 1.4,
    'PRO': 1.6,
  },
  
  // Multiplicador para jogadores provisórios
  PROVISIONAL_MULTIPLIER: 1.5,
  
  // Pontos mínimos e máximos
  MIN_POINTS: 100,
  MAX_POINTS: 3000,
};

/**
 * Calcula a probabilidade de vitória do jogador A sobre B
 * @param {number} pointsA - Pontos do jogador A
 * @param {number} pointsB - Pontos do jogador B
 * @returns {number} Probabilidade entre 0 e 1
 */
const calculateWinProbability = (pointsA, pointsB) => {
  const diff = pointsB - pointsA;
  return 1 / (1 + Math.pow(10, diff / 400));
};

/**
 * Calcula os pontos ganhos/perdidos em um desafio
 * @param {Object} challenger - Dados do desafiante
 * @param {Object} challenged - Dados do desafiado
 * @returns {Object} Cálculo de pontos para vitória/derrota
 */
const calculateChallengePoints = (challenger, challenged) => {
  const challengerPoints = challenger.points || 1000;
  const challengedPoints = challenged.points || 1000;
  
  // Calcular probabilidade de vitória do desafiante
  const winProbability = calculateWinProbability(challengerPoints, challengedPoints);
  
  // Calcular pontos base usando fator K
  const basePointsIfWin = Math.round(POINTS_CONFIG.K_FACTOR * (1 - winProbability));
  const basePointsIfLose = Math.round(POINTS_CONFIG.K_FACTOR * winProbability);
  
  // Aplicar multiplicadores de nível
  const challengerMultiplier = POINTS_CONFIG.LEVEL_MULTIPLIERS[challenger.level] || 1.0;
  const challengedMultiplier = POINTS_CONFIG.LEVEL_MULTIPLIERS[challenged.level] || 1.0;
  
  // Aplicar multiplicador provisional se aplicável
  const challengerProvisionalMultiplier = challenger.provisional ? POINTS_CONFIG.PROVISIONAL_MULTIPLIER : 1.0;
  const challengedProvisionalMultiplier = challenged.provisional ? POINTS_CONFIG.PROVISIONAL_MULTIPLIER : 1.0;
  
  // Calcular pontos finais
  const challengerWinPoints = Math.round(
    basePointsIfWin * challengerMultiplier * challengerProvisionalMultiplier
  );
  const challengerLosePoints = Math.round(
    -basePointsIfLose * challengerMultiplier * challengerProvisionalMultiplier
  );
  
  const challengedWinPoints = Math.round(
    basePointsIfLose * challengedMultiplier * challengedProvisionalMultiplier
  );
  const challengedLosePoints = Math.round(
    -basePointsIfWin * challengedMultiplier * challengedProvisionalMultiplier
  );
  
  return {
    challenger: {
      currentPoints: challengerPoints,
      winPoints: challengerWinPoints,
      losePoints: challengerLosePoints,
      newPointsIfWin: Math.max(POINTS_CONFIG.MIN_POINTS, 
        Math.min(POINTS_CONFIG.MAX_POINTS, challengerPoints + challengerWinPoints)),
      newPointsIfLose: Math.max(POINTS_CONFIG.MIN_POINTS, 
        Math.min(POINTS_CONFIG.MAX_POINTS, challengerPoints + challengerLosePoints)),
    },
    challenged: {
      currentPoints: challengedPoints,
      winPoints: challengedWinPoints,
      losePoints: challengedLosePoints,
      newPointsIfWin: Math.max(POINTS_CONFIG.MIN_POINTS, 
        Math.min(POINTS_CONFIG.MAX_POINTS, challengedPoints + challengedWinPoints)),
      newPointsIfLose: Math.max(POINTS_CONFIG.MIN_POINTS, 
        Math.min(POINTS_CONFIG.MAX_POINTS, challengedPoints + challengedLosePoints)),
    },
    winProbability: {
      challenger: Math.round(winProbability * 100),
      challenged: Math.round((1 - winProbability) * 100),
    },
    metadata: {
      challengerProvisional: challenger.provisional,
      challengedProvisional: challenged.provisional,
      levelDifference: challenger.level !== challenged.level,
    }
  };
};

/**
 * Formatar pontos para exibição
 * @param {number} points - Pontos a serem formatados
 * @returns {string} Pontos formatados com sinal
 */
const formatPointsChange = (points) => {
  if (points > 0) {
    return `+${points}`;
  } else if (points < 0) {
    return `${points}`;
  } else {
    return '0';
  }
};

/**
 * Obter cor baseada na mudança de pontos
 * @param {number} points - Pontos de mudança
 * @returns {string} Classe CSS ou cor
 */
const getPointsChangeColor = (points) => {
  if (points > 0) {
    return 'text-green-500';
  } else if (points < 0) {
    return 'text-red-500';
  } else {
    return 'text-gray-500';
  }
};

module.exports = {
  calculateChallengePoints,
  formatPointsChange,
  getPointsChangeColor,
  POINTS_CONFIG,
};

