const express = require('express');
const router = express.Router();
const { upload, processProfileImage, deleteOldProfileImage } = require('../middleware/upload');
const auth = require('../middleware/auth');
const Player = require('../models/Player');
const Activity = require('../models/Activity');
const path = require('path');
const fs = require('fs');

// Upload de foto de perfil
router.post(
  '/profile',
  auth,
  upload,
  processProfileImage,
  deleteOldProfileImage,
  async (req, res) => {
    try {
      if (!req.processedFile) {
        return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
      }

      const player = await Player.findById(req.player._id);
      if (!player) {
        return res.status(404).json({ message: 'Jogador não encontrado' });
      }

      // Atualizar caminho da foto de perfil
      player.profileImage = req.processedFile.url;
      await player.save();

      // Criar atividade
      await Activity.create({
        type: 'photo_uploaded',
        title: 'Foto de perfil atualizada',
        description: `${player.name} atualizou sua foto de perfil`,
        createdBy: player._id,
        players: [player._id],
      });

      res.json({
        success: true,
        message: 'Foto de perfil atualizada com sucesso',
        data: {
          profileImage: req.processedFile.url,
          player: {
            _id: player._id,
            name: player.name,
            profileImage: req.processedFile.url,
          },
        },
      });
    } catch (error) {
      console.error('Erro no upload da foto de perfil:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

// Servir arquivos de upload de perfil
router.get('/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', 'profiles', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Arquivo não encontrado' });
  }
});

// Remover foto de perfil
router.delete('/profile', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player._id);
    if (!player) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }

    if (player.profileImage) {
      const photoPath = path.join(__dirname, '..', player.profileImage);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }

      player.profileImage = null;
      await player.save();
    }

    res.json({ message: 'Foto de perfil removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover foto de perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Upload de foto de resultado de partida
router.post(
  '/match/:matchId',
  auth,
  upload.single('resultPhoto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
      }

      const match = await Match.findById(req.params.matchId)
        .populate('player1', 'name')
        .populate('player2', 'name');

      if (!match) {
        return res.status(404).json({ message: 'Partida não encontrada' });
      }

      // Verificar se o usuário participou da partida
      const isParticipant =
        match.player1._id.toString() === req.player.id ||
        match.player2._id.toString() === req.player.id;

      if (!isParticipant) {
        return res.status(403).json({
          message: 'Você não tem permissão para adicionar foto a esta partida',
        });
      }

      // Remover foto anterior se existir
      if (match.resultPhoto) {
        const oldPhotoPath = path.join(__dirname, '..', match.resultPhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Atualizar caminho da foto no banco
      const photoPath = `uploads/matches/${req.file.filename}`;
      match.resultPhoto = photoPath;
      await match.save();

      // Criar atividade no feed
      const player = await Player.findById(req.player.id);
      await Activity.create({
        type: 'photo_uploaded',
        title: 'Foto de resultado adicionada',
        description: `${player.name} adicionou uma foto ao resultado da partida entre ${match.player1.name} e ${match.player2.name}`,
        players: [match.player1._id, match.player2._id],
        relatedMatch: match._id,
        createdBy: player._id,
        metadata: {
          photoType: 'match_result',
        },
      });

      res.json({
        message: 'Foto de resultado adicionada com sucesso',
        photoUrl: `/api/uploads/${photoPath}`,
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto de resultado:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

// Servir arquivos de upload
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Arquivo não encontrado' });
  }
});

// Servir arquivos de upload de partidas
router.get('/uploads/matches/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', 'matches', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Arquivo não encontrado' });
  }
});

// Remover foto de perfil
router.delete('/profile', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player.id);
    if (!player) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }

    if (player.profilePhoto) {
      const photoPath = path.join(__dirname, '..', player.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }

      player.profilePhoto = null;
      await player.save();
    }

    res.json({ message: 'Foto de perfil removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover foto de perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;
