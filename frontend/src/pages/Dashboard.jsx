import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { playersAPI, challengesAPI, matchesAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Swords, Calendar, Users, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import MatchValidation from '../components/MatchValidation';
import ActivityFeed from '../components/ActivityFeed';

const Dashboard = () => {
  const { player } = useAuth();

  // Buscar estatísticas do jogador
  const { data: stats } = useQuery({
    queryKey: ['player-stats'],
    queryFn: () => playersAPI.getMyStats(),
  });

  // Buscar desafios pendentes
  const { data: pendingChallenges } = useQuery({
    queryKey: ['pending-challenges'],
    queryFn: () => challengesAPI.getMy({ status: 'pending', type: 'received' }),
  });

  // Buscar partidas recentes
  const { data: recentMatches } = useQuery({
    queryKey: ['recent-matches'],
    queryFn: () => matchesAPI.getMyHistory({ limit: 5 }),
  });

  // Buscar top 10 do ranking
  const { data: topPlayers } = useQuery({
    queryKey: ['top-players'],
    queryFn: () => playersAPI.getAll({ limit: 10 }),
  });

  const playerStats = stats?.data?.stats;
  const challenges = pendingChallenges?.data?.challenges || [];
  const matches = recentMatches?.data?.matches || [];
  const ranking = topPlayers?.data?.players || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {player?.name}!
        </h1>
        <p className="text-gray-600">
          Acompanhe seu desempenho e gerencie seus desafios
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ranking Atual</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{player?.ranking || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {player?.points || 0} pontos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Vitórias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playerStats?.winRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {playerStats?.wins || 0}V - {playerStats?.losses || 0}D
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desafios Pendentes</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challenges.length}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sequência Atual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playerStats?.currentStreak || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {playerStats?.streakType === 'win' ? 'Vitórias' : 'Derrotas'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desafios Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Swords className="h-5 w-5 mr-2" />
              Desafios Pendentes
            </CardTitle>
            <CardDescription>
              Desafios que você recebeu e precisa responder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {challenges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nenhum desafio pendente
              </p>
            ) : (
              <div className="space-y-3">
                {challenges.slice(0, 3).map((challenge) => (
                  <div
                    key={challenge._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{challenge.challenger.name}</p>
                      <p className="text-sm text-gray-500">
                        Ranking #{challenge.challenger.ranking}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(challenge.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {challenges.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{challenges.length - 3} mais
                  </p>
                )}
              </div>
            )}
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link to="/challenges">Ver Todos os Desafios</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top 10 Ranking
            </CardTitle>
            <CardDescription>
              Os 10 melhores jogadores do ranking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking.slice(0, 10).map((rankPlayer, index) => (
                <div
                  key={rankPlayer._id}
                  className={`flex items-center justify-between p-2 rounded ${
                    rankPlayer._id === player?.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-bold w-6 ${
                      index < 3 ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="font-medium">{rankPlayer.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {rankPlayer.points} pts
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to="/ranking">Ver Ranking Completo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partidas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Partidas Recentes
          </CardTitle>
          <CardDescription>
            Suas últimas partidas jogadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhuma partida jogada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const isWinner = match.winner._id === player?.id;
                const opponent = match.player1._id === player?.id ? match.player2 : match.player1;
                
                return (
                  <div
                    key={match._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isWinner ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">
                          vs {opponent.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {match.score}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        isWinner ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isWinner ? 'Vitória' : 'Derrota'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <Button asChild variant="outline" className="w-full">
              <Link to="/matches">Ver Todas as Partidas</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validação de Partidas */}
      <MatchValidation />

      {/* Feed de Atividades */}
      <ActivityFeed limit={10} />
    </div>
  );
};

export default Dashboard;

