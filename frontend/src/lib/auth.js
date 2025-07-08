// Funções utilitárias para autenticação
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getPlayer = () => {
  const playerData = localStorage.getItem('player');
  return playerData ? JSON.parse(playerData) : null;
};

export const setPlayer = (player) => {
  localStorage.setItem('player', JSON.stringify(player));
};

export const removePlayer = () => {
  localStorage.removeItem('player');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  removeToken();
  removePlayer();
  window.location.href = '/login';
};

