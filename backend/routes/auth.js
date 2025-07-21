const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const { updateRankings } = require('../utils/ranking');
const {
  registerSchema,
  loginSchema,
  validateSchema,
} = require('../schemas/authSchemas');

const router = express.Router();

// Configurar cliente Google OAuth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Registrar novo jogador
router.post('/register', validateSchema(registerSchema), async (req, res) => {
  try {
    const { name, email, password, phone, level } = req.validatedData;

    // Verificar se o email já existe
    const existingPlayer = await Player.findOne({ email });
    if (existingPlayer) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo jogador
    const player = new Player({
      name,
      email,
      password: hashedPassword,
      phone,
      level: level || 'INIC',
      provisional: true,
      provisionalMatches: 0,
      recusasMesAtual: 0,
      recusaMesRef: new Date(),
    });

    await player.save();

    // Atualizar rankings após adicionar novo jogador
    await updateRankings();

    // Gerar token
    const token = jwt.sign({ playerId: player._id, id: player._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Jogador registrado com sucesso',
      token,
      player: {
        _id: player._id,
        id: player._id,
        name: player.name,
        email: player.email,
        phone: player.phone,
        level: player.level,
        points: player.points,
        ranking: player.ranking,
        provisional: player.provisional,
        provisionalMatches: player.provisionalMatches,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', validateSchema(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    // Buscar jogador
    const player = await Player.findOne({ email });
    if (!player) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await player.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Atualizar última atividade
    player.lastActivity = new Date();
    await player.save();

    // Gerar token
    const token = jwt.sign({ playerId: player._id, id: player._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login realizado com sucesso',
      token,
      player: {
        id: player._id,
        name: player.name,
        email: player.email,
        phone: player.phone,
        points: player.points,
        ranking: player.ranking,
        wins: player.wins,
        losses: player.losses,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', auth, async (req, res) => {
  try {
    res.json({
      player: {
        id: req.player._id,
        name: req.player.name,
        email: req.player.email,
        phone: req.player.phone,
        points: req.player.points,
        ranking: req.player.ranking,
        wins: req.player.wins,
        losses: req.player.losses,
      },
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Login com Google
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token do Google é obrigatório' });
    }

    // Verificar token do Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    // Buscar jogador existente por Google ID ou email
    let player = await Player.findOne({
      $or: [{ googleId: googleId }, { email: email }],
    });

    if (player) {
      // Jogador existe - atualizar Google ID se necessário
      if (!player.googleId) {
        player.googleId = googleId;
        await player.save();
      }

      // Atualizar última atividade
      player.lastActivity = new Date();
      await player.save();
    } else {
      // Criar novo jogador
      player = new Player({
        name: name,
        email: email,
        googleId: googleId,
        // Não definir password para login Google
      });

      await player.save();

      // Atualizar rankings após adicionar novo jogador
      await updateRankings();
    }

    // Gerar token JWT
    const jwtToken = jwt.sign({ playerId: player._id, id: player._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login com Google realizado com sucesso',
      token: jwtToken,
      player: {
        id: player._id,
        name: player.name,
        email: player.email,
        phone: player.phone,
        gender: player.gender,
        region: player.region,
        level: player.level,
        points: player.points,
        ranking: player.ranking,
        rankingGender: player.rankingGender,
        rankingRegion: player.rankingRegion,
        rankingLevel: player.rankingLevel,
        wins: player.wins,
        losses: player.losses,
        winRate: player.getWinRate(),
        progress: player.getProgress(),
      },
    });
  } catch (error) {
    console.error('Erro no login Google:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;
