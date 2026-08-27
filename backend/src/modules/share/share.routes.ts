import { Router, type IRouter } from 'express';
import { shareController } from './share.controller';
import { authGuard } from '../../shared/middlewares/auth.guard';
import { roleGuard } from '../../shared/middlewares/role.guard';
import { validate, validateParams } from '../../shared/middlewares/validate';
import { generateShareLinkSchema, tokenParamSchema } from './share.schema';

const router: IRouter = Router();

// ===== PUBLIC ROUTES (no auth required) =====
router.get(
  '/:token/transactions',
  validateParams(tokenParamSchema),
  shareController.getTransactions.bind(shareController)
);

router.get(
  '/:token',
  validateParams(tokenParamSchema),
  shareController.getByToken.bind(shareController)
);

// ===== PROTECTED ROUTES (guardian/admin only) =====
router.post(
  '/generate',
  authGuard,
  roleGuard('admin', 'guardian'),
  validate(generateShareLinkSchema),
  shareController.generateLink.bind(shareController)
);

export { router as shareRoutes };
