import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { activitiesAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Users, 
  Camera, 
  TrendingUp, 
  UserPlus,
  MessageSquare,
  Target
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ActivityFeed = ({ limit = 10, showTitle = true, className = '' }) => {
  const { data: feedData, isLoading, error } = useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: () => activitiesAPI.getFeed({ limit }),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const getActivityIcon = (type) => {
    const iconMap = {
      challenge_created: Target,
      challenge_accepted: Users,
      challenge_declined: MessageSquare,
      match_completed: Trophy,
      ranking_change: TrendingUp,
      photo_uploaded: Camera,
      player_joined: UserPlus,
    };

    const IconComponent = iconMap[type] || Trophy;
    return <IconComponent className="w-5 h-5" />;
  };

  const getActivityColor = (type) => {
    const colorMap = {
      challenge_created: 'bg-blue-100 text-blue-800',
      challenge_accepted: 'bg-green-100 text-green-800',
      challenge_declined: 'bg-red-100 text-red-800',
      match_completed: 'bg-yellow-100 text-yellow-800',
      ranking_change: 'bg-purple-100 text-purple-800',
      photo_uploaded: 'bg-pink-100 text-pink-800',
      player_joined: 'bg-indigo-100 text-indigo-800',
    };

    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const getActivityTypeText = (type) => {
    const typeMap = {
      challenge_created: 'Desafio',
      challenge_accepted: 'Aceito',
      challenge_declined: 'Recusado',
      match_completed: 'Partida',
      ranking_change: 'Ranking',
      photo_uploaded: 'Foto',
      player_joined: 'Novo Jogador',
    };

    return typeMap[type] || 'Atividade';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Feed de Atividades
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Feed de Atividades
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Erro ao carregar atividades
          </p>
        </CardContent>
      </Card>
    );
  }

  const activities = feedData?.data?.feed || [];

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Feed de Atividades
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhuma atividade recente
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                {/* Avatar do criador da atividade */}
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={activity.createdBy?.profilePhoto} 
                    alt={activity.createdBy?.name}
                  />
                  <AvatarFallback>
                    {activity.createdBy?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Header da atividade */}
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className={`${getActivityColor(activity.type)} text-xs`}
                    >
                      {getActivityIcon(activity.type)}
                      <span className="ml-1">{getActivityTypeText(activity.type)}</span>
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>

                  {/* Título e descrição */}
                  <h4 className="font-medium text-gray-900 text-sm">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>

                  {/* Jogadores envolvidos */}
                  {activity.players && activity.players.length > 0 && (
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex -space-x-1">
                        {activity.players.slice(0, 3).map((player, index) => (
                          <Avatar key={player.id} className="w-6 h-6 border-2 border-white">
                            <AvatarImage 
                              src={player.profilePhoto} 
                              alt={player.name}
                            />
                            <AvatarFallback className="text-xs">
                              {player.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {activity.players.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{activity.players.length - 3} outros
                        </span>
                      )}
                    </div>
                  )}

                  {/* Foto da partida se disponível */}
                  {activity.relatedMatch?.resultPhoto && (
                    <div className="mt-2">
                      <img
                        src={activity.relatedMatch.resultPhoto}
                        alt="Foto da partida"
                        className="w-full max-w-xs h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;

