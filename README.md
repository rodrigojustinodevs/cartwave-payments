# Cartwave Payments API

API RESTful em Node.js para iniciação e verificação de status de pagamentos, integrada a um provedor externo fictício.

---

## Sumário

- [Decisões Técnicas](#decisões-técnicas)
- [Arquitetura Hexagonal](#arquitetura-hexagonal)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contratos da API](#contratos-da-api)
- [Mock Payment Gateway (Mocks Server)](#mock-payment-gateway-mocks-server)
- [Como Executar](#como-executar)
- [Prisma ORM](#prisma-orm)
- [Docker (API + PostgreSQL)](#docker-api--postgresql)
- [Testes](#testes)
- [Cobertura](#cobertura)
- [Documentação OpenAPI (Swagger)](#documentação-openapi-swagger)
- [SonarQube / SonarCloud](#sonarqube--sonarcloud)

---

## Decisões Técnicas

### 1. Arquitetura Hexagonal (Ports & Adapters)

O domínio de negócio (entidades e casos de uso) é completamente isolado de infraestrutura. As dependências externas — banco de dados e provedor de pagamentos — são acessadas **exclusivamente via interfaces (ports)**. Isso permite:

- Trocar o banco de dados sem alterar uma linha da lógica de negócio.
- Mockar qualquer adapter nos testes sem bibliotecas de spy invasivas.
- Testar casos de uso de forma pura, injetando mocks de repositório e provider.

### 2. Camadas

| Camada | Responsabilidade |
|---|---|
| `domain/entities` | Regras de negócio e invariantes da entidade `Payment` |
| `domain/ports` | Interfaces (contratos) para repositório e provedor externo |
| `domain/use-cases` | Orquestração dos fluxos de negócio |
| `infrastructure/database` | Adaptador PostgreSQL (implementa o port de repositório) |
| `infrastructure/providers` | Adaptador HTTP para o provedor externo (axios) |
| `infrastructure/http` | Controladores, rotas e middlewares Express |
| `src/app.js` | Composição (wiring) de todas as dependências |

### 3. Estratégia de Testes

- **Testes unitários**: Casos de uso com mocks de repositório e `PaymentGateway`.
- **Testes de integração do gateway**: `nock` valida o `MockPaymentGateway` (axios); `mock-server.integration.test.js` sobe o **Mocks Server** real e alterna coleções (`payment-approved`, `payment-pending`, etc.).
- **Testes de integração de API**: `supertest` + repositório em memória + `nock` no gateway.
- **Testes de integração de banco**: `testcontainers` + PostgreSQL + `PrismaPaymentRepository`.

### 4. Mapeamento de `method`

O campo `method` da nossa API (`PAYPAL`, `CREDIT_CARD`, `PIX`) é mapeado para o formato esperado pelo provedor (`pay-pal`, `credit-card`, `pix`) no `InitiatePaymentUseCase`, mantendo o domínio desacoplado dos detalhes do provider.

### 5. Tratamento de Falha do Provedor

Quando o gateway retorna **erro HTTP** ou falha de rede durante a iniciação, o pagamento é marcado como `failed`. Respostas **200** com `status: refused` (ou estados não suportados) também resultam em `failed`. Resposta **`processed`** com `tx_id` marca o pagamento como processado; **`pending`** com `tx_id` mantém `pending` e grava o `providerTxId` para sincronização posterior.

### 6. Sincronização de Status

O endpoint de checagem de status re-consulta o provedor quando o pagamento tem um `providerTxId`. Se o provedor estiver indisponível, retorna o último status conhecido do banco de dados.

---

## Arquitetura Hexagonal

```
┌──────────────────────────────────────────────────────────────┐
│                        HTTP (Express)                        │
│              PaymentController + Routes                      │
└──────────────────────┬───────────────────────────────────────┘
                       │ calls
┌──────────────────────▼───────────────────────────────────────┐
│                   DOMAIN (Use Cases)                         │
│        InitiatePaymentUseCase / GetPaymentStatusUseCase      │
│                                                              │
│  depends on ports (interfaces):                              │
│  ┌──────────────────────┐  ┌───────────────────────────┐    │
│  │ PaymentRepositoryPort│  │ PaymentGateway             │    │
│  └──────────┬───────────┘  └───────────────┬───────────┘    │
└─────────────┼──────────────────────────────┼────────────────┘
              │ implemented by               │ implemented by
┌─────────────▼──────────────┐  ┌────────────▼───────────────┐
│  PrismaPaymentRepository   │  │  MockPaymentGateway        │
│  (Prisma → PostgreSQL)     │  │  (axios → PAYMENT_PROVIDER_URL) │
└────────────────────────────┘  └────────────────────────────┘
              │                              │
         PostgreSQL              Mocks Server :3110 ou gateway real
```

---

## Estrutura do Projeto

```
prisma/
├── schema.prisma
└── migrations/                    # histórico prisma migrate (ex.: 0_init)

mocks/
├── collections.js                 # Coleções: payment-approved, payment-pending, …
├── mocks.config.js                # Porta 3110, log, CLI
└── routes/
    └── payments.js                # POST /payments, GET /payments/:id

src/
├── app.js                          # Wiring (composição de dependências)
├── index.js                        # Entry point
├── config/
│   └── swagger.js                  # OpenAPI 3 (swagger-jsdoc)
├── domain/
│   ├── entities/
│   │   └── Payment.js              # Entidade de domínio
│   ├── ports/
│   │   ├── PaymentRepositoryPort.js
│   │   └── PaymentGateway.js
│   └── use-cases/
│       ├── InitiatePaymentUseCase.js
│       └── GetPaymentStatusUseCase.js
└── infrastructure/
    ├── database/
    │   ├── prisma.js                 # singleton PrismaClient
    │   └── repositories/
    │       ├── PrismaPaymentRepository.js
    │       └── PrismaUserRepository.js
    ├── providers/
    │   ├── MockPaymentGateway.js
    │   └── RealPaymentGateway.js   # esqueleto (produção futura)
    └── http/
        ├── controllers/PaymentController.js
        ├── routes/paymentRoutes.js
        └── middlewares/errorHandler.js

tests/
├── unit/
│   ├── entities/Payment.test.js
│   ├── use-cases/InitiatePaymentUseCase.test.js
│   ├── use-cases/GetPaymentStatusUseCase.test.js
│   ├── controllers/PaymentController.test.js
│   └── infrastructure/
│       ├── MockPaymentGateway.test.js
│       ├── PrismaPaymentRepository.test.js
│       ├── PrismaUserRepository.test.js
│       ├── prisma.test.js
│       └── ports-and-middleware.test.js
└── integration/
    ├── api.integration.test.js
    ├── mock-gateway.integration.test.js   # nock + MockPaymentGateway
    ├── mock-server.integration.test.js    # Mocks Server real + adapter
    └── database.integration.test.js       # testcontainers (Docker)
```

---

## Contratos da API

### Autenticação e usuários

- **JWT**: envie `Authorization: Bearer <token>` nos endpoints protegidos (pagamentos e maioria de `/users`).
- **Login**: `POST /api/v1/auth/login` com `{ "email", "password" }` → `{ token, user }`.
- **Registro**: `POST /api/v1/users` (público) com `{ "email", "name", "password" }` (senha mín. 8 caracteres).
- **Perfil**: `GET /api/v1/users/me` (autenticado).
- **Admin**: `GET /api/v1/users` (lista paginada), `DELETE /api/v1/users/:id`.

Documentação interativa: [Swagger UI](#documentação-openapi-swagger) em `/api-docs`.

---

### POST /api/v1/payments — Iniciar Pagamento

Requer header `Authorization: Bearer ...`. No corpo, `user_id` deve ser o mesmo UUID do usuário autenticado (exceto **admin**, que pode iniciar pagamento em nome de outro usuário).

**Request:**
```json
{
  "amount": 3452,
  "currency": "BRL",
  "method": "PAYPAL",
  "product_id": "87e9646a-8513-465b-b58d-6df44b9e4925",
  "user_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
}
```

**Response `201`:**
```json
{
  "paymentId": "b018b23b-9931-4438-b55f-782edb05b4c2",
  "status": "pending" | "processed" | "failed"
}
```

**Response `400`** — campos inválidos ou ausentes.

---

### GET /api/v1/payments/:paymentId — Verificar Status

Requer `Authorization: Bearer ...`. Apenas o **dono** do pagamento ou um **admin** pode consultar.

**Response `200`:**
```json
{
  "paymentId": "b018b23b-9931-4438-b55f-782edb05b4c2",
  "status": "processed"
}
```

**Response `404`** — pagamento não encontrado.

---

### Provedor HTTP (gateway)

A aplicação usa o port **`PaymentGateway`** com implementação **`MockPaymentGateway`** (axios). A URL base vem de **`PAYMENT_PROVIDER_URL`** (fallback legado: `PAYMENT_PROVIDER_BASE_URL`).

**POST** `{PAYMENT_PROVIDER_URL}/payments`

```json
// Request (corpo enviado pelo adapter)
{ "money": { "amount": 3452, "currency": "BRL" }, "payment_method": "pay-pal", "product_id": "..." }

// Response (exemplo aprovado)
{ "tx_id": "uuid", "id": "uuid", "status": "processed", "object": "payment", "amount": { "value": 3452, "currency": "BRL" } }
```

**GET** `{PAYMENT_PROVIDER_URL}/payments/:id`

```json
// Response
{ "tx_id": "uuid", "status": "processed" }
```

Em desenvolvimento, `{PAYMENT_PROVIDER_URL}` aponta por defeito para o **Mocks Server** em `http://localhost:3110` (ver secção seguinte).

---

## Mock Payment Gateway (Mocks Server)

O repositório inclui definições em [`mocks/`](mocks/) e configuração em [`mocks.config.js`](mocks.config.js) (reexporta [`mocks/mocks.config.js`](mocks/mocks.config.js)). O servidor de mock escuta na porta **3110** por omissão.

### Fluxo (API ↔ domínio ↔ gateway)

```mermaid
flowchart LR
  subgraph http [HTTP]
    Routes["Express /api/v1/payments"]
  end
  subgraph domain [Domínio]
    UC["InitiatePaymentUseCase / GetPaymentStatusUseCase"]
  end
  subgraph ports [Ports]
    GW["PaymentGateway"]
  end
  subgraph infra [Infra]
    MockGW["MockPaymentGateway"]
  end
  subgraph mock [Mocks Server]
    MS[":3110 /payments"]
  end
  Routes --> UC
  UC --> GW
  MockGW -. implementa .-> GW
  MockGW -->|axios| MS
```

### Como subir o mock server

```bash
npm run mock          # CLI interativa (Inquirer) + observação de ficheiros
npm run mock:start    # Sem menu interativo (adequado a scripts/CI)
```

### Cenários (coleções)

| Coleção | Comportamento esperado (POST /payments) |
|---------|----------------------------------------|
| `payment-approved` | `201` + `status: processed` |
| `payment-pending` | `202` + `status: pending` |
| `payment-refused` | `200` + `status: refused` |
| `payment-error` | `500` (erro simulado) |

Trocar coleção **em runtime** via API de administração (servidor na porta do mock, normalmente 3110):

```bash
curl -s -X PATCH "http://localhost:3110/api/config" \
  -H "Content-Type: application/json" \
  -d '{"mock":{"collections":{"selected":"payment-pending"}}}'
```

Listar coleções: `GET http://localhost:3110/api/mock/collections`

### Exemplos curl (direto no mock)

```bash
# Criar pagamento (cenário atual = coleção selecionada)
curl -s -X POST "http://localhost:3110/payments" \
  -H "Content-Type: application/json" \
  -d '{"money":{"amount":1000,"currency":"BRL"},"payment_method":"pix","product_id":"87e9646a-8513-465b-b58d-6df44b9e4925"}'

# Consultar estado pelo id do tx
curl -s "http://localhost:3110/payments/b018b23b-9931-4438-b55f-782edb05b4c2"
```

---

## Como Executar

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou via Docker)

### Configuração

```bash
cp .env.example .env
# Edite .env: DATABASE_URL, PAYMENT_PROVIDER_URL, JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS
```

Em **produção**, `JWT_SECRET` é obrigatório (a API encerra se ausente).

### Instalação

```bash
npm install
# postinstall executa `prisma generate`
```

Aplicar o schema no banco (primeira vez ou após clonar):

```bash
npx prisma migrate deploy
```

### Subir a API

```bash
npm start
# API disponível em http://localhost:3000
```

---

## Prisma ORM

Persistência via **Prisma 7** (`prisma/schema.prisma` + `prisma.config.ts` com `DATABASE_URL`, cliente com `@prisma/adapter-pg` e **PostgreSQL**. Os **ports** do domínio não mudam; apenas os adapters em `infrastructure/database/repositories` usam `PrismaClient`.

> A URL de ligação **não** está no `schema.prisma` (requisito do Prisma 7); o CLI de migrations lê `prisma.config.ts`. O runtime cria o adapter `PrismaPg` com `process.env.DATABASE_URL`.

### Variável de ambiente

- **`DATABASE_URL`**: URL JDBC-style, ex.:  
  `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`

### Comandos úteis

```bash
npm run prisma:generate      # gera o client (também em postinstall)
npm run prisma:pull          # introspect do banco → schema (dev)
npm run prisma:migrate:dev   # cria migration + aplica em dev
npm run prisma:migrate:deploy # aplica migrations (CI / deploy / Docker)
npm run prisma:studio        # UI de dados
npm run migrate              # alias para prisma migrate deploy
```

### Baseline em ambientes legados

Se o banco **já tinha** as tabelas criadas antes de adotar as migrations do Prisma, marque a migration inicial como aplicada **uma vez**:

```bash
npx prisma migrate resolve --applied 0_init
```

Depois use `prisma migrate deploy` normalmente em novos deploys.

---

## Docker (API + PostgreSQL)

**Pré-requisitos:** Docker e Docker Compose (plugin `docker compose` ou binário `docker-compose`).

1. Copie e ajuste o ambiente (as credenciais de banco devem bater com o serviço `db` no `docker-compose.yml`):

   ```bash
   cp .env.example .env
   ```

2. O `docker-compose` define `DATABASE_URL` apontando para o serviço `db`. Ajuste credenciais em `.env` se alterar o Postgres. Se usar o **Mocks Server no host** e a API dentro do Docker, defina `PAYMENT_PROVIDER_URL` para alcançar o host (ex.: `http://host.docker.internal:3110` no Docker Desktop).

3. O serviço `app` executa `npx prisma migrate deploy` antes de `npm run dev`. Há volume `./prisma` para refletir alterações ao schema.

4. Suba a API e o banco (build + hot reload em `./src` via `nodemon`):

   ```bash
   docker compose up --build
   # ou: docker-compose up --build
   ```

5. A API fica em `http://localhost:3000`. O PostgreSQL é exposto em `localhost:5432` com volume persistente `postgres_data`.

**Comandos úteis:**

```bash
# Rodar em segundo plano
docker compose up -d --build

# Acompanhar logs do app
docker compose logs -f app

# Parar serviços
docker compose down

# Parar e apagar dados do banco (volume)
docker compose down -v
```

**Imagem de produção** (alvo `production` do `Dockerfile`, sem `nodemon`; o client Prisma é gerado no build):

```bash
docker build -t cartwave-payments:prod --target production .
```

Em produção, execute **`prisma migrate deploy`** no pipeline ou num entrypoint **antes** de `node src/index.js` (as migrations não rodam no boot da aplicação).

---

## Testes

### Unitários + Integração (sem Docker)

```bash
npm run test:unit
# ou (sem testes de DB nem Mocks Server em ficheiro dedicado)
npx jest tests/unit tests/integration/api.integration.test.js tests/integration/mock-gateway.integration.test.js --runInBand
```

### Integração com Mocks Server real

O ficheiro `tests/integration/mock-server.integration.test.js` sobe o `@mocks-server/main` em porta livre e valida o `MockPaymentGateway` contra rotas reais. É incluído em `npm test` e `npm run test:integration`.

```bash
npx jest tests/integration/database.integration.test.js --runInBand
```

### Todos os testes

```bash
npm test
```

---

## Cobertura

```bash
npm run test:coverage
```

Resultado atual (excluindo `database.integration.test.js` que requer Docker):

| Metric     | Coverage |
|------------|----------|
| Statements | **93%**  |
| Branches   | **92%**  |
| Functions  | **97%**  |
| Lines      | **93%**  |

> A cobertura total inclui o teste de integração com testcontainers (`database.integration.test.js`), que requer Docker para execução e cobre o `PrismaPaymentRepository`.

---

## Documentação OpenAPI (Swagger)

Com a API em execução (`npm start` ou `npm run dev`), abra no navegador:

**`http://localhost:PORT/api-docs`**

(Substitua `PORT` pelo valor de `PORT` no `.env`; o padrão é **3000**.)

A especificação é gerada com **OpenAPI 3** (`swagger-jsdoc` + `swagger-ui-express`). Os endpoints estão documentados em JSDoc em [`src/infrastructure/http/routes/paymentRoutes.js`](src/infrastructure/http/routes/paymentRoutes.js); schemas reutilizáveis em [`src/config/swagger.js`](src/config/swagger.js).

---

## SonarQube / SonarCloud

### Cobertura (LCOV para o Sonar)

```bash
npm run coverage
```

Gera `coverage/lcov.info` (Jest + Istanbul), referenciado em [`sonar-project.properties`](sonar-project.properties).

> O script `npm run test:coverage` é equivalente ao fluxo de cobertura já existente.

### Análise local

1. Copie variáveis do [`.env.example`](.env.example): `SONAR_TOKEN`, `SONAR_HOST_URL` (ex.: `https://sonarcloud.io`).
2. No **SonarCloud**, defina também `SONAR_ORGANIZATION` no ambiente (chave da organização) ou adicione `sonar.organization=<sua-org>` em `sonar-project.properties`.
3. Execute:

```bash
npm run coverage
npm run sonar
```

O comando `sonar` executa o **sonar-scanner** via pacote `sonarqube-scanner` (`node_modules/.bin/sonar-scanner`).
