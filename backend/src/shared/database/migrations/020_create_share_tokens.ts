import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('share_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.string('token', 64).notNullable().unique();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('expires_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_share_tokens_token ON share_tokens(token, is_active)');
  await knex.schema.raw('CREATE INDEX idx_share_tokens_student ON share_tokens(student_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('share_tokens');
}
