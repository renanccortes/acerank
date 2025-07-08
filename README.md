# Sistema de Ranking de Tênis - MVP

Um sistema completo de ranking de jogadores de tênis desenvolvido com Node.js, React e MongoDB.

## 🏆 Funcionalidades Implementadas

### Autenticação e Usuários
- ✅ Registro de novos jogadores
- ✅ Login/logout com JWT
- ✅ Proteção de rotas
- ✅ Gerenciamento de perfil

### Sistema de Ranking
- ✅ Ranking dinâmico baseado em pontuação
- ✅ Novatos começam na última posição (1000 pontos)
- ✅ Atualização automática após partidas
- ✅ Visualização do ranking completo

### Sistema de Desafios
- ✅ Criação de desafios entre jogadores
- ✅ Limite de posições para desafio (5 posições acima, 10 para novatos)
- ✅ Aceitação/recusa de desafios
- ✅ Prazo de 48h para resposta
- ✅ Prazo de 7 dias para jogar após aceitar
- ✅ Limite de 3 desafios ativos por jogador

### Sistema de Partidas
- ✅ Registro de resultados de partidas
- ✅ Cálculo automático de pontuação
- ✅ Histórico completo de partidas
- ✅ Estatísticas detalhadas dos jogadores

### Interface do Usuário
- ✅ Dashboard com estatísticas
- ✅ Página de ranking com busca
- ✅ Gerenciamento de desafios
- ✅ Histórico de partidas
- ✅ Perfil do usuário
- ✅ Design responsivo com Tailwind CSS

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **CORS** - Controle de acesso

### Frontend
- **React** - Biblioteca de interface
- **React Router** - Roteamento
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Lucide Icons** - Ícones
- **Axios** - Cliente HTTP
- **React Query** - Gerenciamento de estado

## 📁 Estrutura do Projeto

```
tennis-ranking-mvp/
├── backend/
│   ├── models/          # Modelos de dados (Player, Challenge, Match)
│   ├── routes/          # Rotas da API (auth, players, challenges, matches)
│   ├── middleware/      # Middleware de autenticação
│   ├── utils/           # Utilitários (cálculo de ranking)
│   ├── server.js        # Servidor principal
│   └── package.json     # Dependências do backend
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── contexts/    # Contextos React (Auth)
│   │   ├── lib/         # Configurações (API, auth)
│   │   └── App.jsx      # Componente principal
│   └── package.json     # Dependências do frontend
└── README.md           # Esta documentação
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v18+)
- MongoDB
- npm ou pnpm

### 1. Configurar o Backend

```bash
cd backend
npm install
```

Criar arquivo `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tennis-ranking
JWT_SECRET=tennis_ranking_secret_key_2024
NODE_ENV=development
```

Iniciar o servidor:
```bash
npm run dev
```

### 2. Configurar o Frontend

```bash
cd frontend
pnpm install
pnpm run dev --host
```

### 3. Acessar a Aplicação

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📊 Regras de Pontuação

### Pontuação Base
- **Vitória**: 20 pontos + bônus por diferença de ranking
- **Derrota**: Penalidade baseada na diferença de ranking
- **Participação**: 10 pontos por partida jogada

### Cálculo de Pontos
```javascript
// Pontos por vitória
Pv = 20 + (Ranking_Perdedor - Ranking_Vencedor) * 2 + 10

// Pontos por derrota
Pd = -10 - (Ranking_Vencedor - Ranking_Perdedor) * 1 + 10
```

### Regras de Desafio
- Jogadores podem desafiar até 5 posições acima
- Novatos (ranking > 50) podem desafiar até 10 posições acima
- Máximo de 3 desafios ativos por jogador
- Prazo de 48h para aceitar/recusar
- Prazo de 7 dias para jogar após aceitar

## 🎯 Funcionalidades do MVP

### Dashboard
- Estatísticas do jogador atual
- Desafios pendentes
- Top 10 do ranking
- Partidas recentes

### Ranking
- Lista completa de jogadores
- Busca por nome
- Destaque para o jogador atual
- Paginação

### Desafios
- Criar novos desafios
- Aceitar/recusar desafios recebidos
- Visualizar desafios enviados
- Status em tempo real

### Partidas
- Registrar resultados
- Histórico completo
- Detalhes da partida
- Pontuação calculada

### Perfil
- Editar informações pessoais
- Estatísticas detalhadas
- Histórico de atividades

## 🔧 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verificar token

### Jogadores
- `GET /api/players` - Listar jogadores (ranking)
- `GET /api/players/:id` - Buscar jogador
- `PUT /api/players/profile` - Atualizar perfil
- `GET /api/players/available/challenge` - Jogadores disponíveis para desafio

### Desafios
- `POST /api/challenges` - Criar desafio
- `GET /api/challenges/my` - Meus desafios
- `PUT /api/challenges/:id/respond` - Responder desafio

### Partidas
- `POST /api/matches` - Registrar partida
- `GET /api/matches` - Listar partidas
- `GET /api/matches/my/history` - Meu histórico

## 🎨 Design e UX

- Interface moderna e responsiva
- Cores temáticas do tênis
- Navegação intuitiva
- Feedback visual para ações
- Estados de loading
- Tratamento de erros

## 🔒 Segurança

- Autenticação JWT
- Hash de senhas com bcrypt
- Validação de dados
- Proteção de rotas
- CORS configurado

## 📈 Próximos Passos

### Melhorias Sugeridas
1. **Notificações em tempo real** (WebSocket)
2. **Sistema de torneios**
3. **Chat entre jogadores**
4. **Integração com calendário**
5. **Estatísticas avançadas**
6. **Sistema de níveis/divisões**
7. **Aplicativo mobile**
8. **Pagamentos integrados**

### Monetização
- Assinaturas premium
- Publicidade direcionada
- Eventos e torneios pagos
- Parcerias com clubes
- Merchandising

## 🧪 Testes Realizados

✅ Registro de usuário funcionando
✅ Login/logout funcionando
✅ Dashboard carregando corretamente
✅ Ranking exibindo jogadores
✅ Navegação entre páginas
✅ Interface responsiva
✅ API endpoints respondendo
✅ Banco de dados conectado

## 📝 Licença

Este projeto foi desenvolvido como MVP para demonstração das funcionalidades de um sistema de ranking de tênis.

---

**Desenvolvido com ❤️ para a comunidade de tênis**

