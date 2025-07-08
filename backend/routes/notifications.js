const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Buscar notificações do usuário
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.getUserNotifications(
      req.user.id,
      parseInt(limit),
      parseInt(skip)
    );
    
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    
    res.json({
      notifications,
      unreadCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(notifications.length / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar apenas contagem de não lidas
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Erro ao buscar contagem de não lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    await notification.markAsRead();
    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar todas as notificações como lidas
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Deletar notificação
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    res.json({ message: 'Notificação deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Deletar todas as notificações lidas
router.delete('/read', auth, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      read: true
    });
    
    res.json({ message: 'Notificações lidas deletadas com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar notificações lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;

