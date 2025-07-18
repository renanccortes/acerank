const cron = require('node-cron');
const Player = require('../models/Player');

/**
 * Reset mensal do contador de recusas (MVP)
 * Executa no dia 1 de cada mês às 00:10
 */
const resetMonthlyDeclines = () => {
  cron.schedule(
    '10 0 1 * *',
    async () => {
      try {
        console.log('🔄 Iniciando reset mensal de recusas...');

        const result = await Player.updateMany(
          {},
          {
            $set: {
              recusasMesAtual: 0,
              recusaMesRef: new Date(),
            },
          }
        );

        console.log(
          `✅ Reset mensal concluído! ${result.modifiedCount} jogadores atualizados.`
        );

        // Log detalhado para auditoria
        const now = new Date();
        console.log(`📅 Reset executado em: ${now.toISOString()}`);
        console.log(
          `📊 Próximo reset: ${new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 10).toISOString()}`
        );
      } catch (error) {
        console.error('❌ Erro no reset mensal de recusas:', error);

        // Aqui você pode adicionar notificação para administradores
        // ou sistema de alertas em caso de falha
      }
    },
    {
      scheduled: true,
      timezone: 'America/Sao_Paulo', // Timezone do Brasil
    }
  );

  console.log('⏰ Cron job de reset mensal configurado (dia 1 às 00:10)');
};

/**
 * Job de limpeza de dados antigos (opcional)
 * Executa todo domingo às 02:00
 */
const cleanupOldData = () => {
  cron.schedule(
    '0 2 * * 0',
    async () => {
      try {
        console.log('🧹 Iniciando limpeza de dados antigos...');

        // Limpar desafios muito antigos (mais de 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const Challenge = require('../models/Challenge');
        const oldChallenges = await Challenge.deleteMany({
          createdAt: { $lt: sixMonthsAgo },
          status: { $in: ['declined', 'expired', 'cancelled'] },
        });

        console.log(
          `🗑️ ${oldChallenges.deletedCount} desafios antigos removidos`
        );

        // Limpar matches muito antigos sem validação (mais de 3 meses)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const Match = require('../models/Match');
        const oldMatches = await Match.deleteMany({
          createdAt: { $lt: threeMonthsAgo },
          status: 'pending_validation',
        });

        console.log(
          `🗑️ ${oldMatches.deletedCount} matches pendentes antigos removidos`
        );
      } catch (error) {
        console.error('❌ Erro na limpeza de dados:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'America/Sao_Paulo',
    }
  );

  console.log('🧹 Cron job de limpeza configurado (domingos às 02:00)');
};

/**
 * Job de atualização de rankings (opcional)
 * Executa a cada 6 horas
 */
const updateRankingsPeriodically = () => {
  cron.schedule(
    '0 */6 * * *',
    async () => {
      try {
        console.log('📊 Atualizando rankings periodicamente...');

        const { updateRankings } = require('./ranking');
        await updateRankings();

        console.log('✅ Rankings atualizados com sucesso');
      } catch (error) {
        console.error('❌ Erro na atualização periódica de rankings:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'America/Sao_Paulo',
    }
  );

  console.log(
    '📊 Cron job de atualização de rankings configurado (a cada 6 horas)'
  );
};

/**
 * Inicializa todos os cron jobs
 */
const initializeCronJobs = () => {
  console.log('🚀 Inicializando cron jobs do AceRank...');

  // Job obrigatório para MVP
  resetMonthlyDeclines();

  // Jobs opcionais para manutenção
  cleanupOldData();
  updateRankingsPeriodically();

  console.log('✅ Todos os cron jobs configurados e ativos!');
};

/**
 * Para todos os cron jobs (útil para testes)
 */
const stopAllCronJobs = () => {
  cron.getTasks().forEach(task => {
    task.stop();
  });
  console.log('⏹️ Todos os cron jobs foram parados');
};

module.exports = {
  initializeCronJobs,
  stopAllCronJobs,
  resetMonthlyDeclines,
  cleanupOldData,
  updateRankingsPeriodically,
};
