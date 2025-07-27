// Configuração da API usando fetch nativo
const API_BASE_URL = 'https://5000-iiukw5dlw67vki78v4tyi-c3bf800c.manusvm.computer/api';

// Função auxiliar para fazer requisições
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }
    
    return data;
  } catch (error) {
    console.error('Erro na API:', error);
    throw error;
  }
};

// Funções de autenticação
export const authAPI = {
  register: (data) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  googleLogin: (data) => apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  verify: () => apiRequest('/auth/verify'),
};

// Funções de jogadores
export const playersAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/players${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/players/${id}`),
  
  updateProfile: (data) => apiRequest('/players/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  getAvailableForChallenge: () => apiRequest('/players/available/challenge'),
  
  getMyStats: () => apiRequest('/players/me/stats'),
};

// Funções de desafios
export const challengesAPI = {
  create: (data) => apiRequest('/challenges', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getMy: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/challenges/my${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/challenges/${id}`),
  
  getPreview: (challengedId) => apiRequest(`/challenges/preview/${challengedId}`),
  
  respond: (id, action) => apiRequest(`/challenges/${id}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  }),
};

// Funções de partidas
export const matchesAPI = {
  create: (data) => apiRequest('/matches', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/matches${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/matches/${id}`),
  
  getMyHistory: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/matches/my/history${query ? `?${query}` : ''}`);
  },
  
  getPendingValidation: () => apiRequest('/matches/pending-validation'),
  
  validate: (id, data) => apiRequest(`/matches/${id}/validate`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  autoValidateExpired: () => apiRequest('/matches/auto-validate-expired', {
    method: 'POST',
  }),
};

// Funções de chat
export const chatAPI = {
  getChatByChallenge: (challengeId) => apiRequest(`/chat/challenge/${challengeId}`),
  
  sendMessage: (challengeId, data) => apiRequest(`/chat/challenge/${challengeId}/message`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  markAsRead: (challengeId) => apiRequest(`/chat/challenge/${challengeId}/read`, {
    method: 'PUT',
  }),
  
  getMyChats: () => apiRequest('/chat/my-chats'),
  
  getUnreadCount: () => apiRequest('/chat/unread-count'),
};

// Funções de upload
export const uploadAPI = {
  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/upload/profile`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro no upload');
    }
    
    return data;
  },
  
  uploadMatchPhoto: async (matchId, file) => {
    const formData = new FormData();
    formData.append('resultPhoto', file);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/upload/match/${matchId}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro no upload');
    }
    
    return data;
  },
  
  removeProfilePhoto: () => apiRequest('/upload/profile', {
    method: 'DELETE',
  }),
};

// Funções de atividades
export const activitiesAPI = {
  getFeed: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/activities${query ? `?${query}` : ''}`);
  },
  
  getFeedByType: (type, params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/activities/type/${type}${query ? `?${query}` : ''}`);
  },
  
  getPlayerActivities: (playerId, params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/activities/player/${playerId}${query ? `?${query}` : ''}`);
  },
};

// Funções públicas (não requerem autenticação)
export const publicAPI = {
  getRanking: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/public/ranking${query ? `?${query}` : ''}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }
    
    return data;
  },
  
  getFeed: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/public/feed${query ? `?${query}` : ''}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }
    
    return data;
  },
  
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/public/stats`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }
    
    return data;
  },
};

// API de Notificações
const notificationsAPI = {
  // Buscar notificações do usuário
  getNotifications: async (page = 1, limit = 20) => {
    return apiRequest(`/notifications?page=${page}&limit=${limit}`);
  },
  
  // Buscar contagem de não lidas
  getUnreadCount: async () => {
    return apiRequest('/notifications/unread-count');
  },
  
  // Marcar notificação como lida
  markAsRead: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  },
  
  // Marcar todas como lidas
  markAllAsRead: async () => {
    return apiRequest('/notifications/mark-all-read', {
      method: 'PUT'
    });
  },
  
  // Deletar notificação
  deleteNotification: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  },
  
  // Deletar todas as lidas
  deleteAllRead: async () => {
    return apiRequest('/notifications/read', {
      method: 'DELETE'
    });
  }
};

export default { authAPI, playersAPI, challengesAPI, matchesAPI, chatAPI, uploadAPI, activitiesAPI, publicAPI, notificationsAPI };

