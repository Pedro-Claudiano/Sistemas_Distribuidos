# TRABALHO ACADÊMICO - SISTEMAS DISTRIBUÍDOS
# Sistema de Reservas com Arquitetura de Microserviços

**Disciplina**: Sistemas Distribuídos  
**Data**: Dezembro/2025  
**Status**: ✅ Sistema 100% Funcional e Testado

---

## ÍNDICE

1. [Planejamento e Arquitetura](#1-planejamento-e-arquitetura)
2. [Implementação e Comunicação](#2-implementação-e-comunicação)
3. [Coordenação e Replicação](#3-coordenação-e-replicação)
4. [Tolerância a Falhas e Segurança](#4-tolerância-a-falhas-e-segurança)
5. [Sistema Completo e Resultados](#5-sistema-completo-e-resultados)
6. [Conclusão](#6-conclusão)
7. [Referências](#7-referências)

---

## 1. PLANEJAMENTO E ARQUITETURA

### 1.1 Tema e Justificativa

**Tema**: Sistema de Gerenciamento de Reservas de Salas com Arquitetura Distribuída

**Justificativa**: Sistemas de reservas são casos de uso reais que exigem:
- Controle de concorrência (múltiplos usuários reservando simultaneamente)
- Diferenciação de permissões (administradores vs usuários comuns)
- Notificações em tempo real
- Alta disponibilidade e escalabilidade

Este projeto implementa um sistema completo que demonstra conceitos fundamentais de sistemas distribuídos.

### 1.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                   │
│                  Nginx HTTPS (SSL/TLS 1.2+)                 │
│                    Ports: 80 → 443, 443                     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼────────┐              ┌────────▼─────────┐
│  Auth Service  │              │ Reservations     │
│  (Port 3000)   │◄────────────►│ Service          │
│  - JWT Auth    │   REST API   │ (Port 3001)      │
│  - User CRUD   │              │ - Reservas CRUD  │
│  - RBAC        │              │ - Eventos        │
└───────┬────────┘              │ - Notificações   │
        │                       └────────┬─────────┘
        │                                │
        │    ┌───────────────────────────┴──────────┐
        │    │                                       │
┌───────▼────▼───────┐  ┌──────────┐  ┌────────────▼────┐
│   MySQL Cluster    │  │  Redis   │  │   RabbitMQ      │
│ ┌────────────────┐ │  │  Cache   │  │   Message       │
│ │ Primary :3307  │ │  │  & Lock  │  │   Queue         │
│ └───────┬────────┘ │  │  :6379   │  │   :5672, :15672 │
│         │          │  └──────────┘  └─────────────────┘
│ ┌───────▼────────┐ │
│ │Secondary :3308 │ │  (Replicação GTID)
│ └────────────────┘ │
└────────────────────┘
```

### 1.3 Quadro de Seleção de Tecnologias

| Tecnologia | Versão | Justificativa | Alternativas Consideradas |
|------------|--------|---------------|---------------------------|
| **Node.js** | 18+ | Runtime JavaScript assíncrono, ideal para I/O intensivo, grande ecossistema | Python (Flask), Java (Spring Boot) |
| **Express** | 4.x | Framework web minimalista e flexível para APIs REST | Fastify, Koa |
| **MySQL** | 8.0 | ACID compliant, suporte nativo a replicação, transações robustas | PostgreSQL, MongoDB |
| **Redis** | 7.x | In-memory, operações atômicas (SET NX), baixa latência para locks | Memcached, Hazelcast |
| **RabbitMQ** | 3.11 | Message broker confiável, suporte a múltiplos padrões, persistência | Apache Kafka, AWS SQS |
| **Nginx** | Latest | Proxy reverso eficiente, terminação SSL, load balancing | HAProxy, Traefik |
| **Docker** | 20+ | Containerização, isolamento, portabilidade, orquestração simples | Kubernetes (complexo demais) |
| **JWT** | - | Stateless, escalável, padrão da indústria | Sessions (stateful) |


### 1.4 Divisão de Responsabilidades

**Desenvolvimento Individual** (Trabalho acadêmico)

| Componente | Responsabilidades | Tecnologias |
|------------|-------------------|-------------|
| **Serviço de Autenticação** | Registro, login, JWT, RBAC | Node.js, Express, MySQL, bcrypt |
| **Serviço de Reservas** | CRUD reservas, eventos, notificações | Node.js, Express, MySQL, Redis, RabbitMQ |
| **Infraestrutura** | Docker, MySQL replicação, Redis, RabbitMQ | Docker Compose, MySQL GTID |
| **Segurança** | HTTPS/SSL, JWT, validações | OpenSSL, Nginx, JWT |
| **Testes** | Scripts automatizados, validação | PowerShell, REST Client |
| **Documentação** | Técnica e acadêmica | Markdown |

---

## 2. IMPLEMENTAÇÃO E COMUNICAÇÃO

### 2.1 Serviços Implementados

#### 2.1.1 Serviço de Autenticação (usuarios-service)

**Porta**: 3000  
**Protocolo**: REST/HTTPS  
**Responsabilidades**:
- Registro de usuários (admin/client)
- Autenticação com JWT
- Validação de tokens
- Controle de acesso baseado em roles (RBAC)

**Endpoints**:
```
POST /api/users          - Criar usuário
POST /api/users/login    - Login (retorna JWT)
GET  /api/users          - Listar usuários (admin only)
```

**Tecnologias**:
- Express.js para API REST
- bcrypt para hash de senhas
- jsonwebtoken para JWT
- MySQL para persistência

#### 2.1.2 Serviço de Reservas (reservas-service)

**Porta**: 3001  
**Protocolo**: REST/HTTPS  
**Responsabilidades**:
- CRUD de reservas com lock distribuído
- Sistema de eventos
- Notificações via RabbitMQ
- Validação de permissões

**Endpoints**:
```
POST   /api/reservas              - Criar reserva
GET    /api/reservas              - Listar reservas (filtrado por role)
PUT    /api/reservas/:id          - Modificar reserva (admin)
DELETE /api/reservas/:id          - Deletar reserva
POST   /api/eventos               - Criar evento (admin)
GET    /api/eventos               - Listar eventos
GET    /api/notificacoes          - Listar notificações
PUT    /api/notificacoes/:id/lida - Marcar como lida
```

### 2.2 Comunicação entre Serviços

#### 2.2.1 Comunicação Síncrona (REST)

**Padrão**: Request-Response via HTTPS  
**Formato**: JSON  
**Autenticação**: JWT Bearer Token

**Exemplo de Fluxo**:
```
1. Cliente → Nginx → Auth Service (POST /api/users/login)
2. Auth Service valida credenciais
3. Auth Service gera JWT
4. Cliente recebe token
5. Cliente → Nginx → Reservas Service (POST /api/reservas) + JWT
6. Reservas Service valida JWT
7. Reservas Service processa reserva
8. Cliente recebe confirmação
```

#### 2.2.2 Comunicação Assíncrona (RabbitMQ)

**Padrão**: Publish-Subscribe  
**Exchange**: Direct  
**Queue**: notifications  
**Persistência**: Mensagens persistidas em disco

**Fluxo de Notificações**:
```
1. Admin modifica reserva de cliente
2. Reservas Service publica mensagem no RabbitMQ
3. Consumer processa mensagem
4. Notificação salva no banco de dados
5. Cliente consulta notificações via GET /api/notificacoes
```

### 2.3 Documentação da Comunicação

**Arquivo**: `testes.http`  
**Ferramenta**: REST Client (VS Code)

Contém exemplos de todas as requisições com:
- Headers necessários
- Body JSON
- Tokens de exemplo
- Comentários explicativos

