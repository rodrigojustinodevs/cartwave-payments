import request from 'supertest';
import express from 'express';
import { CreateUserUseCase } from '../../src/domain/use-cases/CreateUserUseCase.js';
import { GetUserUseCase } from '../../src/domain/use-cases/GetUserUseCase.js';
import { UpdateUserUseCase } from '../../src/domain/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../src/domain/use-cases/DeleteUserUseCase.js';
import { ListUsersUseCase } from '../../src/domain/use-cases/ListUsersUseCase.js';
import { LoginUseCase } from '../../src/domain/use-cases/LoginUseCase.js';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenService } from '../../src/infrastructure/security/JwtTokenService.js';
import { UserController } from '../../src/infrastructure/http/controllers/UserController.js';
import { AuthController } from '../../src/infrastructure/http/controllers/AuthController.js';
import { createUserRouter } from '../../src/infrastructure/http/routes/userRoutes.js';
import { createAuthRouter } from '../../src/infrastructure/http/routes/authRoutes.js';
import { createAuthMiddleware, requireRole } from '../../src/infrastructure/http/middlewares/authMiddleware.js';
import { User, UserRole } from '../../src/domain/entities/User.js';
import { errorHandler, notFoundHandler } from '../../src/infrastructure/http/middlewares/errorHandler.js';

class InMemoryUserRepository {
  constructor() {
    this.byId = new Map();
    this.byEmail = new Map();
  }

  async save(user) {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.trim().toLowerCase(), user);
    return user;
  }

  async findById(id) {
    return this.byId.get(id) || null;
  }

  async findByEmail(email) {
    const key = String(email).trim().toLowerCase();
    return this.byEmail.get(key) || null;
  }

  async update(user) {
    const existing = this.byId.get(user.id);
    if (existing && existing.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      this.byEmail.delete(existing.email.trim().toLowerCase());
    }
    return this.save(user);
  }

  async delete(id) {
    const u = this.byId.get(id);
    if (u) {
      this.byId.delete(id);
      this.byEmail.delete(u.email.trim().toLowerCase());
    }
  }

  async list({ page, pageSize }) {
    const all = Array.from(this.byId.values());
    const total = all.length;
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total };
  }
}

describe('Users API integration (in-memory)', () => {
  const JWT_SECRET = 'users-api-integration-test-secret-key';

  let app;
  let userRepo;
  let tokenService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    const passwordHasher = new BcryptPasswordHasher(4);
    tokenService = new JwtTokenService(JWT_SECRET);
    const authMiddleware = createAuthMiddleware(tokenService);

    const createUserUseCase = new CreateUserUseCase(userRepo, passwordHasher);
    const getUserUseCase = new GetUserUseCase(userRepo);
    const updateUserUseCase = new UpdateUserUseCase(userRepo, passwordHasher);
    const deleteUserUseCase = new DeleteUserUseCase(userRepo);
    const listUsersUseCase = new ListUsersUseCase(userRepo);
    const loginUseCase = new LoginUseCase(userRepo, passwordHasher, tokenService);

    const userController = new UserController({
      createUserUseCase,
      getUserUseCase,
      updateUserUseCase,
      deleteUserUseCase,
      listUsersUseCase,
    });
    const authController = new AuthController(loginUseCase);

    app = express();
    app.use(express.json());
    app.use('/api/v1', createAuthRouter(authController));
    app.use('/api/v1', createUserRouter(userController, authMiddleware, requireRole));
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  it('should register, login, and access /users/me', async () => {
    const reg = await request(app).post('/api/v1/users').send({
      email: 'flow@test.com',
      name: 'Flow User',
      password: 'password123',
    });
    expect(reg.status).toBe(201);

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'flow@test.com',
      password: 'password123',
    });
    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data.token).toBeDefined();

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('flow@test.com');
  });

  it('should allow admin to list users', async () => {
    const ph = new BcryptPasswordHasher(4);
    const admin = new User({
      email: 'admin@test.com',
      name: 'Admin',
      passwordHash: await ph.hash('adminpass1'),
      role: UserRole.ADMIN,
    });
    await userRepo.save(admin);

    const token = tokenService.sign({ sub: admin.id, role: UserRole.ADMIN });

    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
  });
});
