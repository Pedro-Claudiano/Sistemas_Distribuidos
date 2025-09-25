# Fase 1: Build da aplicação React
FROM node:20-alpine AS build
WORKDIR /app
# Adiciona 'frontend/' ao caminho de origem
COPY frontend/package*.json ./
RUN npm install
# Adiciona 'frontend/' ao caminho de origem
COPY frontend/. ./
RUN npm run build

# Fase 2: Servir os arquivos com Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Remove o '../' do caminho, pois o contexto agora é a raiz
COPY config/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]