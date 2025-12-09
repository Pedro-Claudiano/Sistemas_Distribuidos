# 🔒 Guia de Certificados SSL

## ✅ Certificados Gerados

Os certificados SSL auto-assinados foram criados com sucesso:
- **Certificado**: `nginx-certs/server.crt`
- **Chave Privada**: `nginx-certs/server.key`
- **Validade**: 365 dias
- **Algoritmo**: RSA 2048 bits
- **CN**: localhost

## 🔧 Como Foram Gerados

```bash
docker run --rm -v "%cd%\nginx-certs:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/C=BR/ST=State/L=City/O=Organization/CN=localhost"
```

## 📋 Configuração do Nginx

```nginx
server {
    listen 443 ssl;
    server_name localhost;
    
    # Certificados SSL
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... resto da configuração
}
```

## 🌐 Aceitar Certificado Auto-Assinado

### No Navegador
1. Acesse https://localhost
2. Clique em "Avançado" ou "Advanced"
3. Clique em "Prosseguir para localhost (não seguro)"
4. O certificado será aceito para esta sessão

### No PowerShell
```powershell
# Adicionar política para aceitar todos os certificados
add-type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(
            ServicePoint srvPoint, X509Certificate certificate,
            WebRequest request, int certificateProblem) {
            return true;
        }
    }
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
```

### No curl
```bash
curl -k https://localhost/health
# ou
curl --insecure https://localhost/health
```

### No Postman
1. Settings → General
2. Desabilitar "SSL certificate verification"

## 🔄 Regenerar Certificados

Se precisar regenerar os certificados:

```powershell
# Deletar certificados antigos
Remove-Item nginx-certs\server.* -Force

# Gerar novos
docker run --rm -v "%cd%\nginx-certs:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/C=BR/ST=State/L=City/O=Organization/CN=localhost"

# Reiniciar Nginx
docker-compose restart frontend
```

## 🏢 Certificado para Produção

Para produção, use certificados válidos:

### Opção 1: Let's Encrypt (Gratuito)
```bash
# Instalar certbot
apt-get install certbot python3-certbot-nginx

# Gerar certificado
certbot --nginx -d seudominio.com
```

### Opção 2: AWS Certificate Manager (ACM)
- Gratuito para uso com ALB/CloudFront
- Renovação automática
- Integração com Route 53

### Opção 3: Comprar Certificado
- DigiCert
- Comodo
- GoDaddy
- etc.

## 🔍 Verificar Certificado

```bash
# Ver detalhes do certificado
openssl x509 -in nginx-certs/server.crt -text -noout

# Verificar validade
openssl x509 -in nginx-certs/server.crt -noout -dates

# Verificar CN
openssl x509 -in nginx-certs/server.crt -noout -subject
```

## ⚠️ Avisos de Segurança

### Certificados Auto-Assinados
- ✅ **Desenvolvimento**: OK
- ✅ **Testes locais**: OK
- ❌ **Produção**: NÃO recomendado
- ❌ **Internet pública**: NÃO usar

### Por que não usar em produção?
1. Navegadores mostram aviso de segurança
2. Não há validação por autoridade certificadora
3. Usuários podem ignorar avisos (risco de phishing)
4. APIs de terceiros podem rejeitar

## 🎓 Conceitos

### O que é SSL/TLS?
- **SSL** (Secure Sockets Layer): Protocolo antigo
- **TLS** (Transport Layer Security): Sucessor do SSL
- Criptografa comunicação entre cliente e servidor
- Garante autenticidade do servidor

### Como Funciona?
1. Cliente solicita conexão HTTPS
2. Servidor envia certificado
3. Cliente verifica certificado
4. Estabelece chave de sessão criptografada
5. Comunicação segura

### Certificado Auto-Assinado vs Válido
| Aspecto | Auto-Assinado | Válido (CA) |
|---------|---------------|-------------|
| Custo | Gratuito | Varia |
| Confiança | Nenhuma | Alta |
| Navegador | Aviso | Sem aviso |
| Produção | Não | Sim |
| Desenvolvimento | Sim | Opcional |

## 📚 Referências

- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [AWS Certificate Manager](https://aws.amazon.com/certificate-manager/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Certificados SSL Configurados com Sucesso! 🔒**
