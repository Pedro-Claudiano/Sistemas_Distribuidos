# --- Estágio 1: Construção (Build) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Gera a pasta 'dist' (o site pronto para produção)
RUN npm run build

# --- Estágio 2: Servidor (Nginx) ---
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia a NOSSA configuração customizada (que vamos ajustar a seguir)
COPY nginx.conf /etc/nginx/nginx.conf

# Copia APENAS os arquivos construídos (da pasta dist) para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe as portas
EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]