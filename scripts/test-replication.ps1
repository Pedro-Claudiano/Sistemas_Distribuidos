Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTANDO REPLICACAO MYSQL             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1] Contando usuarios no Primary..." -ForegroundColor Yellow
$primaryCount = docker exec mysql-primary mysql -u root -proot_password_123 -D meu_projeto_db -e "SELECT COUNT(*) as total FROM Usuarios" 2>&1 | Select-String "^\d+$"
Write-Host "  Primary tem: $primaryCount usuarios" -ForegroundColor White

Write-Host "`n[2] Contando usuarios no Secondary..." -ForegroundColor Yellow
$secondaryCount = docker exec mysql-secondary mysql -u root -proot_password_123 -D meu_projeto_db -e "SELECT COUNT(*) as total FROM Usuarios" 2>&1 | Select-String "^\d+$"
Write-Host "  Secondary tem: $secondaryCount usuarios" -ForegroundColor White

Write-Host "`n[3] Criando novo usuario no Primary..." -ForegroundColor Yellow
$testEmail = "replication_test_$(Get-Random)@teste.com"
docker exec mysql-primary mysql -u root -proot_password_123 -D meu_projeto_db -e "INSERT INTO Usuarios (id, name, email, password_hash, role) VALUES (UUID(), 'Teste Replicacao', '$testEmail', 'hash123', 'client')" 2>&1 | Out-Null
Write-Host "  Usuario criado: $testEmail" -ForegroundColor Green

Write-Host "`n[4] Aguardando replicacao..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n[5] Verificando no Secondary..." -ForegroundColor Yellow
$replicatedUser = docker exec mysql-secondary mysql -u root -proot_password_123 -D meu_projeto_db -e "SELECT email FROM Usuarios WHERE email='$testEmail'" 2>&1 | Select-String $testEmail

if ($replicatedUser) {
    Write-Host "  [OK] Usuario encontrado no Secondary!" -ForegroundColor Green
    Write-Host "  Email: $replicatedUser" -ForegroundColor White
} else {
    Write-Host "  [ERRO] Usuario NAO foi replicado!" -ForegroundColor Red
}

Write-Host "`n[6] Contando novamente..." -ForegroundColor Yellow
$newPrimaryCount = docker exec mysql-primary mysql -u root -proot_password_123 -D meu_projeto_db -e "SELECT COUNT(*) as total FROM Usuarios" 2>&1 | Select-String "^\d+$"
$newSecondaryCount = docker exec mysql-secondary mysql -u root -proot_password_123 -D meu_projeto_db -e "SELECT COUNT(*) as total FROM Usuarios" 2>&1 | Select-String "^\d+$"

Write-Host "  Primary: $newPrimaryCount usuarios" -ForegroundColor White
Write-Host "  Secondary: $newSecondaryCount usuarios" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
if ($replicatedUser) {
    Write-Host "[OK] REPLICACAO FUNCIONANDO 100%!" -ForegroundColor Green
    Write-Host "Dados criados no Primary foram replicados para o Secondary!" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Replicacao pode ter problemas" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
