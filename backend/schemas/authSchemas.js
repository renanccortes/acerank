const { z } = require('zod');

// Schema para registro de usuário
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  email: z
    .string()
    .email('Email deve ter um formato válido')
    .max(255, 'Email não pode ter mais de 255 caracteres')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha não pode ter mais de 100 caracteres'),
  level: z
    .enum(['iniciante', 'intermediario', 'avancado', 'profissional'], {
      errorMap: () => ({ message: 'Nível deve ser iniciante, intermediario, avancado ou profissional' }),
    }),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
});

// Schema para login
const loginSchema = z.object({
  email: z
    .string()
    .email('Email deve ter um formato válido')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
});

// Schema para atualização de perfil
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio não pode ter mais de 500 caracteres')
    .optional(),
});

// Schema para mudança de senha
const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
    .max(100, 'Nova senha não pode ter mais de 100 caracteres'),
});

// Middleware de validação genérico
const validateSchema = schema => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      console.log(error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  validateSchema,
};

