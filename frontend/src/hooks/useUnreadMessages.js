import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatAPI } from '../lib/api';

export const useUnreadMessages = () => {
  const [unreadCounts, setUnreadCounts] = useState({});

  // Buscar contagem total de mensagens não lidas
  const { data: totalUnread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => chatAPI.getUnreadCount(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar chats do usuário para obter contagens individuais
  const { data: myChats } = useQuery({
    queryKey: ['my-chats'],
    queryFn: () => chatAPI.getMyChats(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (myChats?.data?.chats) {
      const counts = {};
      myChats.data.chats.forEach(chat => {
        if (chat.challenge && chat.unreadCount > 0) {
          counts[chat.challenge._id] = chat.unreadCount;
        }
      });
      setUnreadCounts(counts);
    }
  }, [myChats]);

  const markAsRead = (challengeId) => {
    setUnreadCounts(prev => ({
      ...prev,
      [challengeId]: 0
    }));
  };

  const getUnreadCount = (challengeId) => {
    return unreadCounts[challengeId] || 0;
  };

  const getTotalUnread = () => {
    return totalUnread?.data?.count || 0;
  };

  return {
    unreadCounts,
    getUnreadCount,
    getTotalUnread,
    markAsRead,
  };
};

