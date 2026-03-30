export type Role = 'USER' | 'ADMIN';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};
