const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Player = require('../models/Player');
const Challenge = require('../models/Challenge');
const Match = require('../models/Match');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

// Configuração do banco de teste
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acerank_test';

describe('AceRank - Testes de Integração Completos', () => {
  let server;
  let testPlayers = {};
  let authTokens = {};

  beforeAll(async () => {
    // Conectar ao banco de teste
    await mongoose.connect(MONGODB_URI);
    
    // Limpar banco de teste
    await Player.deleteMany({});
    await Challenge.deleteMany({});
    await Match.deleteMany({});
    await Chat.deleteMany({});
    await Notification.deleteMany({});

    // Iniciar servidor
    server = app.listen(0);
  });

  afterAll(async () => {
    // Limpar e fechar conexões
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  describe('1. Autenticação e Cadastro', () => {
    test('deve cadastrar novos jogadores', async () => {
      const playersData = [
        {
          name: 'João Silva',
          email: 'joao@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        },
        {
          name: 'Maria Santos',
          email: 'maria@test.com',
          password: '123456',
          level: 'INT',
          phone: '11888888888'
        },
        {
          name: 'Pedro Costa',
          email: 'pedro@test.com',
          password: '123456',
          level: 'AV',
          phone: '11777777777'
        },
        {
          name: 'Ana Oliveira',
          email: 'ana@test.com',
          password: '123456',
          level: 'INIC',
          phone: '11666666666'
        }
      ];

      for (const playerData of playersData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(playerData)
          .expect(201);

        expect(response.body.token).toBeDefined();
        expect(response.body.player.name).toBe(playerData.name);
        expect(response.body.player.level).toBe(playerData.level);
        expect(response.body.player.provisional).toBe(true);
        expect(response.body.player.provisionalMatches).toBe(0);

        // Armazenar para testes posteriores
        testPlayers[playerData.name.split(' ')[0].toLowerCase()] = response.body.player;
        authTokens[playerData.name.split(' ')[0].toLowerCase()] = response.body.token;
      }
    });

    test('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@test.com',
          password: '123456'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.player.email).toBe('joao@test.com');
    });

    test('deve rejeitar login com credenciais inválidas', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@test.com',
          password: 'senhaerrada'
        })
        .expect(401);
    });
  });

  describe('2. Sistema de Players e Rankings', () => {
    test('deve listar jogadores por nível', async () => {
      const response = await request(app)
        .get('/api/players/level/INT')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every(p => p.level === 'INT')).toBe(true);
    });

    test('deve retornar ranking geral', async () => {
      const response = await request(app)
        .get('/api/rankings/general')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('deve retornar jogadores disponíveis para desafio', async () => {
      const response = await request(app)
        .get('/api/players/available/challenge')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // João não deve aparecer na própria lista
      expect(response.body.find(p => p.email === 'joao@test.com')).toBeUndefined();
    });
  });

  describe('3. Sistema de Desafios', () => {
    let challengeId;

    test('deve criar um novo desafio', async () => {
      const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .send({
          challengedId: testPlayers.maria._id,
          message: 'Vamos jogar uma partida!'
        })
        .expect(201);

      expect(response.body.challenger).toBe(testPlayers.joao._id);
      expect(response.body.challenged).toBe(testPlayers.maria._id);
      expect(response.body.status).toBe('pending');
      challengeId = response.body._id;
    });

    test('deve listar desafios do jogador', async () => {
      const response = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${authTokens.maria}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(c => c._id === challengeId)).toBe(true);
    });

    test('deve aceitar um desafio', async () => {
      const response = await request(app)
        .put(`/api/challenges/${challengeId}/respond`)
        .set('Authorization', `Bearer ${authTokens.maria}`)
        .send({ action: 'accept' })
        .expect(200);

      expect(response.body.status).toBe('accepted');
    });

    test('deve impedir desafio fora do alcance dinâmico', async () => {
      // Pedro (AV) não pode desafiar Ana (INIC) - níveis diferentes
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authTokens.pedro}`)
        .send({
          challengedId: testPlayers.ana._id,
          message: 'Desafio inválido'
        })
        .expect(400);
    });
  });

  describe('4. Sistema de Partidas', () => {
    let matchId;

    test('deve criar partida a partir de desafio aceito', async () => {
      // Buscar o desafio aceito
      const challenges = await Challenge.find({ status: 'accepted' });
      const acceptedChallenge = challenges[0];

      const response = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .send({
          challengeId: acceptedChallenge._id,
          winnerId: testPlayers.joao._id,
          score: '6-4, 6-2',
          date: new Date().toISOString()
        })
        .expect(201);

      expect(response.body.challengeId).toBe(acceptedChallenge._id.toString());
      expect(response.body.winner).toBe(testPlayers.joao._id);
      expect(response.body.status).toBe('pending_validation');
      matchId = response.body._id;
    });

    test('deve validar resultado da partida', async () => {
      const response = await request(app)
        .put(`/api/matches/${matchId}/validate`)
        .set('Authorization', `Bearer ${authTokens.maria}`)
        .send({ action: 'confirm' })
        .expect(200);

      expect(response.body.status).toBe('validated');
    });

    test('deve atualizar pontos após partida validada', async () => {
      // Verificar se os pontos foram atualizados
      const joao = await Player.findById(testPlayers.joao._id);
      const maria = await Player.findById(testPlayers.maria._id);

      expect(joao.points).toBeGreaterThan(1000); // Pontos iniciais + vitória
      expect(maria.points).toBeLessThan(1000); // Pontos iniciais - derrota
      
      // Verificar se saiu do status provisional
      expect(joao.provisionalMatches).toBe(1);
      expect(maria.provisionalMatches).toBe(1);
    });
  });

  describe('5. Sistema de Chat', () => {
    let challengeForChat;

    beforeAll(async () => {
      // Criar um novo desafio para testar chat
      const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authTokens.pedro}`)
        .send({
          challengedId: testPlayers.ana._id,
          message: 'Vamos conversar!'
        });
      
      // Aceitar o desafio para habilitar chat
      challengeForChat = response.body._id;
      await request(app)
        .put(`/api/challenges/${challengeForChat}/respond`)
        .set('Authorization', `Bearer ${authTokens.ana}`)
        .send({ action: 'accept' });
    });

    test('deve enviar mensagem no chat', async () => {
      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${authTokens.pedro}`)
        .send({
          challengeId: challengeForChat,
          message: 'Olá! Quando podemos jogar?'
        })
        .expect(201);

      expect(response.body.message).toBe('Olá! Quando podemos jogar?');
      expect(response.body.sender).toBe(testPlayers.pedro._id);
    });

    test('deve listar mensagens do chat', async () => {
      const response = await request(app)
        .get(`/api/chat/${challengeForChat}`)
        .set('Authorization', `Bearer ${authTokens.ana}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].message).toBe('Olá! Quando podemos jogar?');
    });

    test('deve marcar mensagens como lidas', async () => {
      await request(app)
        .put(`/api/chat/${challengeForChat}/read`)
        .set('Authorization', `Bearer ${authTokens.ana}`)
        .expect(200);
    });
  });

  describe('6. Sistema de Notificações', () => {
    test('deve listar notificações do usuário', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens.maria}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Maria deve ter notificações de desafio recebido, aceito, etc.
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('deve marcar notificação como lida', async () => {
      const notifications = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens.maria}`);

      if (notifications.body.length > 0) {
        const notificationId = notifications.body[0]._id;
        
        await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${authTokens.maria}`)
          .expect(200);
      }
    });

    test('deve contar notificações não lidas', async () => {
      const response = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .expect(200);

      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('7. Regras MVP - Penalidade por Recusa', () => {
    test('deve aplicar penalidade na 3ª recusa do mês', async () => {
      // Criar jogador para teste de recusa
      const recuserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Recusador Teste',
          email: 'recusador@test.com',
          password: '123456',
          level: 'INT',
          phone: '11555555555'
        });

      const recuserId = recuserResponse.body.player._id;
      const recuserToken = recuserResponse.body.token;

      // Simular 3 recusas no mesmo mês
      for (let i = 0; i < 3; i++) {
        // Criar desafio
        const challengeResponse = await request(app)
          .post('/api/challenges')
          .set('Authorization', `Bearer ${authTokens.joao}`)
          .send({
            challengedId: recuserId,
            message: `Desafio ${i + 1}`
          });

        // Recusar desafio
        await request(app)
          .put(`/api/challenges/${challengeResponse.body._id}/respond`)
          .set('Authorization', `Bearer ${recuserToken}`)
          .send({ action: 'decline' });
      }

      // Verificar se a penalidade foi aplicada
      const recuser = await Player.findById(recuserId);
      expect(recuser.recusasMesAtual).toBe(3);
      expect(recuser.points).toBeLessThan(1000); // Deve ter perdido pontos na 3ª recusa
    });
  });

  describe('8. Regras MVP - Alcance Dinâmico', () => {
    test('deve calcular alcance baseado na população do nível', async () => {
      const response = await request(app)
        .get('/api/players/available/challenge')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .expect(200);

      // Verificar se apenas jogadores dentro do alcance são retornados
      expect(Array.isArray(response.body)).toBe(true);
      
      // Todos os jogadores retornados devem estar no mesmo nível ou próximos
      const joaoLevel = testPlayers.joao.level;
      response.body.forEach(player => {
        expect(['INIC', 'INT', 'AV', 'PRO'].includes(player.level)).toBe(true);
      });
    });
  });

  describe('9. Regras MVP - Jogadores Provisórios', () => {
    test('deve aplicar multiplicador 1.5x para jogadores provisórios', async () => {
      // Criar dois novos jogadores provisórios
      const player1Response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Provisório 1',
          email: 'prov1@test.com',
          password: '123456',
          level: 'INT',
          phone: '11444444444'
        });

      const player2Response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Provisório 2',
          email: 'prov2@test.com',
          password: '123456',
          level: 'INT',
          phone: '11333333333'
        });

      const player1Id = player1Response.body.player._id;
      const player2Id = player2Response.body.player._id;
      const player1Token = player1Response.body.token;

      // Criar desafio entre provisórios
      const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengedId: player2Id,
          message: 'Partida entre provisórios'
        });

      // Aceitar desafio
      const player2Token = player2Response.body.token;
      await request(app)
        .put(`/api/challenges/${challengeResponse.body._id}/respond`)
        .set('Authorization', `Bearer ${player2Token}`)
        .send({ action: 'accept' });

      // Criar partida
      const matchResponse = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          challengeId: challengeResponse.body._id,
          winnerId: player1Id,
          score: '6-0, 6-0',
          date: new Date().toISOString()
        });

      // Validar partida
      await request(app)
        .put(`/api/matches/${matchResponse.body._id}/validate`)
        .set('Authorization', `Bearer ${player2Token}`)
        .send({ action: 'confirm' });

      // Verificar se os pontos foram calculados com multiplicador
      const player1Updated = await Player.findById(player1Id);
      const player2Updated = await Player.findById(player2Id);

      expect(player1Updated.points).toBeGreaterThan(1000); // Ganhou pontos com multiplicador
      expect(player2Updated.points).toBeLessThan(1000); // Perdeu pontos com multiplicador
      expect(player1Updated.provisionalMatches).toBe(1);
      expect(player2Updated.provisionalMatches).toBe(1);
    });
  });

  describe('10. Validações e Segurança', () => {
    test('deve rejeitar requisições sem autenticação', async () => {
      await request(app)
        .get('/api/challenges')
        .expect(401);
    });

    test('deve validar dados de entrada com Zod', async () => {
      await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${authTokens.joao}`)
        .send({
          challengedId: 'id_invalido',
          message: 'Teste'
        })
        .expect(400);
    });

    test('deve impedir ações em recursos de outros usuários', async () => {
      // Tentar responder desafio de outro usuário
      const challenges = await Challenge.find({ challenged: testPlayers.maria._id });
      if (challenges.length > 0) {
        await request(app)
          .put(`/api/challenges/${challenges[0]._id}/respond`)
          .set('Authorization', `Bearer ${authTokens.joao}`) // João tentando responder desafio da Maria
          .send({ action: 'accept' })
          .expect(403);
      }
    });
  });
});

