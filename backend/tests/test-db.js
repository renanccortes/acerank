const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Conecta a um banco MongoDB em memória para testes
 */
const connectTestDB = async () => {
  try {
    // Fechar conexão existente se houver
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Criar servidor MongoDB em memória
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Conectar ao banco em memória
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado ao banco de teste em memória');
    return mongoUri;
  } catch (error) {
    console.error('❌ Erro ao conectar banco de teste:', error);
    throw error;
  }
};

/**
 * Desconecta e para o servidor de teste
 */
const disconnectTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('✅ Banco de teste desconectado');
  } catch (error) {
    console.error('❌ Erro ao desconectar banco de teste:', error);
    throw error;
  }
};

/**
 * Limpa todas as coleções do banco de teste
 */
const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✅ Banco de teste limpo');
  } catch (error) {
    console.error('❌ Erro ao limpar banco de teste:', error);
    throw error;
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
};

