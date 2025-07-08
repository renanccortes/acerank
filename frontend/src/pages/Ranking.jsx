import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { playersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Search, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from 'lucide-react';

const Ranking = () => {
  const { player } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['players', page, search],
    queryFn: () => playersAPI.getAll({ page, limit: 20, search }),
  });

  const players = data?.data?.players || [];
  const totalPages = data?.data?.totalPages || 1;

  const getRankingIcon = (ranking) => {
    if (ranking === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (ranking === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (ranking === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <Trophy className="h-4 w-4 text-gray-400" />;
  };

  const getRankingBadgeColor = (ranking) => {
    if (ranking <= 3) return 'bg-yellow-100 text-yellow-800';
    if (ranking <= 10) return 'bg-blue-100 text-blue-800';
    if (ranking <= 20) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 70) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Trophy className="h-8 w-8 mr-3 text-yellow-500" />
          Ranking de Jogadores
        </h1>
        <p className="text-gray-600">
          Classificação geral dos jogadores por pontuação
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar jogador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ranking List */}
      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum jogador encontrado
            </p>
          ) : (
            <div className="space-y-2">
              {players.map((rankPlayer) => {
                const isCurrentPlayer = rankPlayer._id === player?.id;
                const winRate = rankPlayer.wins + rankPlayer.losses > 0 
                  ? ((rankPlayer.wins / (rankPlayer.wins + rankPlayer.losses)) * 100).toFixed(1)
                  : 0;

                return (
                  <div
                    key={rankPlayer._id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isCurrentPlayer 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Ranking Position */}
                      <div className="flex items-center space-x-2">
                        {getRankingIcon(rankPlayer.ranking)}
                        <Badge className={getRankingBadgeColor(rankPlayer.ranking)}>
                          #{rankPlayer.ranking}
                        </Badge>
                      </div>

                      {/* Player Info */}
                      <div>
                        <h3 className={`font-semibold ${
                          isCurrentPlayer ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {rankPlayer.name}
                          {isCurrentPlayer && (
                            <span className="ml-2 text-sm text-blue-600">(Você)</span>
                          )}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{rankPlayer.points} pontos</span>
                          <span>•</span>
                          <span>{rankPlayer.wins}V - {rankPlayer.losses}D</span>
                          <span>•</span>
                          <span className={getWinRateColor(winRate)}>
                            {winRate}% vitórias
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-6 text-sm">
                      {/* Win Streak */}
                      {rankPlayer.winStreak > 0 && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>{rankPlayer.winStreak}</span>
                        </div>
                      )}

                      {/* Last Activity */}
                      <div className="text-gray-500">
                        {new Date(rankPlayer.lastActivity).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Position Highlight */}
      {player && !players.find(p => p._id === player.id) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-blue-800 font-medium">
                Sua posição atual: #{player.ranking} com {player.points} pontos
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Continue jogando para subir no ranking!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Ranking;

