'use strict';

const axios = require('axios');

/**
 * Dispara webhook assíncrono para a API local (MOCK_WEBHOOK_TARGET_URL + WEBHOOK_SECRET).
 */
function scheduleWebhook(event, txId, status) {
  const url = process.env.MOCK_WEBHOOK_TARGET_URL;
  const secret = process.env.WEBHOOK_SECRET;
  if (!url || !secret) {
    console.warn(
      '[mocks] webhook não enviado: defina MOCK_WEBHOOK_TARGET_URL e WEBHOOK_SECRET no ambiente do Mocks Server'
    );
    return;
  }
  const delayMsRaw = process.env.MOCK_WEBHOOK_DELAY_MS;
  const delayMs =
    delayMsRaw !== undefined && delayMsRaw !== ''
      ? Math.max(0, Number.parseInt(delayMsRaw, 10) || 0)
      : 300;

  setTimeout(() => {
    axios
      .post(
        url,
        { event, data: { tx_id: txId, status } },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Token': secret,
          },
          timeout: 5000,
        }
      )
      .then((res) => {
        console.info('[mocks] webhook disparado OK', { event, txId, statusCode: res.status, url });
      })
      .catch((err) => {
        console.error('[mocks] webhook dispatch failed', err.message);
      });
  }, delayMs);
}

const approvedPayload = (txId) => ({
  id: txId,
  tx_id: txId,
  object: 'payment',
  status: 'processed',
  amount: { value: 3452, currency: 'BRL' },
  payment_method: 'pay-pal',
  created_at: '2025-05-03T12:00:00.000Z',
  updated_at: '2025-05-03T12:00:01.000Z',
  metadata: { source: 'mock-gateway' },
});

const pendingPayload = (txId) => ({
  id: txId,
  tx_id: txId,
  object: 'payment',
  status: 'pending',
  amount: { value: 1000, currency: 'BRL' },
  payment_method: 'credit-card',
  created_at: '2025-05-03T12:00:00.000Z',
  updated_at: '2025-05-03T12:00:00.000Z',
  next_action: { type: 'redirect', url: 'https://checkout.mock.example/3ds' },
});

const refusedPayload = (txId) => ({
  id: txId,
  tx_id: txId,
  object: 'payment',
  status: 'refused',
  failure_code: 'card_declined',
  failure_message: 'Your card was declined.',
  amount: { value: 500, currency: 'BRL' },
  created_at: '2025-05-03T12:00:00.000Z',
});

const DEFAULT_POST_TX = 'b018b23b-9931-4438-b55f-782edb05b4c2';
const PENDING_POST_TX = 'a111a11a-1111-4111-8111-a111a11a1111';
const REFUSED_POST_TX = 'c222c22c-2222-4222-8222-c222c22c2222';

module.exports = [
  {
    id: 'create-payment',
    url: '/payments',
    method: 'POST',
    variants: [
      {
        id: 'approved',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            scheduleWebhook('payment.approved', DEFAULT_POST_TX, 'processed');
            res.status(201).json(approvedPayload(DEFAULT_POST_TX));
          },
        },
      },
      {
        id: 'pending',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            scheduleWebhook('payment.pending', PENDING_POST_TX, 'pending');
            res.status(202).json(pendingPayload(PENDING_POST_TX));
          },
        },
      },
      {
        id: 'refused',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            scheduleWebhook('payment.refused', REFUSED_POST_TX, 'refused');
            res.status(200).json(refusedPayload(REFUSED_POST_TX));
          },
        },
      },
      {
        id: 'error',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            res.status(500).json({
              error: {
                type: 'api_error',
                message: 'Temporary gateway failure',
                request_id: 'req_mock_500',
              },
            });
          },
        },
      },
    ],
  },
  {
    id: 'get-payment',
    url: '/payments/:id',
    method: 'GET',
    variants: [
      {
        id: 'approved',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            res.status(200).json(approvedPayload(req.params.id));
          },
        },
      },
      {
        id: 'pending',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            res.status(200).json(pendingPayload(req.params.id));
          },
        },
      },
      {
        id: 'refused',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            res.status(200).json(refusedPayload(req.params.id));
          },
        },
      },
      {
        id: 'error',
        type: 'middleware',
        options: {
          middleware: (req, res) => {
            res.status(503).json({
              error: {
                type: 'service_unavailable',
                message: 'Status service unavailable',
              },
            });
          },
        },
      },
    ],
  },
];
