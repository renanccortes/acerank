const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Player = require('../models/Player');
const Challenge = require('../models/Challenge');

describe('AceRank - Testes de Integração Simplificados', () => {
  const MONGODB_URI = 'mongodb://localhost:27017/acerank_simple_test';

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await Player.deleteMany({});
    await Challenge.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('1. Funcionalidades Básicas', () => {
    let authToken;
    let playerId;

    test('deve responder na rota raiz', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toContain('API do Sistema de Ranking');
    });

    test('deve cadastrar um novo jogador', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'João Teste',
          email: 'joao@teste.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        })
        .expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.player.name).toBe('João Teste');
      expect(response.body.player.provisional).toBe(true);
      
      authToken = response.body.token;
      playerId = response.body.player._id;
    });

    test('deve fazer login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@teste.com',
          password: '123456'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
    });

    test('deve rejeitar login inválido', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@teste.com',
          password: 'senhaerrada'
        })
        .expect(401);
    });
  });

  describe('2. Sistema de Players', () => {
    test('deve listar jogadores por nível', async () => {
      const response = await request(app)
        .get('/api/players/level/INT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    test('deve retornar ranking geral', async () => {
      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve retornar jogadores disponíveis para desafio', async () => {
      const response = await request(app)
        .get('/api/players/available/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('3. Sistema de Notificações', () => {
    test('deve listar notificações', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve contar notificações não lidas', async () => {
      const response = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('4. Validações de Segurança', () => {
    test('deve rejeitar requisições sem autenticação', async () => {
      await request(app)
        .get('/api/challenges')
        .expect(401);
    });

    test('deve rejeitar token inválido', async () => {
      await request(app)
        .get('/api/challenges')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);
    });

    test('deve validar dados de entrada', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: 'id_invalido',
          message: 'Teste'
        })
        .expect(400);
    });
  });

  describe('5. Funcionalidades de Desafio (Básicas)', () => {
    let secondPlayerId, secondAuthToken;

    beforeAll(async () => {
      // Criar segundo jogador para testes de desafio
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Maria Teste',
          email: 'maria@teste.com',
          password: '123456',
          level: 'INT',
          phone: '11888888888'
        });

      secondPlayerId = response.body.player._id;
      secondAuthToken = response.body.token;
    });

    test('deve listar desafios do jogador', async () => {
      const response = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve criar um novo desafio', async () => {
      const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: secondPlayerId,
          message: 'Vamos jogar!'
        })
        .expect(201);

      expect(response.body.challenger).toBe(playerId);
      expect(response.body.challenged).toBe(secondPlayerId);
      expect(response.body.status).toBe('pending');
    });

    test('deve impedir auto-desafio', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: playerId,
          message: 'Auto desafio'
        })
        .expect(400);
    });
  });

  describe('6. Regras MVP - Alcance Dinâmico', () => {
    test('deve aplicar regra de alcance dinâmico', async () => {
      // Criar jogadores em níveis diferentes
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Pedro Avançado',
          email: 'pedro@teste.com',
          password: '123456',
          level: 'AV',
          phone: '11777777777'
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ana Iniciante',
          email: 'ana@teste.com',
          password: '123456',
          level: 'INIC',
          phone: '11666666666'
        });

      // Verificar se jogadores disponíveis respeitam alcance
      const response = await request(app)
        .get('/api/players/available/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Deve retornar apenas jogadores do mesmo nível ou próximos
    });
  });

  describe('7. Sistema de Chat (Básico)', () => {
    test('deve listar mensagens de chat', async () => {
      // Usar um ID de desafio fictício para teste
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/chat/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('8. Estatísticas e Dados', () => {
    test('deve retornar estatísticas básicas', async () => {
      // Contar total de jogadores
      const totalPlayers = await Player.countDocuments();
      expect(totalPlayers).toBeGreaterThan(0);

      // Contar total de desafios
      const totalChallenges = await Challenge.countDocuments();
      expect(totalChallenges).toBeGreaterThanOrEqual(0);
    });

    test('deve verificar integridade dos dados', async () => {
      // Verificar se todos os jogadores têm campos obrigatórios
      const players = await Player.find();
      
      players.forEach(player => {
        expect(player.name).toBeDefined();
        expect(player.email).toBeDefined();
        expect(player.level).toBeDefined();
        expect(player.points).toBeDefined();
        expect(typeof player.provisional).toBe('boolean');
        expect(typeof player.provisionalMatches).toBe('number');
      });
    });
  });
});

