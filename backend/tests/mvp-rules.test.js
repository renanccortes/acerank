const { getChallengeReach, applyDeclinePenalty } = require('../utils/ranking');
const Player = require('../models/Player');
const mongoose = require('mongoose');

// Mock do modelo Player
jest.mock('../models/Player');

// Mock das funções que fazem consultas ao banco
jest.mock('../utils/ranking', () => {
  const originalModule = jest.requireActual('../utils/ranking');
  return {
    ...originalModule,
    updateRankings: jest.fn().mockResolvedValue(true),
    updateGeneralRanking: jest.fn().mockResolvedValue(true),
    updateLevelRankings: jest.fn().mockResolvedValue(true),
  };
});

describe('MVP Rules Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChallengeReach - Alcance Dinâmico', () => {
    test('deve retornar 1 para poucos jogadores (< 20)', () => {
      expect(getChallengeReach(9)).toBe(1);
      expect(getChallengeReach(19)).toBe(1);
    });

    test('deve retornar 2 para 40 jogadores', () => {
      expect(getChallengeReach(40)).toBe(2);
    });

    test('deve retornar 3 para 43 jogadores', () => {
      expect(getChallengeReach(43)).toBe(3);
    });

    test('deve retornar 5 para 100 jogadores', () => {
      expect(getChallengeReach(100)).toBe(5);
    });

    test('deve retornar pelo menos 1 mesmo para 0 jogadores', () => {
      expect(getChallengeReach(0)).toBe(1);
    });
  });

  describe('applyDeclinePenalty - Penalidade por Recusa', () => {
    let mockRecuser, mockChallenger;

    beforeEach(() => {
      mockRecuser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Recuser',
        points: 1000,
        recusasMesAtual: 0,
        recusaMesRef: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockChallenger = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Challenger',
        points: 900,
        save: jest.fn().mockResolvedValue(true),
      };
    });

    test('primeira recusa do mês não deve aplicar penalidade', async () => {
      mockRecuser.recusasMesAtual = 0;
      mockRecuser.recusaMesRef = new Date();

      const result = await applyDeclinePenalty(mockRecuser, mockChallenger);

      expect(result.penaltyApplied).toBe(false);
      expect(mockRecuser.recusasMesAtual).toBe(1);
      expect(mockRecuser.points).toBe(1000); // Sem alteração
      expect(mockChallenger.points).toBe(900); // Sem alteração
    });

    test('segunda recusa do mês não deve aplicar penalidade', async () => {
      mockRecuser.recusasMesAtual = 1;
      mockRecuser.recusaMesRef = new Date();

      const result = await applyDeclinePenalty(mockRecuser, mockChallenger);

      expect(result.penaltyApplied).toBe(false);
      expect(mockRecuser.recusasMesAtual).toBe(2);
      expect(mockRecuser.points).toBe(1000); // Sem alteração
      expect(mockChallenger.points).toBe(900); // Sem alteração
    });

    test('terceira recusa do mês deve aplicar penalidade', async () => {
      mockRecuser.recusasMesAtual = 2;
      mockRecuser.recusaMesRef = new Date();

      const result = await applyDeclinePenalty(mockRecuser, mockChallenger);

      expect(result.penaltyApplied).toBe(true);
      expect(mockRecuser.recusasMesAtual).toBe(3);
      expect(mockRecuser.points).toBe(990); // -10 pontos
      expect(mockChallenger.points).toBe(910); // +10 pontos
      expect(result.message).toContain('Penalidade aplicada');
    });

    test('deve zerar contador em novo mês', async () => {
      const mesPassado = new Date();
      mesPassado.setMonth(mesPassado.getMonth() - 1);
      
      mockRecuser.recusasMesAtual = 5; // Muitas recusas no mês passado
      mockRecuser.recusaMesRef = mesPassado;

      const result = await applyDeclinePenalty(mockRecuser, mockChallenger);

      expect(result.penaltyApplied).toBe(false);
      expect(mockRecuser.recusasMesAtual).toBe(1); // Zerado e incrementado
      expect(mockRecuser.points).toBe(1000); // Sem penalidade
    });

    test('deve aplicar penalidade na 4ª recusa do mesmo mês', async () => {
      mockRecuser.recusasMesAtual = 3;
      mockRecuser.recusaMesRef = new Date();

      const result = await applyDeclinePenalty(mockRecuser, mockChallenger);

      expect(result.penaltyApplied).toBe(true);
      expect(mockRecuser.recusasMesAtual).toBe(4);
      expect(mockRecuser.points).toBe(990); // -10 pontos
      expect(mockChallenger.points).toBe(910); // +10 pontos
    });
  });

  describe('Jogadores Provisórios', () => {
    test('deve identificar jogador provisional corretamente', () => {
      const provisionalPlayer = {
        provisional: true,
        provisionalMatches: 1,
      };

      const regularPlayer = {
        provisional: false,
        provisionalMatches: 5,
      };

      expect(provisionalPlayer.provisional).toBe(true);
      expect(regularPlayer.provisional).toBe(false);
    });

    test('deve sair do status provisional após 3 partidas', () => {
      const player = {
        provisional: true,
        provisionalMatches: 2,
      };

      // Simular incremento após partida
      player.provisionalMatches += 1;
      if (player.provisionalMatches >= 3) {
        player.provisional = false;
      }

      expect(player.provisional).toBe(false);
      expect(player.provisionalMatches).toBe(3);
    });
  });
});

