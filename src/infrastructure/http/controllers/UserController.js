'use strict';

const { validationResult } = require('express-validator');
const { UserRole } = require('../../../domain/entities/User');

class UserController {
  /**
   * @param {object} useCases
   */
  constructor({
    createUserUseCase,
    getUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    listUsersUseCase,
  }) {
    this.createUserUseCase = createUserUseCase;
    this.getUserUseCase = getUserUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.listUsersUseCase = listUsersUseCase;
  }

  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, name, password } = req.body;
      const user = await this.createUserUseCase.execute({ email, name, password });
      return res.status(201).json(user);
    } catch (err) {
      if (err.code === 'EMAIL_ALREADY_REGISTERED') {
        return res.status(409).json({ error: err.message });
      }
      if (err.message.includes('must be') || err.message.includes('required') || err.message.includes('invalid')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMe(req, res) {
    try {
      const user = await this.getUserUseCase.execute(req.user.id);
      return res.status(200).json(user);
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getById(req, res) {
    try {
      const user = await this.getUserUseCase.execute(req.params.id);
      if (req.user.role !== UserRole.ADMIN && req.user.id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(200).json(user);
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, password } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (password !== undefined) updates.password = password;

      const user = await this.updateUserUseCase.execute(id, updates);
      return res.status(200).json(user);
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      if (err.message.includes('must be') || err.message.includes('required') || err.message.includes('invalid')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async delete(req, res) {
    try {
      await this.deleteUserUseCase.execute(req.params.id);
      return res.status(204).send();
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async list(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await this.listUsersUseCase.execute({
        page: req.query.page,
        pageSize: req.query.pageSize,
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = { UserController };
