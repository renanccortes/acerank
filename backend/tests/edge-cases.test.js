const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Player = require('../models/Player');
const Challenge = require('../models/Challenge');
const Match = require('../models/Match');

describe('AceRank - Testes de Casos Extremos', () => {
  let server;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acerank_edge_test';

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await Player.deleteMany({});
    await Challenge.deleteMany({});
    await Match.deleteMany({});
    server = app.listen(0);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  describe('Casos Extremos de Dados', () => {
    let authToken;
    let playerId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste Edge',
          email: 'edge@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      authToken = response.body.token;
      playerId = response.body.player._id;
    });

    test('deve lidar com strings muito longas', async () => {
      const longMessage = 'A'.repeat(1000);
      
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: playerId,
          message: longMessage
        })
        .expect(400); // Deve rejeitar por exceder limite
    });

    test('deve lidar com caracteres especiais', async () => {
      const specialChars = '!@#$%^&*()_+{}|:"<>?[];\'\\,./`~';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: `Teste ${specialChars}`,
          email: 'special@test.com',
          password: '123456',
          level: 'INT',
          phone: '11888888888'
        });

      expect(response.status).toBe(201);
      expect(response.body.player.name).toContain(specialChars);
    });

    test('deve lidar com emails duplicados', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicado 1',
          email: 'duplicado@test.com',
          password: '123456',
          level: 'INT',
          phone: '11777777777'
        })
        .expect(201);

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicado 2',
          email: 'duplicado@test.com',
          password: '123456',
          level: 'INT',
          phone: '11666666666'
        })
        .expect(400); // Deve rejeitar email duplicado
    });
  });

  describe('Casos Extremos de Ranking', () => {
    test('deve lidar com jogador com pontos negativos', async () => {
      // Criar jogador com pontos negativos diretamente no banco
      const negativePlayer = await Player.create({
        name: 'Pontos Negativos',
        email: 'negative@test.com',
        password: '123456',
        level: 'INT',
        phone: '11555555555',
        points: -100,
        isActive: true
      });

      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Jogador com pontos negativos deve aparecer no final
      const negativePlayerInRanking = response.body.find(p => p._id === negativePlayer._id.toString());
      expect(negativePlayerInRanking).toBeDefined();
      expect(negativePlayerInRanking.points).toBe(-100);
    });

    test('deve lidar com muitos jogadores no mesmo nível', async () => {
      // Criar 100 jogadores no mesmo nível
      const players = [];
      for (let i = 0; i < 100; i++) {
        players.push({
          name: `Massa ${i}`,
          email: `massa${i}@test.com`,
          password: '123456',
          level: 'PRO',
          phone: `115${String(i).padStart(8, '0')}`,
          points: 1000,
          isActive: true
        });
      }

      await Player.insertMany(players);

      const response = await request(app)
        .get('/api/players/level/PRO')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBe(100);
    });
  });

  describe('Casos Extremos de Desafios', () => {
    let player1Token, player2Token, player1Id, player2Id;

    beforeAll(async () => {
      const p1 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Extremo 1',
          email: 'extremo1@test.com',
          password: '123456',
          level: 'INT',
          phone: '11444444444'
        });

      const p2 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Extremo 2',
          email: 'extremo2@test.com',
          password: '123456',
          level: 'INT',
          phone: '11333333333'
        });

      player1Token = p1.body.token;
      player2Token = p2.body.token;
      player1Id = p1.body.player._id;
      player2Id = p2.body.player._id;
    });

    test('deve impedir auto-desafio', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player1Id,
          message: 'Auto desafio'
        })
        .expect(400);
    });

    test('deve lidar com desafio para jogador inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: fakeId.toString(),
          message: 'Desafio fantasma'
        })
        .expect(404);
    });

    test('deve impedir múltiplos desafios pendentes entre mesmos jogadores', async () => {
      // Primeiro desafio
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Primeiro desafio'
        })
        .expect(201);

      // Segundo desafio (deve falhar)
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Segundo desafio'
        })
        .expect(400);
    });
  });

  describe('Casos Extremos de Partidas', () => {
    test('deve lidar com placar inválido', async () => {
      // Criar e aceitar desafio
      const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Para teste de placar'
        });

      await request(app)
        .put(`/api/challenges/${challengeResponse.body._id}/respond`)
        .set('Authorization', `Bearer ${player2Token}`)
        .send({ action: 'accept' });

      // Tentar criar partida com placar inválido
      await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengeId: challengeResponse.body._id,
          winnerId: player1Id,
          score: 'Placar inválido muito longo que não faz sentido algum',
          date: new Date().toISOString()
        })
        .expect(400);
    });

    test('deve lidar com data futura', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      // Criar novo desafio para teste
      const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Para teste de data'
        });

      await request(app)
        .put(`/api/challenges/${challengeResponse.body._id}/respond`)
        .set('Authorization', `Bearer ${player2Token}`)
        .send({ action: 'accept' });

      await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengeId: challengeResponse.body._id,
          winnerId: player1Id,
          score: '6-4, 6-2',
          date: futureDate.toISOString()
        })
        .expect(400); // Deve rejeitar data futura
    });
  });

  describe('Casos Extremos de Concorrência', () => {
    test('deve lidar com operações simultâneas no mesmo recurso', async () => {
      // Criar desafio
      const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Teste concorrência'
        });

      const challengeId = challengeResponse.body._id;

      // Tentar aceitar e recusar simultaneamente
      const promises = [
        request(app)
          .put(`/api/challenges/${challengeId}/respond`)
          .set('Authorization', `Bearer ${player2Token}`)
          .send({ action: 'accept' }),
        request(app)
          .put(`/api/challenges/${challengeId}/respond`)
          .set('Authorization', `Bearer ${player2Token}`)
          .send({ action: 'decline' })
      ];

      const results = await Promise.allSettled(promises);
      
      // Uma deve ter sucesso, outra deve falhar
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      expect(successes.length).toBe(1);
    });
  });

  describe('Casos Extremos de Validação', () => {
    test('deve rejeitar ObjectIds inválidos', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: 'id_completamente_invalido',
          message: 'Teste'
        })
        .expect(400);
    });

    test('deve lidar com JSON malformado', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"challengedId": "invalid json}')
        .expect(400);
    });

    test('deve lidar com headers ausentes', async () => {
      await request(app)
        .get('/api/challenges')
        .expect(401); // Sem Authorization header
    });

    test('deve lidar com token JWT inválido', async () => {
      await request(app)
        .get('/api/challenges')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);
    });
  });

  describe('Casos Extremos de Performance', () => {
    test('deve lidar com consultas muito grandes', async () => {
      // Criar muitos registros
      const manyPlayers = [];
      for (let i = 0; i < 1000; i++) {
        manyPlayers.push({
          name: `Bulk ${i}`,
          email: `bulk${i}@test.com`,
          password: '123456',
          level: 'INT',
          phone: `119${String(i).padStart(8, '0')}`,
          isActive: true
        });
      }

      await Player.insertMany(manyPlayers);

      // Consulta deve ainda funcionar
      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(1000);
    });
  });
});

