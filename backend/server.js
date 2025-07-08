const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conectar ao MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tennis-ranking';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB:', mongoUri.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/rankings', require('./routes/rankings'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/public', require('./routes/public'));
app.use('/api/notifications', require('./routes/notifications'));

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Ranking de Tênis funcionando!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

