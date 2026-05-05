'use strict';

module.exports = [
  {
    id: 'payment-approved',
    routes: ['create-payment:approved', 'get-payment:approved'],
  },
  {
    id: 'payment-pending',
    routes: ['create-payment:pending', 'get-payment:pending'],
  },
  {
    id: 'payment-refused',
    routes: ['create-payment:refused', 'get-payment:refused'],
  },
  {
    id: 'payment-error',
    routes: ['create-payment:error', 'get-payment:error'],
  },
];
