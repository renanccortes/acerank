// Setup global para todos os testes
const mongoose = require('mongoose');

// Configurar timeout global
jest.setTimeout(30000);

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/acerank_test';

// Suprimir logs durante testes
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Configurar mongoose para testes
mongoose.set('strictQuery', false);

// Função helper para limpar banco de dados
global.cleanDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Função helper para criar jogador de teste
global.createTestPlayer = async (overrides = {}) => {
  const Player = require('../models/Player');
  const bcrypt = require('bcryptjs');
  
  const defaultPlayer = {
    name: 'Teste Player',
    email: 'test@example.com',
    password: await bcrypt.hash('123456', 10),
    level: 'INT',
    phone: '11999999999',
    points: 1000,
    isActive: true,
    provisional: true,
    provisionalMatches: 0,
    recusasMesAtual: 0,
    recusaMesRef: new Date()
  };

  return await Player.create({ ...defaultPlayer, ...overrides });
};

// Função helper para gerar token JWT
global.generateTestToken = (playerId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ playerId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

