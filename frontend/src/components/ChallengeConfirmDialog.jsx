import React, { useState, useEffect } from 'react';
import { X, Trophy, TrendingUp, TrendingDown, User, Zap, Crown, Star } from 'lucide-react';
import { challengesAPI } from '../lib/api';
import { toast } from 'sonner';

const ChallengeConfirmDialog = ({ 
  isOpen, 
  onClose, 
  challengedId, 
  onConfirm 
}) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && challengedId) {
      loadPreviewData();
    }
  }, [isOpen, challengedId]);

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      const data = await challengesAPI.getPreview(challengedId);
      setPreviewData(data);
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      toast.error('Erro ao carregar informações do desafio');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;

    try {
      await onConfirm({
        challengedId,
        message: message.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar desafio:', error);
      toast.error('Erro ao criar desafio');
    }
  };

  const formatPoints = (points) => {
    return points > 0 ? `+${points}` : `${points}`;
  };

  const getPointsColor = (points) => {
    return points > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getLevelBadgeColor = (level) => {
    const colors = {
      'INIC': 'bg-gray-100 text-gray-800',
      'INT': 'bg-blue-100 text-blue-800',
      'AV': 'bg-purple-100 text-purple-800',
      'PRO': 'bg-yellow-100 text-yellow-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getLevelIcon = (level) => {
    const icons = {
      'INIC': User,
      'INT': Star,
      'AV': Trophy,
      'PRO': Crown,
    };
    const Icon = icons[level] || User;
    return <Icon className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Confirmar Desafio
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando informações...</p>
          </div>
        ) : previewData ? (
          <div className="p-6 space-y-6">
            {/* Players VS Section */}
            <div className="relative">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-green-50 rounded-xl" />
              
              <div className="relative flex items-center justify-between p-6">
                {/* Challenger (Left) */}
                <div className="flex flex-col items-center space-y-3 flex-1">
                  {/* Photo */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg">
                      {previewData.challenger.profileImage ? (
                        <img
                          src={previewData.challenger.profileImage}
                          alt={previewData.challenger.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                          <User className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                    {previewData.challenger.provisional && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-gray-900">
                      {previewData.challenger.name}
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(previewData.challenger.level)}`}>
                        {getLevelIcon(previewData.challenger.level)}
                        <span className="ml-1">{previewData.challenger.level}</span>
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.challenger.points}
                    </div>
                    <div className="text-sm text-gray-500">pontos</div>
                  </div>
                </div>

                {/* VS Section (Center) */}
                <div className="flex flex-col items-center space-y-2 px-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">VS</span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {previewData.winProbability.challenger}% vs {previewData.winProbability.challenged}%
                  </div>
                </div>

                {/* Challenged (Right) */}
                <div className="flex flex-col items-center space-y-3 flex-1">
                  {/* Photo */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-green-500 shadow-lg">
                      {previewData.challenged.profileImage ? (
                        <img
                          src={previewData.challenged.profileImage}
                          alt={previewData.challenged.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-green-100 flex items-center justify-center">
                          <User className="w-8 h-8 text-green-600" />
                        </div>
                      )}
                    </div>
                    {previewData.challenged.provisional && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-gray-900">
                      {previewData.challenged.name}
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(previewData.challenged.level)}`}>
                        {getLevelIcon(previewData.challenged.level)}
                        <span className="ml-1">{previewData.challenged.level}</span>
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.challenged.points}
                    </div>
                    <div className="text-sm text-gray-500">pontos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Points Calculation */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Possíveis Resultados
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* If Challenger Wins */}
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Se {previewData.challenger.name} vencer
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className={`font-bold ${getPointsColor(previewData.pointsCalculation.challenger.winPoints)}`}>
                          {formatPoints(previewData.pointsCalculation.challenger.winPoints)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className={`font-bold ${getPointsColor(previewData.pointsCalculation.challenged.losePoints)}`}>
                          {formatPoints(previewData.pointsCalculation.challenged.losePoints)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If Challenged Wins */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Se {previewData.challenged.name} vencer
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className={`font-bold ${getPointsColor(previewData.pointsCalculation.challenger.losePoints)}`}>
                          {formatPoints(previewData.pointsCalculation.challenger.losePoints)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className={`font-bold ${getPointsColor(previewData.pointsCalculation.challenged.winPoints)}`}>
                          {formatPoints(previewData.pointsCalculation.challenged.winPoints)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provisional Players Notice */}
              {(previewData.metadata.challengerProvisional || previewData.metadata.challengedProvisional) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Jogador(es) provisório(s) - pontos multiplicados por 1.5x
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Adicione uma mensagem ao seu desafio..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {message.length}/500 caracteres
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirmar Desafio
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">Erro ao carregar informações do desafio</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeConfirmDialog;

