import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserRole } from '../../../domain/entities/User.js';
import type { CreateUserUseCase } from '../../../domain/use-cases/CreateUserUseCase.js';
import type { GetUserUseCase } from '../../../domain/use-cases/GetUserUseCase.js';
import type { UpdateUserUseCase } from '../../../domain/use-cases/UpdateUserUseCase.js';
import type { DeleteUserUseCase } from '../../../domain/use-cases/DeleteUserUseCase.js';
import type { ListUsersUseCase } from '../../../domain/use-cases/ListUsersUseCase.js';
import { getErrorCode } from '../../../types/errors.js';
import { sendError, sendSuccess, validationMessage } from '../utils/apiResponse.js';

export interface UserControllerDeps {
  createUserUseCase: CreateUserUseCase;
  getUserUseCase: GetUserUseCase;
  updateUserUseCase: UpdateUserUseCase;
  deleteUserUseCase: DeleteUserUseCase;
  listUsersUseCase: ListUsersUseCase;
}

export class UserController {
  private readonly createUserUseCase: CreateUserUseCase;
  private readonly getUserUseCase: GetUserUseCase;
  private readonly updateUserUseCase: UpdateUserUseCase;
  private readonly deleteUserUseCase: DeleteUserUseCase;
  private readonly listUsersUseCase: ListUsersUseCase;

  constructor({
    createUserUseCase,
    getUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    listUsersUseCase,
  }: UserControllerDeps) {
    this.createUserUseCase = createUserUseCase;
    this.getUserUseCase = getUserUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.listUsersUseCase = listUsersUseCase;
  }

  async create(req: Request, res: Response): Promise<Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, validationMessage(errors.array()));
    }

    try {
      const { email, name, password } = req.body as {
        email: string;
        name: string;
        password: string;
      };
      const user = await this.createUserUseCase.execute({ email, name, password });
      return sendSuccess(res, 201, 'User created successfully', user);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'EMAIL_ALREADY_REGISTERED') {
        return sendError(res, 409, message);
      }
      if (message.includes('must be') || message.includes('required') || message.includes('invalid')) {
        return sendError(res, 400, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async getMe(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized');
      }
      const user = await this.getUserUseCase.execute(req.user.id);
      return sendSuccess(res, 200, 'Success', user);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'USER_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const user = await this.getUserUseCase.execute(String(req.params.id));
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.id !== user.id)) {
        return sendError(res, 403, 'Forbidden');
      }
      return sendSuccess(res, 200, 'Success', user);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'USER_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, validationMessage(errors.array()));
    }

    try {
      const id = String(req.params.id);
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.id !== id)) {
        return sendError(res, 403, 'Forbidden');
      }

      const { name, password } = req.body as { name?: string; password?: string };
      const updates: { name?: string; password?: string } = {};
      if (name !== undefined) updates.name = name;
      if (password !== undefined) updates.password = password;

      const user = await this.updateUserUseCase.execute(id, updates);
      return sendSuccess(res, 200, 'User updated successfully', user);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'USER_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      if (message.includes('must be') || message.includes('required') || message.includes('invalid')) {
        return sendError(res, 400, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      await this.deleteUserUseCase.execute(String(req.params.id));
      return sendSuccess(res, 200, 'User deleted successfully', null);
    } catch (err) {
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (code === 'USER_NOT_FOUND') {
        return sendError(res, 404, message);
      }
      return sendError(res, 500, 'Internal server error');
    }
  }

  async list(req: Request, res: Response): Promise<Response> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, validationMessage(errors.array()));
    }

    try {
      const result = await this.listUsersUseCase.execute({
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      return sendSuccess(res, 200, 'Success', result);
    } catch {
      return sendError(res, 500, 'Internal server error');
    }
  }
}
