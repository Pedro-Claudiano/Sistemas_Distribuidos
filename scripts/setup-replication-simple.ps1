Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURANDO REPLICACAO MYSQL         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1] Criando usuario de replicacao no Primary..." -ForegroundColor Yellow
docker exec mysql-primary mysql -u root -proot_password_123 -e "CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY 'replica_password_123'; GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%'; FLUSH PRIVILEGES;" 2>&1 | Out-Null
Write-Host "OK - Usuario criado" -ForegroundColor Green

Write-Host "`n[2] Configurando Secondary com GTID..." -ForegroundColor Yellow
docker exec mysql-secondary mysql -u root -proot_password_123 -e "STOP SLAVE; CHANGE MASTER TO MASTER_HOST='mysql-primary', MASTER_USER='replicator', MASTER_PASSWORD='replica_password_123', MASTER_AUTO_POSITION=1; START SLAVE;" 2>&1 | Out-Null
Write-Host "OK - Replicacao configurada com GTID" -ForegroundColor Green

Write-Host "`n[3] Aguardando inicializacao..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n[4] Verificando status..." -ForegroundColor Yellow
docker exec mysql-secondary mysql -u root -proot_password_123 -e "SHOW SLAVE STATUS\G" 2>&1 | Select-String "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master|Last_Error:"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Replicacao configurada!" -ForegroundColor Green
Write-Host "Execute: powershell scripts/check-replication.ps1" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
