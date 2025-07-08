import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar notificações
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.notificationsAPI.getNotifications(page, limit);
      
      if (page === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }
      
      setUnreadCount(response.unreadCount);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar apenas contagem de não lidas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.notificationsAPI.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (err) {
      console.error('Erro ao buscar contagem de não lidas:', err);
    }
  }, []);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.notificationsAPI.markAsRead(notificationId);
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Decrementar contador se a notificação não estava lida
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === notificationId);
        return notification && !notification.read ? prev - 1 : prev;
      });
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
      throw err;
    }
  }, [notifications]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await api.notificationsAPI.markAllAsRead();
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      throw err;
    }
  }, []);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.notificationsAPI.deleteNotification(notificationId);
      
      // Remover do estado local
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      // Decrementar contador se não estava lida
      if (notification && !notification.read) {
        setUnreadCount(prev => prev - 1);
      }
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
      throw err;
    }
  }, [notifications]);

  // Deletar todas as lidas
  const deleteAllRead = useCallback(async () => {
    try {
      await api.notificationsAPI.deleteAllRead();
      
      // Remover lidas do estado local
      setNotifications(prev => prev.filter(notification => !notification.read));
    } catch (err) {
      console.error('Erro ao deletar notificações lidas:', err);
      throw err;
    }
  }, []);

  // Adicionar nova notificação (para uso com WebSocket ou polling)
  const addNotification = useCallback((newNotification) => {
    setNotifications(prev => [newNotification, ...prev]);
    if (!newNotification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Polling para buscar novas notificações
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Buscar notificações iniciais
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    addNotification,
    refetch: () => fetchNotifications(1)
  };
};

