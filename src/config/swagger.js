'use strict';

const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const { version } = require('../../package.json');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Cartwave Payments API',
      version,
      description:
        'API REST para usuários, autenticação JWT, iniciação e consulta de status de pagamentos, com integração a provedor externo. ' +
        'Na criação, o status permanece **pending** até o webhook do provedor confirmar ou recusar. ' +
        'Em falha do provedor na iniciação, a API pode responder **201** com `status: "failed"` (pagamento persistido).',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Desenvolvimento' }],
    tags: [
      { name: 'Auth', description: 'Login e tokens' },
      { name: 'Users', description: 'Cadastro e gestão de usuários' },
      { name: 'Payments', description: 'Operações de pagamento' },
      { name: 'Webhooks', description: 'Callbacks do provedor de pagamento' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        PaymentRequest: {
          type: 'object',
          required: ['amount', 'currency', 'method', 'product_id', 'user_id'],
          properties: {
            amount: {
              type: 'number',
              format: 'double',
              exclusiveMinimum: 0,
              description: 'Valor do pagamento (positivo)',
              example: 99.9,
            },
            currency: { type: 'string', description: 'Código da moeda', example: 'BRL' },
            method: {
              type: 'string',
              description: 'Método de pagamento (mapeado para o provedor externo)',
              enum: ['PAYPAL', 'CREDIT_CARD', 'PIX'],
              example: 'PAYPAL',
            },
            product_id: {
              type: 'string',
              description: 'Identificador do produto',
              example: '87e9646a-8513-465b-b58d-6df44b9e4925',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário dono do pagamento (deve coincidir com o JWT, salvo admin)',
            },
          },
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            paymentId: { type: 'string', format: 'uuid', description: 'ID do pagamento' },
            status: {
              type: 'string',
              enum: ['pending', 'processed', 'failed'],
              description: 'Status atual do pagamento',
            },
          },
        },
        WebhookEvent: {
          type: 'object',
          required: ['event', 'data'],
          properties: {
            event: {
              type: 'string',
              enum: ['payment.approved', 'payment.refused', 'payment.pending'],
              description: 'Tipo do evento enviado pelo provedor',
            },
            data: {
              type: 'object',
              required: [],
              description: 'Deve incluir tx_id ou id do pagamento no provedor',
              properties: {
                tx_id: { type: 'string', description: 'ID da transação no provedor' },
                id: { type: 'string', description: 'Alternativa a tx_id' },
                status: { type: 'string', description: 'Status informado pelo provedor (referência)' },
              },
            },
          },
        },
        UserCreateRequest: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 2 },
            password: { type: 'string', minLength: 8 },
          },
        },
        UserUpdateRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            password: { type: 'string', minLength: 8 },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT Bearer' },
            user: { $ref: '#/components/schemas/UserResponse' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Mensagem de erro' },
          },
        },
        ValidationErrorItem: {
          type: 'object',
          description: 'Item retornado pelo express-validator',
          properties: {
            type: { type: 'string' },
            value: {},
            msg: { type: 'string' },
            path: { type: 'string' },
            location: { type: 'string' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationErrorItem' },
            },
          },
        },
        User: {
          type: 'object',
          description: 'Modelo de usuário',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
          },
        },
        PaginatedResponse: {
          type: 'object',
          description: 'Listagem paginada de usuários',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/UserResponse' } },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1 },
            total: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../infrastructure/http/routes/paymentRoutes.js'),
    path.join(__dirname, '../infrastructure/http/routes/webhookRoutes.js'),
    path.join(__dirname, '../infrastructure/http/routes/authRoutes.js'),
    path.join(__dirname, '../infrastructure/http/routes/userRoutes.js'),
  ],
};

module.exports = swaggerJsdoc(options);
