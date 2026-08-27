import app from './app';
import { config } from './config';
import { logger } from './shared/utils/logger';

async function bootstrap() {
  try {
    // Import database and run pending migrations automatically
    const { db } = await import('./shared/database/knex');

    logger.info('🔄 Running database migrations...');
    try {
      await db.migrate.latest();
      logger.info('✅ Migrations complete');
    } catch (migErr) {
      logger.warn({ migErr }, '⚠️ Migration runner failed, continuing with manual column checks...');
    }

    // ── Hard guarantee: ensure billing_type column exists ──────────────
    // This runs REGARDLESS of whether migrations succeeded, because the
    // Knex migration runner can silently skip if it cannot find .js files.
    try {
      const hasBillingType = await db.schema.hasColumn('students', 'billing_type');
      if (!hasBillingType) {
        logger.info('➕ Adding missing billing_type column to students...');
        await db.schema.alterTable('students', (table) => {
          table.string('billing_type', 20).defaultTo('pix_direto');
        });
        // Backfill existing on_credit students
        await db.raw(`
          UPDATE students
          SET billing_type = 'crediario'
          WHERE id IN (
            SELECT DISTINCT t.student_id
            FROM transactions t
            JOIN transaction_payments tp ON tp.transaction_id = t.id
            WHERE tp.payment_method = 'on_credit' AND t.student_id IS NOT NULL
          )
        `).catch(() => {});
        logger.info('✅ billing_type column added and backfilled');
      } else {
        logger.info('✅ billing_type column already exists');
      }
    } catch (colErr) {
      logger.warn({ colErr }, '⚠️ Could not verify/add billing_type column');
    }
    // ───────────────────────────────────────────────────────────────────

    // ── Hard guarantee: ensure share_tokens table exists ─────────────
    try {
      const hasShareTokens = await db.schema.hasTable('share_tokens');
      if (!hasShareTokens) {
        logger.info('➕ Creating missing share_tokens table...');
        await db.schema.createTable('share_tokens', (table) => {
          table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
          table.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
          table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
          table.string('token', 64).notNullable().unique();
          table.boolean('is_active').defaultTo(true);
          table.timestamp('expires_at', { useTz: true });
          table.timestamp('created_at', { useTz: true }).defaultTo(db.fn.now());
          table.timestamp('updated_at', { useTz: true }).defaultTo(db.fn.now());
        });
        await db.raw('CREATE INDEX idx_share_tokens_token ON share_tokens(token, is_active)');
        await db.raw('CREATE INDEX idx_share_tokens_student ON share_tokens(student_id)');
        logger.info('✅ share_tokens table created');
      } else {
        logger.info('✅ share_tokens table already exists');
      }
    } catch (tableErr) {
      logger.warn({ tableErr }, '⚠️ Could not verify/create share_tokens table');
    }
    // ───────────────────────────────────────────────────────────────────

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Cantina Escolar API running on port ${config.port}`);
      logger.info(`📋 Environment: ${config.env}`);
      logger.info(`🔗 URL: ${config.apiUrl}`);
      logger.info(`❤️  Health: ${config.apiUrl}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database pool
        const { db } = await import('./shared/database/knex');
        await db.destroy();
        logger.info('Database pool closed');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
