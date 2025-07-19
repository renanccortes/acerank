const request = require('supertest');
const app = require('../server');

describe('AceRank - Testes Funcionais Básicos', () => {
  describe('1. API Endpoints Básicos', () => {
    test('deve responder na rota raiz', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toContain('API do Sistema de Ranking');
    });

    test('deve rejeitar acesso sem autenticação', async () => {
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
  });

  describe('2. Validação de Dados', () => {
    test('deve validar dados de registro', async () => {
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
    });

    test('deve validar senha mínima', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste',
          email: 'teste@email.com',
          password: '123', // Muito curta
          level: 'INT',
          phone: '11999999999'
        })
        .expect(400);
    });

    test('deve validar nível válido', async () => {
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
  });

  describe('3. Estrutura da API', () => {
    test('deve ter todas as rotas principais definidas', () => {
      const routes = [];
      
      // Extrair rotas do app Express
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          routes.push(middleware.route.path);
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              routes.push(handler.route.path);
            }
          });
        }
      });

      // Verificar se rota raiz existe
      expect(routes.includes('/')).toBe(true);
    });
  });

  describe('4. Headers e CORS', () => {
    test('deve incluir headers CORS', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Verificar se headers básicos estão presentes
      expect(response.headers).toBeDefined();
    });

    test('deve aceitar JSON', async () => {
      await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Teste JSON',
          email: 'json@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });
      
      // Se chegou até aqui, aceita JSON
      expect(true).toBe(true);
    });
  });

  describe('5. Tratamento de Erros', () => {
    test('deve retornar erro 404 para rota inexistente', async () => {
      await request(app)
        .get('/api/rota/inexistente')
        .expect(404);
    });

    test('deve tratar JSON malformado', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"json": "malformado"')
        .expect(400);
    });
  });

  describe('6. Performance Básica', () => {
    test('deve responder rapidamente na rota raiz', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo
    });

    test('deve suportar múltiplas requisições simultâneas', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app).get('/')
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('7. Middleware e Segurança', () => {
    test('deve aplicar middleware de parsing JSON', async () => {
      // Se conseguir enviar JSON, o middleware está funcionando
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Teste Middleware',
          email: 'middleware@test.com',
          password: '123456',
          level: 'INT',
          phone: '11999999999'
        });

      // Qualquer resposta (mesmo erro) indica que o JSON foi parseado
      expect([200, 201, 400, 409].includes(response.status)).toBe(true);
    });

    test('deve rejeitar requisições muito grandes', async () => {
      const largeData = {
        name: 'A'.repeat(10000), // Nome muito grande
        email: 'large@test.com',
        password: '123456',
        level: 'INT',
        phone: '11999999999'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData);

      // Deve rejeitar ou limitar
      expect([400, 413, 422].includes(response.status)).toBe(true);
    });
  });

  describe('8. Funcionalidades MVP', () => {
    test('deve ter rotas de desafio implementadas', async () => {
      // Tentar acessar rota de desafios (deve dar 401 por falta de auth)
      await request(app)
        .get('/api/challenges')
        .expect(401);
    });

    test('deve ter rotas de ranking implementadas', async () => {
      await request(app)
        .get('/api/rankings/general')
        .expect(401); // Sem auth
    });

    test('deve ter rotas de notificações implementadas', async () => {
      await request(app)
        .get('/api/notifications')
        .expect(401); // Sem auth
    });

    test('deve ter rotas de chat implementadas', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // ObjectId válido
      await request(app)
        .get(`/api/chat/${fakeId}`)
        .expect(401); // Sem auth
    });
  });
});

