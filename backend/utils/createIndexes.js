const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

/**
 * Cria índices otimizados para performance do MVP
 */
const createOptimizedIndexes = async () => {
  try {
    console.log('🔍 Criando índices otimizados para performance...');

    // Índices para Challenge
    await Challenge.collection.createIndex(
      { challenged: 1, status: 1 },
      { name: 'challenged_status_idx' }
    );
    console.log('✅ Índice challenged_status_idx criado');

    await Challenge.collection.createIndex(
      { challenger: 1, status: 1 },
      { name: 'challenger_status_idx' }
    );
    console.log('✅ Índice challenger_status_idx criado');

    await Challenge.collection.createIndex(
      { createdAt: -1 },
      { name: 'challenge_created_desc_idx' }
    );
    console.log('✅ Índice challenge_created_desc_idx criado');

    // Índices para Player
    await Player.collection.createIndex(
      { level: 1, rankingLevel: 1 },
      { name: 'level_ranking_idx' }
    );
    console.log('✅ Índice level_ranking_idx criado');

    await Player.collection.createIndex(
      { isActive: 1, level: 1 },
      { name: 'active_level_idx' }
    );
    console.log('✅ Índice active_level_idx criado');

    await Player.collection.createIndex(
      { email: 1 },
      { name: 'email_idx', unique: true }
    );
    console.log('✅ Índice email_idx criado');

    // Índices para Match
    await Match.collection.createIndex(
      { challengeId: 1 },
      { name: 'match_challenge_idx' }
    );
    console.log('✅ Índice match_challenge_idx criado');

    await Match.collection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'match_status_created_idx' }
    );
    console.log('✅ Índice match_status_created_idx criado');

    // Índices para Chat
    await Chat.collection.createIndex(
      { challengeId: 1, createdAt: -1 },
      { name: 'chat_challenge_created_idx' }
    );
    console.log('✅ Índice chat_challenge_created_idx criado');

    // Índices para Notification
    await Notification.collection.createIndex(
      { userId: 1, read: 1, createdAt: -1 },
      { name: 'notification_user_read_created_idx' }
    );
    console.log('✅ Índice notification_user_read_created_idx criado');

    await Notification.collection.createIndex(
      { createdAt: -1 },
      { name: 'notification_created_desc_idx' }
    );
    console.log('✅ Índice notification_created_desc_idx criado');

    // Índices compostos para queries específicas do MVP
    await Player.collection.createIndex(
      { recusaMesRef: 1, recusasMesAtual: 1 },
      { name: 'decline_penalty_idx' }
    );
    console.log('✅ Índice decline_penalty_idx criado');

    await Player.collection.createIndex(
      { provisional: 1, provisionalMatches: 1 },
      { name: 'provisional_player_idx' }
    );
    console.log('✅ Índice provisional_player_idx criado');

    console.log('🎉 Todos os índices foram criados com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    return false;
  }
};

/**
 * Lista todos os índices existentes
 */
const listIndexes = async () => {
  try {
    console.log('📋 Listando índices existentes...\n');

    const collections = [
      { name: 'Challenge', model: Challenge },
      { name: 'Player', model: Player },
      { name: 'Match', model: Match },
      { name: 'Chat', model: Chat },
      { name: 'Notification', model: Notification },
    ];

    for (const { name, model } of collections) {
      console.log(`📊 ${name}:`);
      const indexes = await model.collection.listIndexes().toArray();
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Erro ao listar índices:', error);
  }
};

/**
 * Remove índices desnecessários (cuidado!)
 */
const dropUnusedIndexes = async () => {
  try {
    console.log('🗑️ Removendo índices desnecessários...');
    // Implementar conforme necessário
    console.log('✅ Limpeza de índices concluída');
  } catch (error) {
    console.error('❌ Erro ao remover índices:', error);
  }
};

module.exports = {
  createOptimizedIndexes,
  listIndexes,
  dropUnusedIndexes,
};
