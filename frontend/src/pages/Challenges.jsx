import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challengesAPI, playersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Swords, Plus, Clock, CheckCircle, XCircle, AlertCircle, Trophy, Calendar, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ChatComponent from '../components/ChatComponent';

const Challenges = () => {
  const { player } = useAuth();
  const queryClient = useQueryClient();
  const { getUnreadCount, markAsRead } = useUnreadMessages();
  const [activeTab, setActiveTab] = useState('received');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [challengeMessage, setChallengeMessage] = useState('');
  const [chatChallengeId, setChatChallengeId] = useState(null);

  // Buscar desafios
  const { data: receivedChallenges } = useQuery({
    queryKey: ['challenges', 'received'],
    queryFn: () => challengesAPI.getMy({ type: 'received' }),
  });

  const { data: sentChallenges } = useQuery({
    queryKey: ['challenges', 'sent'],
    queryFn: () => challengesAPI.getMy({ type: 'sent' }),
  });

  // Buscar jogadores disponíveis para desafio
  const { data: availablePlayers } = useQuery({
    queryKey: ['available-players'],
    queryFn: () => playersAPI.getAvailableForChallenge(),
  });

  // Mutation para criar desafio
  const createChallengeMutation = useMutation({
    mutationFn: (data) => challengesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['challenges']);
      setIsCreateDialogOpen(false);
      setSelectedPlayer('');
      setChallengeMessage('');
      toast.success('Desafio enviado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao enviar desafio');
    },
  });

  // Mutation para responder desafio
  const respondChallengeMutation = useMutation({
    mutationFn: ({ id, action }) => challengesAPI.respond(id, action),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['challenges']);
      const action = variables.action === 'accept' ? 'aceito' : 'recusado';
      toast.success(`Desafio ${action} com sucesso!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao responder desafio');
    },
  });

  const handleCreateChallenge = () => {
    if (!selectedPlayer) {
      toast.error('Selecione um jogador para desafiar');
      return;
    }

    createChallengeMutation.mutate({
      challengedId: selectedPlayer,
      message: challengeMessage,
    });
  };

  const handleRespondChallenge = (challengeId, action) => {
    respondChallengeMutation.mutate({ id: challengeId, action });
  };

  const handleOpenChat = (challengeId) => {
    setChatChallengeId(challengeId);
    markAsRead(challengeId);
  };

  const handleCloseChat = () => {
    setChatChallengeId(null);
    // Atualizar queries para refletir mensagens lidas
    queryClient.invalidateQueries(['unread-count']);
    queryClient.invalidateQueries(['my-chats']);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      accepted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Aceito' },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Recusado' },
      expired: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Expirado' },
      completed: { color: 'bg-green-100 text-green-800', icon: Trophy, text: 'Concluído' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const ChallengeCard = ({ challenge, type }) => {
    const isReceived = type === 'received';
    const opponent = isReceived ? challenge.challenger : challenge.challenged;
    const canRespond = isReceived && challenge.status === 'pending';
    const canChat = challenge.status === 'accepted' || challenge.status === 'pending';
    const unreadCount = getUnreadCount(challenge._id);

    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-semibold text-lg">
                  {isReceived ? 'Desafio de' : 'Desafio para'} {opponent.name}
                </h3>
                {getStatusBadge(challenge.status)}
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p>Ranking: #{opponent.ranking} ({opponent.points} pontos)</p>
                <p>Enviado em: {new Date(challenge.createdAt).toLocaleDateString()}</p>
                {challenge.message && (
                  <p className="bg-gray-50 p-2 rounded italic">"{challenge.message}"</p>
                )}
                {challenge.status === 'accepted' && challenge.matchDeadline && (
                  <p className="text-orange-600 font-medium">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Prazo para jogar: {new Date(challenge.matchDeadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-2 ml-4">
              {/* Botão de Chat */}
              {canChat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenChat(challenge._id)}
                  className="flex items-center relative"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                  {unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Botões de Resposta */}
              {canRespond && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleRespondChallenge(challenge._id, 'accept')}
                    disabled={respondChallengeMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespondChallenge(challenge._id, 'decline')}
                    disabled={respondChallengeMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Swords className="h-8 w-8 mr-3 text-blue-600" />
            Desafios
          </h1>
          <p className="text-gray-600">
            Gerencie seus desafios enviados e recebidos
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Desafio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Desafio</DialogTitle>
              <DialogDescription>
                Selecione um jogador para desafiar. Você pode desafiar jogadores até 5 posições acima de você no ranking.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="player">Jogador</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers?.data?.availablePlayers?.map((availablePlayer) => (
                      <SelectItem key={availablePlayer._id} value={availablePlayer._id}>
                        {availablePlayer.name} (#{availablePlayer.ranking} - {availablePlayer.points} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Adicione uma mensagem ao seu desafio..."
                  value={challengeMessage}
                  onChange={(e) => setChallengeMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateChallenge}
                  disabled={createChallengeMutation.isPending}
                >
                  {createChallengeMutation.isPending ? 'Enviando...' : 'Enviar Desafio'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Recebidos ({receivedChallenges?.data?.challenges?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Enviados ({sentChallenges?.data?.challenges?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desafios Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              {!receivedChallenges?.data?.challenges?.length ? (
                <p className="text-center text-gray-500 py-8">
                  Você não recebeu nenhum desafio ainda
                </p>
              ) : (
                <div>
                  {receivedChallenges.data.challenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge._id}
                      challenge={challenge}
                      type="received"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desafios Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              {!sentChallenges?.data?.challenges?.length ? (
                <p className="text-center text-gray-500 py-8">
                  Você não enviou nenhum desafio ainda
                </p>
              ) : (
                <div>
                  {sentChallenges.data.challenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge._id}
                      challenge={challenge}
                      type="sent"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Component */}
      {chatChallengeId && (
        <ChatComponent
          challengeId={chatChallengeId}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default Challenges;

