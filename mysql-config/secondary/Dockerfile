# Usa a imagem base oficial
FROM mysql:8.0

# Copia o .cnf para o lugar certo
COPY secondary.cnf /etc/mysql/conf.d/secondary.cnf

# 👇 ESTA É A CORREÇÃO MÁGICA: Conserta as permissões do arquivo
RUN chmod 644 /etc/mysql/conf.d/secondary.cnf