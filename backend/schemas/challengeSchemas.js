const { z } = require('zod');

// Schema para criação de desafio
const createChallengeSchema = z.object({
  challengedId: z
    .string()
    .min(1, 'ID do jogador desafiado é obrigatório')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID do jogador deve ser um ObjectId válido'),
  message: z
    .string()
    .max(500, 'Mensagem não pode ter mais de 500 caracteres')
    .optional(),
});

// Schema para resposta ao desafio
const respondChallengeSchema = z.object({
  action: z.enum(['accept', 'decline'], {
    errorMap: () => ({ message: 'Ação deve ser "accept" ou "decline"' }),
  }),
});

// Schema para cancelar desafio
const cancelChallengeSchema = z.object({
  reason: z
    .string()
    .max(200, 'Motivo não pode ter mais de 200 caracteres')
    .optional(),
});

// Middleware de validação genérico
const validateSchema = schema => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
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
  createChallengeSchema,
  respondChallengeSchema,
  cancelChallengeSchema,
  validateSchema,
};
