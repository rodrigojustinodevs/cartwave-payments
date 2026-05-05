'use strict';

const path = require('path');
const net = require('net');
const { createServer } = require('@mocks-server/main');
const { MockPaymentGateway } = require('../../src/infrastructure/providers/MockPaymentGateway');

const MOCKS_DIR = path.join(__dirname, '../../mocks');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

describe('Mocks Server + MockPaymentGateway', () => {
  let core;
  let port;
  let gateway;

  beforeAll(async () => {
    port = await getFreePort();
    core = createServer({
      log: 'silent',
      server: { port, host: '127.0.0.1' },
      files: {
        enabled: true,
        path: MOCKS_DIR,
        watch: false,
      },
      config: {
        readFile: false,
        readArguments: false,
        readEnvironment: false,
      },
      plugins: {
        inquirerCli: { enabled: false },
      },
      mock: {
        collections: {
          selected: 'payment-approved',
        },
      },
    });
    await core.start();
    gateway = new MockPaymentGateway(`http://127.0.0.1:${port}`);
  });

  afterAll(async () => {
    if (core) {
      await core.stop();
    }
  });

  const payload = {
    amount: 100,
    currency: 'BRL',
    paymentMethod: 'pay-pal',
    productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
  };

  it('payment-approved: createPayment returns processed', async () => {
    core.mock.collections.select('payment-approved');
    const result = await gateway.createPayment(payload);
    expect(result.status).toBe('processed');
    expect(result.txId).toBeTruthy();
  });

  it('payment-pending: createPayment returns pending', async () => {
    core.mock.collections.select('payment-pending');
    const result = await gateway.createPayment(payload);
    expect(result.status).toBe('pending');
    expect(result.txId).toBeTruthy();
  });

  it('payment-refused: createPayment returns refused', async () => {
    core.mock.collections.select('payment-refused');
    const result = await gateway.createPayment(payload);
    expect(result.status).toBe('refused');
    expect(result.txId).toBeTruthy();
  });

  it('payment-error: createPayment rejects', async () => {
    core.mock.collections.select('payment-error');
    await expect(gateway.createPayment(payload)).rejects.toThrow();
  });

  it('getPaymentStatus reflects selected collection', async () => {
    core.mock.collections.select('payment-approved');
    const created = await gateway.createPayment(payload);
    const status = await gateway.getPaymentStatus(created.txId);
    expect(status.status).toBe('processed');

    core.mock.collections.select('payment-pending');
    const pendingRead = await gateway.getPaymentStatus(created.txId);
    expect(pendingRead.status).toBe('pending');
  });
});
