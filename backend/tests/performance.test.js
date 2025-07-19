const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Player = require('../models/Player');
const Challenge = require('../models/Challenge');

describe('AceRank - Testes de Performance', () => {
  let server;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acerank_perf_test';

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await Player.deleteMany({});
    await Challenge.deleteMany({});
    server = app.listen(0);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  describe('Performance com Muitos Jogadores', () => {
    let authToken;
    let testPlayerId;

    beforeAll(async () => {
      // Criar jogador principal para testes
      const mainPlayer = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jogador Principal',
          email: 'principal@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      authToken = mainPlayer.body.token;
      testPlayerId = mainPlayer.body.player._id;

      // Criar muitos jogadores para simular carga
      console.log('Criando 50 jogadores para teste de performance...');
      const players = [];
      for (let i = 0; i < 50; i++) {
        players.push({
          name: `Jogador ${i}`,
          email: `jogador${i}@test.com`,
          password: '123456',
          level: i % 2 === 0 ? 'INT' : 'AV',
          phone: `119${String(i).padStart(8, '0')}`,
          points: 1000 + (i * 10),
          rankingLevel: i + 1,
          isActive: true
        });
      }

      await Player.insertMany(players);
      console.log('50 jogadores criados com sucesso!');
    });

    test('deve listar jogadores rapidamente (< 500ms)', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/players/level/INT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;
      
      expect(response.body.length).toBeGreaterThan(20);
      expect(duration).toBeLessThan(500);
      console.log(`Listagem de jogadores: ${duration}ms`);
    });

    test('deve calcular ranking rapidamente (< 1000ms)', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;
      
      expect(response.body.length).toBeGreaterThan(40);
      expect(duration).toBeLessThan(1000);
      console.log(`Cálculo de ranking: ${duration}ms`);
    });

    test('deve filtrar jogadores disponíveis rapidamente (< 300ms)', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/players/available/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(duration).toBeLessThan(300);
      console.log(`Filtro de jogadores disponíveis: ${duration}ms`);
    });
  });

  describe('Performance de Consultas com Índices', () => {
    test('deve usar índices para consultas de desafios', async () => {
      // Criar alguns desafios para teste
      const players = await Player.find().limit(5);
      const challenges = [];

      for (let i = 0; i < 10; i++) {
        challenges.push({
          challenger: players[0]._id,
          challenged: players[i % players.length]._id,
          status: i % 3 === 0 ? 'pending' : 'accepted',
          message: `Desafio ${i}`,
          createdAt: new Date()
        });
      }

      await Challenge.insertMany(challenges);

      // Testar consulta que deve usar índice { challenged: 1, status: 1 }
      const start = Date.now();
      
      const pendingChallenges = await Challenge.find({
        challenged: players[0]._id,
        status: 'pending'
      });

      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Deve ser muito rápido com índice
      console.log(`Consulta de desafios pendentes: ${duration}ms`);
    });
  });

  describe('Teste de Carga Simultânea', () => {
    test('deve suportar múltiplas requisições simultâneas', async () => {
      const promises = [];
      const numRequests = 20;

      // Criar múltiplas requisições simultâneas
      for (let i = 0; i < numRequests; i++) {
        promises.push(
          request(app)
            .get('/api/rankings/general')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      // Todas as requisições devem ter sucesso
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      // Tempo total deve ser razoável
      expect(duration).toBeLessThan(3000);
      console.log(`${numRequests} requisições simultâneas: ${duration}ms`);
    });
  });

  describe('Memória e Recursos', () => {
    test('deve manter uso de memória estável', async () => {
      const initialMemory = process.memoryUsage();
      
      // Fazer muitas operações
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/players/level/INT')
          .set('Authorization', `Bearer ${authToken}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Aumento de memória deve ser razoável (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Aumento de memória: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });
});

