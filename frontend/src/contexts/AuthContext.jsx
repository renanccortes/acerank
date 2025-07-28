import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { getToken, setToken, removeToken, getPlayer, setPlayer, removePlayer } from '../lib/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [player, setPlayerState] = useState(getPlayer());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = getToken();
      if (token) {
        try {
          const response = await authAPI.verify();
          setPlayerState(response.data.player);
          setPlayer(response.data.player);
        } catch (error) {
          console.error('Token inválido:', error);
          removeToken();
          removePlayer();
          setPlayerState(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, player } = response.data;
      
      setToken(token);
      setPlayer(player);
      setPlayerState(player);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await authAPI.googleLogin({ token: googleToken });
      const { token, player } = response.data;
      
      setToken(token);
      setPlayer(player);
      setPlayerState(player);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login com Google' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      console.log(response);
      const { token, player } = response.data;
      
      setToken(token);
      setPlayer(player);
      setPlayerState(player);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao registrar' 
      };
    }
  };

  const logout = () => {
    removeToken();
    removePlayer();
    setPlayerState(null);
  };

  const updatePlayer = (updatedPlayer) => {
    setPlayerState(updatedPlayer);
    setPlayer(updatedPlayer);
  };

  const value = {
    player,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updatePlayer,
    isAuthenticated: !!player,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

