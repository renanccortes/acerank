const request = require('supertest');
const app = require('../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./test-db');

describe('AceRank - Testes de Integração Corrigidos', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('1. Autenticação', () => {
    test('deve cadastrar um novo jogador com validação', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'João Silva',
          email: 'joao@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        })
        .expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.player.name).toBe('João Silva');
      expect(response.body.player.level).toBe('INT');
      expect(response.body.player.provisional).toBe(true);
    });

    test('deve rejeitar cadastro com dados inválidos', async () => {
      // Email inválido
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste',
          email: 'email_invalido',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        })
        .expect(400);

      // Senha muito curta
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste',
          email: 'teste@email.com',
          password: '123',
          level: 'INT',
          phone: '11999999999'
        })
        .expect(400);

      // Nível inválido
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste',
          email: 'teste@email.com',
          password: '123456',
          level: 'NIVEL_INVALIDO',
          phone: '11999999999'
        })
        .expect(400);
    });

    test('deve fazer login com credenciais válidas', async () => {
      // Primeiro cadastrar
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Maria Santos',
          email: 'maria@test.com',
          password: '123456',
          level: 'INT',
          phone: '11888888888'
        });

      // Depois fazer login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'maria@test.com',
          password: '123456'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.player.email).toBe('maria@test.com');
    });

    test('deve rejeitar login com credenciais inválidas', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inexistente@test.com',
          password: '123456'
        })
        .expect(401);
    });
  });

  describe('2. Rotas Protegidas', () => {
    let authToken;

    beforeEach(async () => {
      // Criar usuário e obter token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Usuário Teste',
          email: 'usuario@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      authToken = response.body.token;
    });

    test('deve acessar rota de desafios com autenticação', async () => {
      const response = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve rejeitar acesso sem token', async () => {
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

    test('deve acessar rota de notificações', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve acessar rota de chat', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // ObjectId válido
      const response = await request(app)
        .get(`/api/chat/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('deve acessar ranking geral', async () => {
      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('3. Validações de Desafio', () => {
    let authToken, playerId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Desafiante',
          email: 'desafiante@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      authToken = response.body.token;
      playerId = response.body.player._id;
    });

    test('deve rejeitar desafio com ObjectId inválido', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: 'id_invalido',
          message: 'Teste'
        })
        .expect(400);
    });

    test('deve rejeitar auto-desafio', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: playerId,
          message: 'Auto desafio'
        })
        .expect(400);
    });

    test('deve rejeitar mensagem muito longa', async () => {
      const longMessage = 'A'.repeat(501); // Mais que 500 caracteres
      
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengedId: '507f1f77bcf86cd799439011',
          message: longMessage
        })
        .expect(400);
    });
  });

  describe('4. Fluxo Básico de Desafio', () => {
    let player1Token, player2Token, player1Id, player2Id;

    beforeEach(async () => {
      // Criar dois jogadores
      const p1 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jogador 1',
          email: 'jogador1@test.com',
          password: '123456',
          level: 'INT',
          phone: '11111111111'
        });

      const p2 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jogador 2',
          email: 'jogador2@test.com',
          password: '123456',
          level: 'INT',
          phone: '11222222222'
        });

      player1Token = p1.body.token;
      player2Token = p2.body.token;
      player1Id = p1.body.player._id;
      player2Id = p2.body.player._id;
    });

    test('deve criar desafio entre jogadores válidos', async () => {
      const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Vamos jogar!'
        })
        .expect(201);

      expect(response.body.challenger).toBe(player1Id);
      expect(response.body.challenged).toBe(player2Id);
      expect(response.body.status).toBe('pending');
    });

    test('deve listar desafios do jogador', async () => {
      // Criar desafio
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Teste'
        });

      // Listar desafios do jogador 2 (desafiado)
      const response = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${player2Token}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].challenged).toBe(player2Id);
    });
  });

  describe('5. Performance Básica', () => {
    let authToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Performance Test',
          email: 'perf@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      authToken = response.body.token;
    });

    test('deve responder rapidamente em rotas básicas', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    test('deve suportar múltiplas requisições', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/challenges')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

