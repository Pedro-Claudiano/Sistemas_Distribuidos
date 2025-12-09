Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURANDO REPLICACAO MYSQL         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$rootPassword = "root_password_123"
$replicatorPassword = "replica_password_123"

Write-Host "`n[1] Criando usuario de replicacao no Primary..." -ForegroundColor Yellow
$createUserCmd = @"
CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY '$replicatorPassword';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
"@

docker exec mysql-primary mysql -u root -p$rootPassword -e $createUserCmd 2>&1 | Out-Null
Write-Host "OK - Usuario de replicacao criado" -ForegroundColor Green

Write-Host "`n[2] Obtendo status do Primary..." -ForegroundColor Yellow
$masterStatus = docker exec mysql-primary mysql -u root -p$rootPassword -e "SHOW MASTER STATUS" 2>&1 | Out-String

# Parse da saída tabular
$lines = $masterStatus -split "`n"
$dataLine = $lines | Where-Object { $_ -match "mysql-binlog" } | Select-Object -First 1

if ($dataLine) {
    $parts = $dataLine -split "\s+"
    $binlogFile = $parts[0]
    $binlogPosition = $parts[1]
    
    Write-Host "  Binlog File: $binlogFile" -ForegroundColor White
    Write-Host "  Binlog Position: $binlogPosition" -ForegroundColor White
} else {
    Write-Host "  ERRO: Nao foi possivel obter status do master" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3] Configurando Secondary..." -ForegroundColor Yellow
$configureReplicaCmd = @"
STOP SLAVE;
CHANGE MASTER TO
    MASTER_HOST='mysql-primary',
    MASTER_USER='replicator',
    MASTER_PASSWORD='$replicatorPassword',
    MASTER_LOG_FILE='$binlogFile',
    MASTER_LOG_POS=$binlogPosition;
START SLAVE;
"@

docker exec mysql-secondary mysql -u root -p$rootPassword -e $configureReplicaCmd 2>&1 | Out-Null
Write-Host "OK - Replicacao configurada" -ForegroundColor Green

Write-Host "`n[4] Aguardando inicializacao..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n[5] Verificando status da replicacao..." -ForegroundColor Yellow
$slaveStatus = docker exec mysql-secondary mysql -u root -p$rootPassword -e "SHOW SLAVE STATUS\G" 2>&1

$ioRunning = "Unknown"
$sqlRunning = "Unknown"
$secondsBehind = "Unknown"
$lastError = ""

if ($slaveStatus -match "Slave_IO_Running: (\w+)") {
    $ioRunning = $matches[1]
}
if ($slaveStatus -match "Slave_SQL_Running: (\w+)") {
    $sqlRunning = $matches[1]
}
if ($slaveStatus -match "Seconds_Behind_Master: (\d+|NULL)") {
    $secondsBehind = $matches[1]
}
if ($slaveStatus -match "Last_Error: (.+)") {
    $lastError = $matches[1].Trim()
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           STATUS DA REPLICACAO         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Slave_IO_Running: " -NoNewline
if ($ioRunning -eq "Yes") {
    Write-Host "$ioRunning" -ForegroundColor Green
} else {
    Write-Host "$ioRunning" -ForegroundColor Red
}

Write-Host "Slave_SQL_Running: " -NoNewline
if ($sqlRunning -eq "Yes") {
    Write-Host "$sqlRunning" -ForegroundColor Green
} else {
    Write-Host "$sqlRunning" -ForegroundColor Red
}

Write-Host "Seconds_Behind_Master: " -NoNewline
if ($secondsBehind -eq "0" -or $secondsBehind -eq "NULL") {
    Write-Host "$secondsBehind" -ForegroundColor Green
} else {
    Write-Host "$secondsBehind" -ForegroundColor Yellow
}

if ($lastError -and $lastError -ne "") {
    Write-Host "`nLast_Error: $lastError" -ForegroundColor Red
}

Write-Host ""
if ($ioRunning -eq "Yes" -and $sqlRunning -eq "Yes") {
    Write-Host "[OK] REPLICACAO MYSQL FUNCIONANDO!" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Replicacao nao esta funcionando corretamente" -ForegroundColor Red
    Write-Host "Execute novamente o script ou verifique os logs" -ForegroundColor Yellow
}
Write-Host ""
