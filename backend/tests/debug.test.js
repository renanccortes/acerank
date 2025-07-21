const request = require('supertest');
const app = require('../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./test-db');

describe('Debug - Identificar Problemas', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('deve debugar resposta do registro', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Debug User',
        email: 'debug@test.com',
        password: '123456',
        level: 'INT',
        phone: '11999999999'
      });

    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    
    if (response.status !== 201) {
      console.log('ERRO - Status não é 201');
      console.log('Erro retornado:', response.body);
    }
    
    // Não falhar o teste, apenas mostrar informações
    console.log('Player definido?', response.body.player !== undefined);
    console.log('Token definido?', response.body.token !== undefined);
  });

  test('deve debugar autenticação', async () => {
    // Primeiro registrar
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auth Debug',
        email: 'auth@test.com',
        password: '123456',
        level: 'INT',
        phone: '11999999999'
      });

    console.log('Register Status:', registerResponse.status);
    console.log('Register Body:', JSON.stringify(registerResponse.body, null, 2));

    if (registerResponse.status === 201 && registerResponse.body.token) {
      const token = registerResponse.body.token;
      
      // Testar autenticação
      const authResponse = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${token}`);

      console.log('Auth Status:', authResponse.status);
      console.log('Auth Body:', JSON.stringify(authResponse.body, null, 2));
      
      expect(authResponse.status).toBe(200);
    }
  });

  test('deve testar rota básica', async () => {
    const response = await request(app).get('/');
    
    console.log('Root Status:', response.status);
    console.log('Root Body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
  });
});

