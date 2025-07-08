import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Trophy, TrendingUp, Calendar, Target, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import PhotoUpload from '../components/PhotoUpload';

const Profile = () => {
  const { player, updatePlayer } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: player?.name || '',
    phone: player?.phone || ''
  });

  // Buscar estatísticas detalhadas
  const { data: stats } = useQuery({
    queryKey: ['player-stats'],
    queryFn: () => playersAPI.getMyStats(),
  });

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data) => playersAPI.updateProfile(data),
    onSuccess: (response) => {
      updatePlayer(response.data.player);
      queryClient.invalidateQueries(['player-stats']);
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      name: player?.name || '',
      phone: player?.phone || ''
    });
    setIsEditing(false);
  };

  const playerStats = stats?.data?.stats;

  const getStreakText = () => {
    if (!playerStats?.currentStreak) return 'Nenhuma';
    
    const type = playerStats.streakType === 'win' ? 'vitórias' : 'derrotas';
    return `${playerStats.currentStreak} ${type} consecutivas`;
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 70) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <User className="h-8 w-8 mr-3 text-blue-600" />
          Meu Perfil
        </h1>
        <p className="text-gray-600">
          Gerencie suas informações pessoais e veja suas estatísticas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Pessoais */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações Pessoais</CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload de Foto de Perfil */}
              <div className="flex justify-center">
                <PhotoUpload
                  type="profile"
                  currentPhoto={player?.profilePhoto}
                  onPhotoUploaded={(photoUrl) => {
                    updatePlayer({ ...player, profilePhoto: photoUrl });
                  }}
                />
              </div>

              <Separator />

              <div>
                <Label htmlFor="name">Nome Completo</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{player?.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <p className="mt-1 text-sm text-gray-900">{player?.email}</p>
                <p className="text-xs text-gray-500">O email não pode ser alterado</p>
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {player?.phone || 'Não informado'}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <Label>Data de Cadastro</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(player?.joinedAt || Date.now()).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Atual */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                Ranking Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  #{player?.ranking || 'N/A'}
                </div>
                <p className="text-sm text-gray-600">Posição no ranking</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pontos:</span>
                  <span className="font-medium">{player?.points || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Vitórias:</span>
                  <span className="font-medium text-green-600">{player?.wins || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Derrotas:</span>
                  <span className="font-medium text-red-600">{player?.losses || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Estatísticas Detalhadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {playerStats?.totalMatches || 0}
              </div>
              <p className="text-sm text-gray-600">Total de Partidas</p>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${getWinRateColor(playerStats?.winRate || 0)}`}>
                {playerStats?.winRate || 0}%
              </div>
              <p className="text-sm text-gray-600">Taxa de Vitórias</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {getStreakText()}
              </div>
              <p className="text-sm text-gray-600">Sequência Atual</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {player?.activeChallenges || 0}
              </div>
              <p className="text-sm text-gray-600">Desafios Ativos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partidas Recentes */}
      {playerStats?.recentMatches?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Últimas Partidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerStats.recentMatches.map((match) => {
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
                        <p className="font-medium">vs {opponent.name}</p>
                        <p className="text-sm text-gray-500">{match.score}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {isWinner ? 'Vitória' : 'Derrota'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;

