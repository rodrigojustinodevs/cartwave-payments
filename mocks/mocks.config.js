'use strict';

/** Configuração do Mocks Server (carregada via mocks.config.js na raiz). */
module.exports = {
  server: {
    port: 3110,
    host: '0.0.0.0',
  },
  log: process.env.CI === 'true' ? 'silent' : 'info',
  mock: {
    collections: {
      selected: 'payment-approved',
    },
  },
  plugins: {
    inquirerCli: {
      enabled: process.env.MOCKS_CLI !== 'false',
    },
  },
};
