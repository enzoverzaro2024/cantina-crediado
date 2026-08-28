import { Request, Response, NextFunction } from 'express';
import { publicService } from './public.service';

export class PublicController {
  /** POST /api/students/:id/public-token */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await publicService.generateToken(req.user!.schoolId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/students/:id/public-token/regenerate */
  async regenerateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await publicService.regenerateToken(req.user!.schoolId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/public/student/:token */
  async getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await publicService.getStudentByToken(req.params.token);
      res.json({ success: true, data: { student } });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/public/student/:token/transactions */
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await publicService.getTransactionsByToken(req.params.token, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
