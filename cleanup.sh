#!/bin/bash

# Script de limpeza - Remove arquivos desnecessários
echo "🧹 Limpando arquivos desnecessários..."

# Remover arquivos de teste
rm -f test*.ps1 teste*.ps1 validacao*.ps1 create-admin*.ps1 2>/dev/null || true
rm -f test*.js test*.http 2>/dev/null || true
rm -f console.error* "{" 2>/dev/null || true

# Remover pasta scripts se existir
rm -rf scripts/ 2>/dev/null || true

# Remover pasta docs se existir  
rm -rf docs/ 2>/dev/null || true

# Remover arquivos temporários
rm -f *.log *.tmp 2>/dev/null || true
rm -f *task.json 2>/dev/null || true

# Remover node_modules se existir (será recriado no build)
rm -rf node_modules/ 2>/dev/null || true

# Manter apenas arquivos essenciais
echo "✅ Arquivos mantidos:"
echo "📁 backend/ - Código dos microserviços"
echo "📁 frontend/ - Interface React"
echo "📁 mysql-config/ - Configuração MySQL"
echo "📁 nginx-certs/ - Certificados SSL"
echo "🐳 docker-compose.yml - Ambiente local"
echo "🐳 docker-compose.prod.yml - Ambiente produção"
echo "🚀 deploy-aws.sh - Script de deploy AWS"
echo "📋 README.md - Documentação completa"
echo "⚙️ .env.aws.example - Template configuração AWS"
echo "📄 package.json - Dependências"
echo "🗄️ init.sql - Schema inicial do banco"

echo ""
echo "🎯 Projeto limpo e pronto para deploy AWS!"
echo "📖 Leia o README.md para instruções completas"