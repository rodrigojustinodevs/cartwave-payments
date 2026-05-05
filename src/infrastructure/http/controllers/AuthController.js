'use strict';

const { validationResult } = require('express-validator');

class AuthController {
  /**
   * @param {import('../../../domain/use-cases/LoginUseCase').LoginUseCase} loginUseCase
   */
  constructor(loginUseCase) {
    this.loginUseCase = loginUseCase;
  }

  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const result = await this.loginUseCase.execute({ email, password });
      return res.status(200).json(result);
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = { AuthController };
