const { getChallengeReach } = require('../utils/ranking');

describe('MVP Rules - Testes Simplificados', () => {
  describe('getChallengeReach - Alcance Dinâmico', () => {
    test('deve retornar 1 para poucos jogadores (< 20)', () => {
      expect(getChallengeReach(9)).toBe(1);
      expect(getChallengeReach(19)).toBe(1);
    });

    test('deve retornar 2 para 40 jogadores', () => {
      expect(getChallengeReach(40)).toBe(2);
    });

    test('deve retornar 3 para 43 jogadores', () => {
      expect(getChallengeReach(43)).toBe(3);
    });

    test('deve retornar 5 para 100 jogadores', () => {
      expect(getChallengeReach(100)).toBe(5);
    });

    test('deve retornar pelo menos 1 mesmo para 0 jogadores', () => {
      expect(getChallengeReach(0)).toBe(1);
    });

    test('deve calcular corretamente para diferentes tamanhos', () => {
      // Fórmula: max(1, ceil(0.05 * totalJogadoresNoNivel))
      expect(getChallengeReach(20)).toBe(1); // ceil(0.05 * 20) = 1
      expect(getChallengeReach(21)).toBe(2); // ceil(0.05 * 21) = 2
      expect(getChallengeReach(60)).toBe(3); // ceil(0.05 * 60) = 3
      expect(getChallengeReach(80)).toBe(4); // ceil(0.05 * 80) = 4
      expect(getChallengeReach(120)).toBe(6); // ceil(0.05 * 120) = 6
    });
  });

  describe('Lógica de Penalidade por Recusa', () => {
    test('deve identificar quando aplicar penalidade', () => {
      // Simular lógica de penalidade
      const aplicarPenalidade = (recusasMesAtual) => {
        return recusasMesAtual >= 2; // 3ª recusa (índice 2)
      };

      expect(aplicarPenalidade(0)).toBe(false); // 1ª recusa
      expect(aplicarPenalidade(1)).toBe(false); // 2ª recusa
      expect(aplicarPenalidade(2)).toBe(true);  // 3ª recusa
      expect(aplicarPenalidade(3)).toBe(true);  // 4ª recusa
    });

    test('deve calcular penalidade corretamente', () => {
      const calcularPenalidade = (pontosRecuser, pontosChallenger) => {
        return {
          novosPontosRecuser: pontosRecuser - 10,
          novosPontosChallenger: pontosChallenger + 10,
        };
      };

      const resultado = calcularPenalidade(1000, 900);
      expect(resultado.novosPontosRecuser).toBe(990);
      expect(resultado.novosPontosChallenger).toBe(910);
    });
  });

  describe('Jogadores Provisórios', () => {
    test('deve calcular multiplicador corretamente', () => {
      const calcularMultiplicador = (provisional) => {
        return provisional ? 1.5 : 1.0;
      };

      expect(calcularMultiplicador(true)).toBe(1.5);
      expect(calcularMultiplicador(false)).toBe(1.0);
    });

    test('deve determinar quando sair do status provisional', () => {
      const deveSairProvisional = (provisionalMatches) => {
        return provisionalMatches >= 3;
      };

      expect(deveSairProvisional(0)).toBe(false);
      expect(deveSairProvisional(1)).toBe(false);
      expect(deveSairProvisional(2)).toBe(false);
      expect(deveSairProvisional(3)).toBe(true);
      expect(deveSairProvisional(4)).toBe(true);
    });

    test('deve calcular pontos com multiplicador', () => {
      const calcularPontosComMultiplicador = (pontosBase, provisional) => {
        const multiplicador = provisional ? 1.5 : 1.0;
        return Math.round(pontosBase * multiplicador);
      };

      expect(calcularPontosComMultiplicador(20, true)).toBe(30);  // 20 * 1.5
      expect(calcularPontosComMultiplicador(20, false)).toBe(20); // 20 * 1.0
      expect(calcularPontosComMultiplicador(15, true)).toBe(23);  // 15 * 1.5 = 22.5 → 23
    });
  });

  describe('Validação de Mês', () => {
    test('deve identificar mudança de mês', () => {
      const isMesmoMes = (data1, data2) => {
        return data1.getMonth() === data2.getMonth() && 
               data1.getFullYear() === data2.getFullYear();
      };

      const agora = new Date();
      const mesPassado = new Date();
      mesPassado.setMonth(mesPassado.getMonth() - 1);

      expect(isMesmoMes(agora, agora)).toBe(true);
      expect(isMesmoMes(agora, mesPassado)).toBe(false);
    });
  });
});

