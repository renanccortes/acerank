import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../hooks/useNotifications';

const NotificationsList = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refetch
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const handleNotificationClick = (notification) => {
    // Navegar para a URL de ação se existir
    if (notification.actionUrl) {
      // Aqui você pode usar o router para navegar
      console.log('Navegar para:', notification.actionUrl);
    }
    
    // Fechar o painel de notificações
    if (onClose) {
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await deleteAllRead();
    } catch (error) {
      console.error('Erro ao deletar notificações lidas:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notificações
              </h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filtros e Ações */}
          <div className="mt-4 space-y-3">
            {/* Filtros */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Não lidas ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Lidas ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Ações */}
            <div className="flex space-x-2">
              <button
                onClick={refetch}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Atualizar</span>
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <CheckCheck size={12} />
                  <span>Marcar todas como lidas</span>
                </button>
              )}
              
              {notifications.some(n => n.read) && (
                <button
                  onClick={handleDeleteAllRead}
                  className="flex items-center space-x-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <Trash2 size={12} />
                  <span>Deletar lidas</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="animate-spin text-gray-400" size={24} />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">
              <p>Erro ao carregar notificações</p>
              <button
                onClick={refetch}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {filter === 'unread' 
                  ? 'Nenhuma notificação não lida'
                  : filter === 'read'
                  ? 'Nenhuma notificação lida'
                  : 'Nenhuma notificação'
                }
              </p>
              <p className="text-sm mt-1">
                {filter === 'all' 
                  ? 'Você receberá notificações sobre desafios, partidas e mensagens aqui.'
                  : 'Altere o filtro para ver outras notificações.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsList;

