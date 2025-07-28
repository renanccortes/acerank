import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import  ptBR  from 'date-fns/locale/pt-BR';
import { 
  Bell, 
  Trophy, 
  MessageCircle, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  X,
  ExternalLink
} from 'lucide-react';

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onClick 
}) => {
  const getIcon = (type) => {
    const iconProps = { size: 20, className: "flex-shrink-0" };
    
    switch (type) {
      case 'challenge_received':
        return <Trophy {...iconProps} className="text-blue-500" />;
      case 'challenge_accepted':
        return <UserCheck {...iconProps} className="text-green-500" />;
      case 'challenge_declined':
        return <UserX {...iconProps} className="text-red-500" />;
      case 'challenge_expired':
        return <Clock {...iconProps} className="text-gray-500" />;
      case 'match_result_submitted':
        return <CheckCircle {...iconProps} className="text-blue-500" />;
      case 'match_result_validated':
        return <CheckCircle {...iconProps} className="text-green-500" />;
      case 'match_result_disputed':
        return <AlertTriangle {...iconProps} className="text-red-500" />;
      case 'ranking_updated':
        return <Trophy {...iconProps} className="text-yellow-500" />;
      case 'new_message':
        return <MessageCircle {...iconProps} className="text-blue-500" />;
      case 'system_announcement':
        return <Bell {...iconProps} className="text-purple-500" />;
      default:
        return <Bell {...iconProps} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification._id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <div
      className={`
        relative border-l-4 p-4 cursor-pointer transition-all duration-200 hover:shadow-md
        ${notification.read ? 'bg-white border-l-gray-300' : getPriorityColor(notification.priority)}
        ${!notification.read ? 'font-medium' : ''}
      `}
      onClick={handleClick}
    >
      {/* Indicador de não lida */}
      {!notification.read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}

      <div className="flex items-start space-x-3">
        {/* Ícone */}
        <div className="mt-1">
          {getIcon(notification.type)}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
              
              {/* Remetente */}
              {notification.sender && (
                <p className="text-xs text-gray-500 mt-1">
                  De: {notification.sender.name}
                </p>
              )}
            </div>

            {/* Botão de deletar */}
            <button
              onClick={handleDelete}
              className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Deletar notificação"
            >
              <X size={16} />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {timeAgo}
            </span>

            {/* Link de ação */}
            {notification.actionUrl && (
              <div className="flex items-center text-xs text-blue-600 hover:text-blue-800">
                <ExternalLink size={12} className="mr-1" />
                Ver detalhes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;

