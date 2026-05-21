import type { User } from '../entities/User.js';

export interface UserListParams {
  page: number;
  pageSize: number;
}

export interface UserListResult {
  items: User[];
  total: number;
}

export interface UserRepositoryPort {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  list(params: UserListParams): Promise<UserListResult>;
}
