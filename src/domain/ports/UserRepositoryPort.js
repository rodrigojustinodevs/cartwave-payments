'use strict';

/**
 * Port for User persistence.
 */
class UserRepositoryPort {
  /**
   * @param {import('../entities/User').User} user
   * @returns {Promise<import('../entities/User').User>}
   */
  async save(user) {
    throw new Error('UserRepositoryPort.save() not implemented');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/User').User|null>}
   */
  async findById(id) {
    throw new Error('UserRepositoryPort.findById() not implemented');
  }

  /**
   * @param {string} email
   * @returns {Promise<import('../entities/User').User|null>}
   */
  async findByEmail(email) {
    throw new Error('UserRepositoryPort.findByEmail() not implemented');
  }

  /**
   * @param {import('../entities/User').User} user
   * @returns {Promise<import('../entities/User').User>}
   */
  async update(user) {
    throw new Error('UserRepositoryPort.update() not implemented');
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('UserRepositoryPort.delete() not implemented');
  }

  /**
   * @param {{ page: number, pageSize: number }} params
   * @returns {Promise<{ items: import('../entities/User').User[], total: number }>}
   */
  async list(params) {
    throw new Error('UserRepositoryPort.list() not implemented');
  }
}

module.exports = { UserRepositoryPort };
