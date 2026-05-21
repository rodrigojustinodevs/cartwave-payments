import { jest } from '@jest/globals';

const validationResultMock = jest.fn();

jest.unstable_mockModule('express-validator', () => ({
  validationResult: validationResultMock,
}));

const { PaymentController } = await import('../../../src/infrastructure/http/controllers/PaymentController.js');
const { UserRole } = await import('../../../src/domain/entities/User.js');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('PaymentController', () => {
  let initiateUC;
  let getStatusUC;
  let controller;

  beforeEach(() => {
    initiateUC = { execute: jest.fn().mockResolvedValue({ paymentId: 'p1', status: 'processed' }) };
    getStatusUC = { execute: jest.fn().mockResolvedValue({ paymentId: 'p1', status: 'processed' }) };
    controller = new PaymentController(initiateUC, getStatusUC);
    validationResultMock.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  describe('initiatePayment()', () => {
    const baseBody = {
      amount: 100,
      currency: 'BRL',
      method: 'PAYPAL',
      product_id: 'prod-1',
      user_id: '11111111-1111-4111-8111-111111111111',
    };

    it('should return 201 on success', async () => {
      const req = {
        body: { ...baseBody },
        user: { id: '11111111-1111-4111-8111-111111111111', role: UserRole.USER },
      };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(initiateUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '11111111-1111-4111-8111-111111111111',
          productId: 'prod-1',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 403 when user tries to spoof another user_id', async () => {
      const req = {
        body: { ...baseBody, user_id: '22222222-2222-4222-8222-222222222222' },
        user: { id: '11111111-1111-4111-8111-111111111111', role: UserRole.USER },
      };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(initiateUC.execute).not.toHaveBeenCalled();
    });

    it('should allow admin to set another user_id', async () => {
      const req = {
        body: { ...baseBody, user_id: '22222222-2222-4222-8222-222222222222' },
        user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: UserRole.ADMIN },
      };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(initiateUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: '22222222-2222-4222-8222-222222222222' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 on validation errors', async () => {
      validationResultMock.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'bad' }] });
      const req = { body: baseBody, user: { id: baseBody.user_id, role: UserRole.USER } };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      initiateUC.execute.mockRejectedValue(new Error('Unexpected'));
      const req = { body: baseBody, user: { id: baseBody.user_id, role: UserRole.USER } };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 400 for domain validation error', async () => {
      const err = new Error('Payment amount must be a positive number');
      initiateUC.execute.mockRejectedValue(err);
      const req = { body: baseBody, user: { id: baseBody.user_id, role: UserRole.USER } };
      const res = makeRes();

      await controller.initiatePayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when USER_NOT_FOUND', async () => {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      initiateUC.execute.mockRejectedValue(err);
      const req = { body: baseBody, user: { id: baseBody.user_id, role: UserRole.USER } };
      const res = makeRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        data: null,
      });
    });
  });

  describe('getPaymentStatus()', () => {
    it('should return 200 with payment data', async () => {
      const req = {
        params: { paymentId: 'p1' },
        user: { id: '11111111-1111-4111-8111-111111111111', role: UserRole.USER },
      };
      const res = makeRes();

      await controller.getPaymentStatus(req, res);

      expect(getStatusUC.execute).toHaveBeenCalledWith('p1', {
        actorUserId: req.user.id,
        actorRole: req.user.role,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: { paymentId: 'p1', status: 'processed' },
      });
    });

    it('should return 404 when PAYMENT_NOT_FOUND', async () => {
      const err = new Error('Payment not found: p1');
      err.code = 'PAYMENT_NOT_FOUND';
      getStatusUC.execute.mockRejectedValue(err);

      const req = { params: { paymentId: 'p1' }, user: { id: 'u1', role: UserRole.USER } };
      const res = makeRes();

      await controller.getPaymentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when FORBIDDEN', async () => {
      const err = new Error('Forbidden');
      err.code = 'FORBIDDEN';
      getStatusUC.execute.mockRejectedValue(err);

      const req = { params: { paymentId: 'p1' }, user: { id: 'u1', role: UserRole.USER } };
      const res = makeRes();

      await controller.getPaymentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on unexpected error', async () => {
      getStatusUC.execute.mockRejectedValue(new Error('DB error'));

      const req = { params: { paymentId: 'p1' }, user: { id: 'u1', role: UserRole.USER } };
      const res = makeRes();

      await controller.getPaymentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
