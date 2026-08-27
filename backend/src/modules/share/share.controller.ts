import { Request, Response, NextFunction } from 'express';
import { shareService } from './share.service';

export class ShareController {
  /** POST /api/share/generate */
  async generateLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shareService.generateLink(
        req.user!.userId,
        req.user!.schoolId,
        req.user!.role,
        req.body
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/share/:token (PUBLIC) */
  async getByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shareService.getByToken(req.params.token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/share/:token/transactions (PUBLIC) */
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await shareService.getStudentTransactions(
        req.params.token,
        page,
        limit
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const shareController = new ShareController();
