# Guia de Deployment - Sistema de Ranking de Tênis

Este guia fornece instruções detalhadas para fazer o deploy do sistema em produção.

## 🚀 Opções de Deployment

### 1. Deploy Local (Desenvolvimento)

#### Pré-requisitos
- Node.js 18+
- MongoDB
- Git

#### Passos
```bash
# 1. Clonar o repositório
git clone <repository-url>
cd tennis-ranking-mvp

# 2. Configurar Backend
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run dev

# 3. Configurar Frontend
cd ../frontend
pnpm install
pnpm run dev --host
```

### 2. Deploy em VPS (Produção)

#### Configuração do Servidor
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y
```

#### Deploy da Aplicação
```bash
# 1. Clonar código
git clone <repository-url> /var/www/tennis-ranking
cd /var/www/tennis-ranking

# 2. Configurar Backend
cd backend
npm install --production
cp .env.example .env
# Editar .env para produção

# 3. Build Frontend
cd ../frontend
npm install
npm run build

# 4. Configurar PM2
pm2 start backend/server.js --name "tennis-ranking-api"
pm2 startup
pm2 save
```

#### Configuração do Nginx
```nginx
# /etc/nginx/sites-available/tennis-ranking
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        root /var/www/tennis-ranking/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/tennis-ranking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Deploy com Docker

#### Dockerfile Backend
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

#### Dockerfile Frontend
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: tennis-ranking-db
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: tennis-ranking
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: tennis-ranking-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/tennis-ranking
      - JWT_SECRET=your-super-secret-jwt-key
    depends_on:
      - mongodb
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    container_name: tennis-ranking-web
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

```bash
# Deploy com Docker
docker-compose up -d
```

### 4. Deploy na Vercel (Frontend) + Railway (Backend)

#### Frontend na Vercel
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
cd frontend
vercel --prod
```

#### Backend no Railway
1. Conectar repositório no Railway
2. Configurar variáveis de ambiente
3. Deploy automático

### 5. Deploy Completo na AWS

#### Configuração EC2
```bash
# 1. Criar instância EC2 (Ubuntu 22.04)
# 2. Configurar Security Groups (80, 443, 22, 5000)
# 3. Conectar via SSH

# 4. Instalar dependências
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

# 5. Configurar MongoDB Atlas (recomendado)
# Ou instalar MongoDB local
```

#### Configuração SSL
```bash
# Certificado SSL gratuito
sudo certbot --nginx -d seu-dominio.com
```

## 🔧 Variáveis de Ambiente

### Backend (.env)
```env
# Servidor
PORT=5000
NODE_ENV=production

# Banco de dados
MONGODB_URI=mongodb://localhost:27017/tennis-ranking
# Ou MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/tennis-ranking

# Autenticação
JWT_SECRET=sua-chave-super-secreta-aqui

# CORS (opcional)
FRONTEND_URL=https://seu-dominio.com
```

### Frontend
```env
# API URL
VITE_API_URL=https://api.seu-dominio.com
```

## 📊 Monitoramento

### PM2 Monitoring
```bash
# Status dos processos
pm2 status

# Logs
pm2 logs tennis-ranking-api

# Restart
pm2 restart tennis-ranking-api

# Monitoramento web
pm2 plus
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB Monitoring
```bash
# Status
sudo systemctl status mongod

# Logs
sudo tail -f /var/log/mongodb/mongod.log
```

## 🔒 Segurança em Produção

### 1. Firewall
```bash
# UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 2. MongoDB Security
```bash
# Criar usuário admin
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "senha-forte",
  roles: ["userAdminAnyDatabase"]
})

# Habilitar autenticação
sudo nano /etc/mongod.conf
# security:
#   authorization: enabled
```

### 3. Nginx Security Headers
```nginx
# Adicionar ao bloco server
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 🚨 Backup

### Backup MongoDB
```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db tennis-ranking --out /backup/mongodb_$DATE
tar -czf /backup/mongodb_$DATE.tar.gz /backup/mongodb_$DATE
rm -rf /backup/mongodb_$DATE

# Cron job (diário às 2h)
0 2 * * * /path/to/backup-script.sh
```

### Backup Código
```bash
# Git backup
git push origin main

# Arquivos de configuração
tar -czf /backup/config_$(date +%Y%m%d).tar.gz /etc/nginx /var/www/tennis-ranking/.env
```

## 📈 Performance

### 1. Otimizações do Frontend
```bash
# Build otimizado
npm run build

# Compressão Gzip no Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 2. Otimizações do Backend
```javascript
// Índices MongoDB
db.players.createIndex({ ranking: 1 })
db.players.createIndex({ points: -1 })
db.challenges.createIndex({ challenger: 1, status: 1 })
db.matches.createIndex({ matchDate: -1 })
```

### 3. Cache
```nginx
# Cache estático
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 CI/CD

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /var/www/tennis-ranking
            git pull origin main
            cd backend && npm install --production
            cd ../frontend && npm install && npm run build
            pm2 restart tennis-ranking-api
```

## 📞 Suporte

Para problemas de deployment:
1. Verificar logs do PM2: `pm2 logs`
2. Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verificar status do MongoDB: `sudo systemctl status mongod`
4. Testar conectividade da API: `curl http://localhost:5000`

---

**Deployment realizado com sucesso! 🚀**

