# Solução rápida para os problemas do deploy
# Execute: .\solucao-rapida.ps1

Write-Host "🚨 SOLUÇÃO RÁPIDA PARA PROBLEMAS DO DEPLOY" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

Write-Host "📋 DIAGNÓSTICO:" -ForegroundColor Yellow
Write-Host "✅ usuarios-service: Funcionando (IP: 54.146.77.137)" -ForegroundColor Green
Write-Host "❌ redis-service: Task não encontrada" -ForegroundColor Red
Write-Host "❌ rabbitmq-service: Task não encontrada" -ForegroundColor Red  
Write-Host "❌ reservas-service: Task não encontrada" -ForegroundColor Red
Write-Host "❌ frontend-nginx: Task não encontrada" -ForegroundColor Red
Write-Host ""

Write-Host "🔧 POSSÍVEIS CAUSAS:" -ForegroundColor Yellow
Write-Host "1. Task definitions não foram criadas corretamente" -ForegroundColor White
Write-Host "2. Imagens Docker não foram enviadas para ECR" -ForegroundColor White
Write-Host "3. Problemas de permissões ou recursos" -ForegroundColor White
Write-Host "4. Erros nos containers (verificar logs)" -ForegroundColor White
Write-Host ""

Write-Host "🚀 SOLUÇÃO EM 3 PASSOS:" -ForegroundColor Green
Write-Host ""

Write-Host "PASSO 1: Diagnosticar problemas detalhadamente" -ForegroundColor Cyan
Write-Host ".\diagnosticar-problemas.ps1" -ForegroundColor White
Write-Host ""

Write-Host "PASSO 2: Corrigir automaticamente" -ForegroundColor Cyan  
Write-Host ".\corrigir-servicos.ps1" -ForegroundColor White
Write-Host ""

Write-Host "PASSO 3: Verificar se funcionou" -ForegroundColor Cyan
Write-Host ".\check-aws-status.ps1" -ForegroundColor White
Write-Host ""

Write-Host "💡 ALTERNATIVA RÁPIDA:" -ForegroundColor Yellow
Write-Host "Se quiser recomeçar do zero:" -ForegroundColor White
Write-Host "1. .\cleanup-aws.ps1  # Limpar tudo" -ForegroundColor White
Write-Host "2. .\deploy-completo.ps1  # Deploy novamente" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Escolha uma opção: [1] Diagnosticar e corrigir [2] Recomeçar do zero [3] Sair"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "🔍 Executando diagnóstico..." -ForegroundColor Yellow
        .\diagnosticar-problemas.ps1
        
        Write-Host ""
        $continuar = Read-Host "Deseja continuar com a correção? (s/N)"
        if ($continuar -eq "s" -or $continuar -eq "S") {
            Write-Host ""
            Write-Host "🔧 Executando correção..." -ForegroundColor Yellow
            .\corrigir-servicos.ps1
            
            Write-Host ""
            Write-Host "✅ Verificando resultado..." -ForegroundColor Green
            .\check-aws-status.ps1
        }
    }
    "2" {
        Write-Host ""
        Write-Host "🧹 Limpando recursos..." -ForegroundColor Red
        .\cleanup-aws.ps1
        
        Write-Host ""
        Write-Host "🚀 Iniciando novo deploy..." -ForegroundColor Green
        .\deploy-completo.ps1
    }
    "3" {
        Write-Host "👋 Saindo..." -ForegroundColor White
        exit 0
    }
    default {
        Write-Host "❌ Opção inválida" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📱 PRÓXIMOS PASSOS APÓS CORREÇÃO:" -ForegroundColor Green
Write-Host "1. Aguarde todos os serviços ficarem 'RUNNING'" -ForegroundColor White
Write-Host "2. Anote os IPs públicos mostrados" -ForegroundColor White
Write-Host "3. Acesse: https://[IP_FRONTEND] para o frontend" -ForegroundColor White
Write-Host "4. Teste APIs: http://54.146.77.137:3000 (usuários)" -ForegroundColor White
Write-Host ""
Write-Host "💰 Lembre-se: Tudo está no Free Tier = $0 de custo!" -ForegroundColor Green