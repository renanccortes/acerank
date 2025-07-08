import React, { useState, useEffect } from 'react';
import { matchesAPI } from '../lib/api';

const MatchValidation = () => {
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(null);

  useEffect(() => {
    loadPendingMatches();
  }, []);

  const loadPendingMatches = async () => {
    try {
      setLoading(true);
      const response = await matchesAPI.getPendingValidation();
      setPendingMatches(response.data.matches);
    } catch (error) {
      console.error('Erro ao carregar partidas pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (matchId, action, disputeReason = '') => {
    try {
      setValidating(matchId);
      await matchesAPI.validate(matchId, { action, disputeReason });
      
      // Remover da lista após validação
      setPendingMatches(prev => prev.filter(match => match._id !== matchId));
      
      if (action === 'confirm') {
        alert('Resultado confirmado com sucesso!');
      } else {
        alert('Resultado contestado. Será analisado pela administração.');
      }
    } catch (error) {
      console.error('Erro ao validar partida:', error);
      alert('Erro ao validar partida');
    } finally {
      setValidating(null);
    }
  };

  const handleDispute = (matchId) => {
    const reason = prompt('Por favor, explique o motivo da contestação:');
    if (reason && reason.trim()) {
      handleValidation(matchId, 'dispute', reason.trim());
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`;
    } else {
      return `${minutes}m restantes`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pendingMatches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Validação de Partidas</h2>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">✅</div>
          <p>Nenhuma partida pendente de validação</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Validação de Partidas ({pendingMatches.length})
      </h2>
      
      <div className="space-y-4">
        {pendingMatches.map((match) => (
          <div key={match._id} className="border rounded-lg p-4 bg-yellow-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-lg">
                  {match.winner.name} venceu {match.player1._id === match.winner._id ? match.player2.name : match.player1.name}
                </h3>
                <p className="text-gray-600">
                  Placar: {match.score} • {formatDate(match.matchDate)}
                </p>
                <p className="text-sm text-gray-500">
                  Reportado por: {match.reportedBy.name}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-orange-600 font-medium">
                  {getTimeRemaining(match.validationDeadline)}
                </div>
              </div>
            </div>

            {match.sets && match.sets.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Sets: {match.sets.map(set => `${set.player1Score}-${set.player2Score}`).join(', ')}
                </p>
              </div>
            )}

            {match.location && (
              <p className="text-sm text-gray-600 mb-3">
                Local: {match.location}
              </p>
            )}

            {match.notes && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <strong>Observações:</strong> {match.notes}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => handleValidation(match._id, 'confirm')}
                disabled={validating === match._id}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating === match._id ? 'Validando...' : '✓ Confirmar Resultado'}
              </button>
              <button
                onClick={() => handleDispute(match._id)}
                disabled={validating === match._id}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating === match._id ? 'Processando...' : '⚠ Contestar'}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <p>
                ⏰ Você tem até {new Date(match.validationDeadline).toLocaleString('pt-BR')} para validar.
                Após este prazo, o resultado será automaticamente confirmado.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchValidation;

