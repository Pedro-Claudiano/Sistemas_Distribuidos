Write-Host "Verificando status da replicacao MySQL..." -ForegroundColor Cyan

$output = docker exec mysql-secondary mysql -u root -proot_password_123 -e "SHOW SLAVE STATUS\G" 2>&1

if ($output -match "Slave_IO_Running: (\w+)") {
    $ioRunning = $matches[1]
    Write-Host "Slave_IO_Running: $ioRunning" -ForegroundColor $(if ($ioRunning -eq "Yes") { "Green" } else { "Red" })
}

if ($output -match "Slave_SQL_Running: (\w+)") {
    $sqlRunning = $matches[1]
    Write-Host "Slave_SQL_Running: $sqlRunning" -ForegroundColor $(if ($sqlRunning -eq "Yes") { "Green" } else { "Red" })
}

if ($output -match "Seconds_Behind_Master: (\d+|NULL)") {
    $secondsBehind = $matches[1]
    Write-Host "Seconds_Behind_Master: $secondsBehind" -ForegroundColor $(if ($secondsBehind -eq "0" -or $secondsBehind -eq "NULL") { "Green" } else { "Yellow" })
}

if ($ioRunning -eq "Yes" -and $sqlRunning -eq "Yes") {
    Write-Host "`n[OK] Replicacao MySQL funcionando!" -ForegroundColor Green
} else {
    Write-Host "`n[AVISO] Replicacao pode nao estar configurada ou ativa" -ForegroundColor Yellow
}
