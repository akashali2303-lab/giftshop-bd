import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { env } from '../../config/env.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      res.cookie('admin_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { admin: req.admin } });
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('admin_token', { httpOnly: true, sameSite: 'lax' });
    res.status(200).json({ success: true, message: 'Successfully logged out' });
  }
}
