import { Router, type IRouter } from 'express';
import { publicController } from './public.controller';
import { authGuard } from '../../shared/middlewares/auth.guard';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router: IRouter = Router();

// Public routes (no auth)
router.get('/student/:token', publicController.getStudent.bind(publicController));
router.get('/student/:token/transactions', publicController.getTransactions.bind(publicController));

export { router as publicRoutes };
