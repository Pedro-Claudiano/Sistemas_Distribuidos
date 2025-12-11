#!/bin/bash

# Script de deploy completo - executa tudo automaticamente
# Execute: chmod +x deploy-completo.sh && ./deploy-completo.sh

echo "🚀 DEPLOY COMPLETO AWS FREE TIER"
echo "=================================="
echo ""

# 1. Preparação
echo "📋 Passo 1/4: Preparação..."
if ! ./prepare-aws-deploy.sh; then
    echo "❌ Falha na preparação. Verifique os pré-requisitos."
    exit 1
fi

echo ""
echo "⏳ Aguarde 5 segundos..."
sleep 5

# 2. Deploy inicial
echo "📋 Passo 2/4: Deploy inicial (10-15 min)..."
if ! ./deploy-aws.sh; then
    echo "❌ Falha no deploy inicial."
    exit 1
fi

echo ""
echo "⏳ Aguardando serviços ficarem estáveis (3 min)..."
sleep 180

# 3. Atualizar IPs dos serviços
echo "📋 Passo 3/4: Configurando conectividade entre serviços..."
if ! ./update-service-ips.sh; then
    echo "⚠️ Falha na atualização de IPs. Você pode executar manualmente: ./update-service-ips.sh"
fi

echo ""
echo "⏳ Aguardando deploy final (2 min)..."
sleep 120

# 4. Verificação final
echo "📋 Passo 4/4: Verificação final..."
./check-aws-status.sh

echo ""
echo "🎉 DEPLOY COMPLETO FINALIZADO!"
echo "=============================="
echo ""
echo "✅ Sua aplicação está rodando de forma distribuída na AWS!"
echo ""
echo "📱 Próximos passos:"
echo "1. Anote os IPs públicos mostrados acima"
echo "2. Acesse o frontend: https://[IP_FRONTEND]"
echo "3. Teste as APIs: http://[IP_USUARIOS]:3000 e http://[IP_RESERVAS]:3001"
echo "4. Monitore logs: aws logs tail /ecs/usuarios-service --follow"
echo ""
echo "💰 Custos: $0 (Free Tier por 12 meses)"
echo "🔧 Para limpar tudo: ./cleanup-aws.sh"
echo ""
echo "🚀 Parabéns! Sistema em produção na AWS!"