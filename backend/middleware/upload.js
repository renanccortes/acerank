const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configurar diretório de uploads
const uploadDir = path.join(__dirname, '../uploads/profiles');

// Criar diretório se não existir
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Configuração do multer para armazenamento em memória
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

// Middleware para processar e salvar imagem
const processProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    await ensureUploadDir();

    const playerId = req.player._id.toString();
    const filename = `profile_${playerId}_${Date.now()}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Processar imagem com Sharp
    await sharp(req.file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Adicionar informações do arquivo processado ao request
    req.processedFile = {
      filename,
      filepath,
      url: `/uploads/profiles/${filename}`
    };

    next();
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    res.status(500).json({ 
      message: 'Erro ao processar imagem',
      error: error.message 
    });
  }
};

// Middleware para deletar imagem antiga
const deleteOldProfileImage = async (req, res, next) => {
  try {
    const player = req.player;
    
    if (player.profileImage) {
      const oldImagePath = path.join(__dirname, '../', player.profileImage);
      
      try {
        await fs.access(oldImagePath);
        await fs.unlink(oldImagePath);
        console.log('Imagem antiga removida:', oldImagePath);
      } catch (error) {
        console.log('Imagem antiga não encontrada ou já removida');
      }
    }

    next();
  } catch (error) {
    console.error('Erro ao remover imagem antiga:', error);
    next(); // Continua mesmo com erro na remoção
  }
};

module.exports = {
  upload: upload.single('profileImage'),
  processProfileImage,
  deleteOldProfileImage,
  uploadDir,
};

