import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { LoginInput } from './auth.schemas.js';

export class AuthService {
  static async login(input: LoginInput) {
    const admin = await prisma.adminUser.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!admin || !admin.isActive) throw new UnauthorizedError('Invalid email or password.');

    const isMatch = await bcrypt.compare(input.password, admin.passwordHash);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password.');

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      env.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
    };
  }
}
