import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesAPI, challengesAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Trophy, Clock, MapPin, User, Target } from 'lucide-react';
import { toast } from 'sonner';

const Matches = () => {
  const { player } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    challengeId: '',
    winnerId: '',
    score: '',
    matchDate: '',
    location: '',
    duration: '',
    notes: '',
    sets: [{ player1Score: '', player2Score: '' }]
  });

  // Buscar partidas
  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', 'my-history', page],
    queryFn: () => matchesAPI.getMyHistory({ page, limit: 10 }),
  });

  // Buscar desafios aceitos para registrar resultado
  const { data: acceptedChallenges } = useQuery({
    queryKey: ['challenges', 'accepted'],
    queryFn: () => challengesAPI.getMy({ status: 'accepted' }),
  });

  // Mutation para registrar partida
  const createMatchMutation = useMutation({
    mutationFn: (data) => matchesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      queryClient.invalidateQueries(['challenges']);
      queryClient.invalidateQueries(['player-stats']);
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Resultado registrado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao registrar resultado');
    },
  });

  const resetForm = () => {
    setFormData({
      challengeId: '',
      winnerId: '',
      score: '',
      matchDate: '',
      location: '',
      duration: '',
      notes: '',
      sets: [{ player1Score: '', player2Score: '' }]
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSetChange = (index, field, value) => {
    const newSets = [...formData.sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setFormData(prev => ({ ...prev, sets: newSets }));
  };

  const addSet = () => {
    setFormData(prev => ({
      ...prev,
      sets: [...prev.sets, { player1Score: '', player2Score: '' }]
    }));
  };

  const removeSet = (index) => {
    if (formData.sets.length > 1) {
      const newSets = formData.sets.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, sets: newSets }));
    }
  };

  const handleSubmit = () => {
    if (!formData.challengeId || !formData.winnerId || !formData.score) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const matchData = {
      challengeId: formData.challengeId,
      winnerId: formData.winnerId,
      score: formData.score,
      matchDate: formData.matchDate || new Date().toISOString(),
      location: formData.location,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      notes: formData.notes,
      sets: formData.sets.filter(set => set.player1Score && set.player2Score)
    };

    createMatchMutation.mutate(matchData);
  };

  const getSelectedChallenge = () => {
    return acceptedChallenges?.data?.challenges?.find(
      challenge => challenge._id === formData.challengeId
    );
  };

  const selectedChallenge = getSelectedChallenge();

  const matches = matchesData?.data?.matches || [];
  const totalPages = matchesData?.data?.totalPages || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando partidas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 mr-3 text-green-600" />
            Partidas
          </h1>
          <p className="text-gray-600">
            Histórico de partidas e registro de novos resultados
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Resultado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Resultado da Partida</DialogTitle>
              <DialogDescription>
                Registre o resultado de uma partida de desafio aceito
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label htmlFor="challenge">Desafio</Label>
                <Select value={formData.challengeId} onValueChange={(value) => handleInputChange('challengeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o desafio" />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptedChallenges?.data?.challenges?.map((challenge) => {
                      const opponent = challenge.challenger._id === player?.id ? challenge.challenged : challenge.challenger;
                      return (
                        <SelectItem key={challenge._id} value={challenge._id}>
                          vs {opponent.name} (#{opponent.ranking})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedChallenge && (
                <div>
                  <Label htmlFor="winner">Vencedor</Label>
                  <Select value={formData.winnerId} onValueChange={(value) => handleInputChange('winnerId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vencedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedChallenge.challenger._id}>
                        {selectedChallenge.challenger.name}
                      </SelectItem>
                      <SelectItem value={selectedChallenge.challenged._id}>
                        {selectedChallenge.challenged.name}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="score">Placar *</Label>
                <Input
                  id="score"
                  placeholder="Ex: 6-4, 6-3"
                  value={formData.score}
                  onChange={(e) => handleInputChange('score', e.target.value)}
                />
              </div>

              <div>
                <Label>Sets Detalhados (opcional)</Label>
                {formData.sets.map((set, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      placeholder="Jogador 1"
                      value={set.player1Score}
                      onChange={(e) => handleSetChange(index, 'player1Score', e.target.value)}
                      className="w-20"
                    />
                    <span>x</span>
                    <Input
                      placeholder="Jogador 2"
                      value={set.player2Score}
                      onChange={(e) => handleSetChange(index, 'player2Score', e.target.value)}
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSet(index)}
                      disabled={formData.sets.length === 1}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSet}
                  className="mt-2"
                >
                  Adicionar Set
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="matchDate">Data da Partida</Label>
                  <Input
                    id="matchDate"
                    type="datetime-local"
                    value={formData.matchDate}
                    onChange={(e) => handleInputChange('matchDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="90"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  placeholder="Ex: Clube de Tênis XYZ"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre a partida..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMatchMutation.isPending}
              >
                {createMatchMutation.isPending ? 'Registrando...' : 'Registrar Resultado'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Matches List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhuma partida registrada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const isWinner = match.winner._id === player?.id;
                const opponent = match.player1._id === player?.id ? match.player2 : match.player1;
                
                return (
                  <Card key={match._id} className={`border-l-4 ${
                    isWinner ? 'border-l-green-500' : 'border-l-red-500'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              vs {opponent.name}
                            </h3>
                            <Badge className={isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              <Trophy className="h-3 w-3 mr-1" />
                              {isWinner ? 'Vitória' : 'Derrota'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <p className="font-medium">Placar: {match.score}</p>
                              <p>Ranking oponente: #{opponent.ranking}</p>
                            </div>
                            
                            <div>
                              <p className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(match.matchDate).toLocaleDateString()}
                              </p>
                              {match.location && (
                                <p className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {match.location}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              {match.duration && (
                                <p className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {match.duration} min
                                </p>
                              )}
                              <p className="flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                {isWinner ? '+' : ''}{match.pointsAwarded[isWinner ? 'winner' : 'loser']} pts
                              </p>
                            </div>
                          </div>

                          {match.notes && (
                            <p className="mt-2 text-sm bg-gray-50 p-2 rounded italic">
                              {match.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
    </div>
  );
};

export default Matches;

