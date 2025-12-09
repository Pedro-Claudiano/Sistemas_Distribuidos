Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SISTEMA COMPLETO            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/4] Parando containers antigos..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "  OK" -ForegroundColor Green

Write-Host "`n[2/4] Iniciando containers..." -ForegroundColor Yellow
docker-compose up -d 2>&1 | Out-Null
Write-Host "  OK - Aguardando inicializacao..." -ForegroundColor Green
Start-Sleep -Seconds 15

Write-Host "`n[3/4] Configurando replicacao MySQL..." -ForegroundColor Yellow
docker exec mysql-primary mysql -u root -proot_password_123 -e "CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY 'replica_password_123'; GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%'; FLUSH PRIVILEGES;" 2>&1 | Out-Null
docker exec mysql-secondary mysql -u root -proot_password_123 -e "STOP SLAVE; CHANGE MASTER TO MASTER_HOST='mysql-primary', MASTER_USER='replicator', MASTER_PASSWORD='replica_password_123', MASTER_AUTO_POSITION=1; START SLAVE;" 2>&1 | Out-Null
Start-Sleep -Seconds 3
Write-Host "  OK - Replicacao configurada" -ForegroundColor Green

Write-Host "`n[4/4] Verificando status..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" | Measure-Object -Line
Write-Host "  $($containers.Lines) containers rodando" -ForegroundColor Green

$slaveStatus = docker exec mysql-secondary mysql -u root -proot_password_123 -e "SHOW SLAVE STATUS\G" 2>&1
if ($slaveStatus -match "Slave_IO_Running: Yes" -and $slaveStatus -match "Slave_SQL_Running: Yes") {
    Write-Host "  Replicacao MySQL: OK" -ForegroundColor Green
} else {
    Write-Host "  Replicacao MySQL: AVISO - Pode precisar de configuracao manual" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           SISTEMA INICIADO!            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse: https://localhost" -ForegroundColor White
Write-Host ""
Write-Host "Para testar o sistema:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/test-all.ps1" -ForegroundColor White
Write-Host ""
