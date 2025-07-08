import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PublicRanking = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Buscar ranking público
  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ['public-ranking', currentPage],
    queryFn: () => publicAPI.getRanking({ page: currentPage, limit }),
  });

  // Buscar estatísticas gerais
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => publicAPI.getStats(),
  });

  // Buscar feed público
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['public-feed'],
    queryFn: () => publicAPI.getFeed({ limit: 5 }),
  });

  const ranking = rankingData?.data?.ranking || [];
  const pagination = rankingData?.data?.pagination || {};
  const stats = statsData?.data || {};
  const feed = feedData?.data?.feed || [];

  const getRankingIcon = (position) => {
    if (position === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (position === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-gray-600">#{position}</span>;
  };

  const getRankingBadgeColor = (position) => {
    if (position <= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (position <= 10) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              🎾 Ranking de Tênis
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Acompanhe os melhores jogadores da nossa comunidade
            </p>
            
            {/* Estatísticas gerais */}
            {!statsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="text-2xl font-bold">{stats.totalPlayers || 0}</div>
                  <div className="text-blue-200">Jogadores Ativos</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="text-2xl font-bold">{stats.totalMatches || 0}</div>
                  <div className="text-blue-200">Partidas Jogadas</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.topWinner?.name?.split(' ')[0] || 'N/A'}
                  </div>
                  <div className="text-blue-200">Líder Atual</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ranking Principal */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  Ranking Oficial
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {ranking.map((player, index) => (
                        <div 
                          key={player.id} 
                          className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                            player.ranking <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Posição */}
                          <div className="flex items-center justify-center w-12">
                            {getRankingIcon(player.ranking)}
                          </div>

                          {/* Avatar */}
                          <Avatar className="w-12 h-12">
                            <AvatarImage 
                              src={player.profilePhoto} 
                              alt={player.name}
                            />
                            <AvatarFallback>
                              {player.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Informações do jogador */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {player.name}
                              </h3>
                              <Badge className={getRankingBadgeColor(player.ranking)}>
                                #{player.ranking}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{player.points} pontos</span>
                              <span>{player.wins}V - {player.losses}D</span>
                              <span>{player.winRate}% vitórias</span>
                            </div>
                          </div>

                          {/* Pontos */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {player.points}
                            </div>
                            <div className="text-xs text-gray-500">pontos</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paginação */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={!pagination.hasPrev}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Anterior
                        </Button>
                        
                        <span className="text-sm text-gray-600">
                          Página {pagination.currentPage} de {pagination.totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={!pagination.hasNext}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top 3 Destaque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Medal className="w-5 h-5 mr-2 text-yellow-500" />
                  Top 3
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ranking.slice(0, 3).map((player) => (
                      <div key={player.id} className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8">
                          {getRankingIcon(player.ranking)}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={player.profilePhoto} 
                            alt={player.name}
                          />
                          <AvatarFallback>
                            {player.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {player.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {player.points} pontos
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atividades Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  Atividades Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : feed.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {feed.map((activity) => (
                      <div key={activity.id} className="border-l-4 border-blue-200 pl-4">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {activity.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                <h3 className="text-lg font-bold mb-2">
                  Junte-se ao Ranking!
                </h3>
                <p className="text-blue-100 mb-4">
                  Cadastre-se e comece a competir com os melhores jogadores
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => window.location.href = '/register'}
                >
                  Criar Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicRanking;

