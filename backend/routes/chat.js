const express = require('express');
const Chat = require('../models/Chat');
const Challenge = require('../models/Challenge');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const NotificationService = require('../utils/notifications');

const router = express.Router();

// Criar ou obter chat para um desafio
router.get('/challenge/:challengeId', auth, async (req, res) => {
  try {
    const { challengeId } = req.params;

    // Verificar se o desafio existe
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }

    // Verificar se o jogador está envolvido no desafio
    const isInvolved =
      challenge.challenger.toString() === req.player._id.toString() ||
      challenge.challenged.toString() === req.player._id.toString();

    if (!isInvolved) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Buscar chat existente ou criar novo
    let chat = await Chat.findOne({ challenge: challengeId })
      .populate('participants', 'name')
      .populate('messages.sender', 'name');

    if (!chat) {
      // Criar novo chat
      chat = new Chat({
        challenge: challengeId,
        participants: [challenge.challenger, challenge.challenged],
        messages: [],
      });
      await chat.save();
      await chat.populate('participants', 'name');
    }

    res.json({ chat });
  } catch (error) {
    console.error('Erro ao obter chat:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Enviar mensagem
router.post('/challenge/:challengeId/message', auth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res
        .status(400)
        .json({ message: 'Conteúdo da mensagem é obrigatório' });
    }

    // Verificar se o desafio existe
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }

    // Verificar se o jogador está envolvido no desafio
    const isInvolved =
      challenge.challenger.toString() === req.player._id.toString() ||
      challenge.challenged.toString() === req.player._id.toString();

    if (!isInvolved) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Buscar ou criar chat
    let chat = await Chat.findOne({ challenge: challengeId });

    if (!chat) {
      chat = new Chat({
        challenge: challengeId,
        participants: [challenge.challenger, challenge.challenged],
        messages: [],
      });
    }

    // Adicionar mensagem
    chat.messages.push({
      sender: req.player._id,
      content: content.trim(),
      timestamp: new Date(),
    });

    await chat.save();

    // Enviar notificação para o outro participante
    const recipientId =
      req.player._id.toString() === challenge.challenger.toString()
        ? challenge.challenged
        : challenge.challenger;

    try {
      await NotificationService.newMessage(
        req.player._id,
        recipientId,
        challengeId,
        chat._id
      );
    } catch (notificationError) {
      console.error(
        'Erro ao enviar notificação de mensagem:',
        notificationError
      );
      // Não falha o envio da mensagem se a notificação falhar
    }

    // Popular dados para resposta
    await chat.populate('messages.sender', 'name');

    // Retornar apenas a última mensagem
    const lastMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json({
      message: 'Mensagem enviada com sucesso',
      chatMessage: lastMessage,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar mensagens como lidas
router.put('/challenge/:challengeId/read', auth, async (req, res) => {
  try {
    const { challengeId } = req.params;

    const chat = await Chat.findOne({ challenge: challengeId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }

    // Verificar se o jogador está envolvido no chat
    const isParticipant = chat.participants.some(
      p => p.toString() === req.player._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Marcar todas as mensagens do outro jogador como lidas
    chat.messages.forEach(message => {
      if (message.sender.toString() !== req.player._id.toString()) {
        message.read = true;
      }
    });

    await chat.save();

    res.json({ message: 'Mensagens marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar chats do jogador
router.get('/my-chats', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.player._id,
      active: true,
    })
      .populate('participants', 'name')
      .populate('challenge', 'status')
      .populate('messages.sender', 'name')
      .sort({ lastActivity: -1 });

    // Adicionar informações sobre mensagens não lidas
    const chatsWithUnread = chats.map(chat => {
      const unreadCount = chat.messages.filter(
        msg => msg.sender.toString() !== req.player._id.toString() && !msg.read
      ).length;

      const lastMessage =
        chat.messages.length > 0
          ? chat.messages[chat.messages.length - 1]
          : null;

      return {
        ...chat.toObject(),
        unreadCount,
        lastMessage,
      };
    });

    res.json({ chats: chatsWithUnread });
  } catch (error) {
    console.error('Erro ao listar chats:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de mensagens não lidas
router.get('/unread-count', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.player._id,
      active: true,
    });

    let totalUnread = 0;

    chats.forEach(chat => {
      const unread = chat.messages.filter(
        msg => msg.sender.toString() !== req.player._id.toString() && !msg.read
      ).length;
      totalUnread += unread;
    });

    res.json({ totalUnread });
  } catch (error) {
    console.error('Erro ao obter contagem de não lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;
