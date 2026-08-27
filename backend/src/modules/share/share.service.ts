import crypto from 'crypto';
import { db } from '../../shared/database/knex';
import { Errors } from '../../shared/middlewares/error-handler';
import { logger } from '../../shared/utils/logger';
import type { GenerateShareLinkInput } from './share.schema';

export class ShareService {
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async generateLink(
    userId: string,
    schoolId: string,
    role: string,
    input: GenerateShareLinkInput
  ): Promise<{ token: string; shareUrl: string }> {
    const student = await db('students')
      .where({ id: input.studentId, school_id: schoolId })
      .first();
    if (!student) {
      throw Errors.notFound('Aluno');
    }

    // Only check guardian link if user is a guardian (not admin)
    if (role === 'guardian') {
      const guardian = await db('guardians').where({ user_id: userId }).first();
      if (!guardian) {
        throw Errors.notFound('Perfil de responsável');
      }

      const link = await db('student_guardians')
        .where({ student_id: input.studentId, guardian_id: guardian.id })
        .first();
      if (!link) {
        throw Errors.forbidden('Aluno não vinculado a este responsável');
      }
    }

    // Desativar tokens anteriores deste aluno
    await db('share_tokens')
      .where({ student_id: input.studentId, is_active: true })
      .update({ is_active: false, updated_at: new Date() });

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

    await db('share_tokens').insert({
      student_id: input.studentId,
      created_by: userId,
      token,
      is_active: true,
      expires_at: expiresAt,
    });

    logger.info({ studentId: input.studentId, userId, expiresInDays: input.expiresInDays }, 'Share link generated');

    return {
      token,
      shareUrl: `/track/${token}`,
    };
  }

  async getByToken(token: string): Promise<any> {
    const shareToken = await db('share_tokens')
      .where({ token, is_active: true })
      .first();

    if (!shareToken) {
      throw Errors.notFound('Link de acompanhamento');
    }

    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      await db('share_tokens').where({ id: shareToken.id }).update({ is_active: false });
      throw Errors.forbidden('Link expirado');
    }

    const student = await db('students as s')
      .join('users as u', 's.user_id', 'u.id')
      .where('s.id', shareToken.student_id)
      .select(
        's.id', 'u.name', 's.enrollment_number', 's.grade',
        's.class_group', 's.balance', 's.photo_url'
      )
      .first();

    if (!student) {
      throw Errors.notFound('Aluno');
    }

    return {
      student: {
        id: student.id,
        name: student.name,
        enrollment_number: student.enrollment_number,
        grade: student.grade,
        class_group: student.class_group,
        balance: Number(student.balance),
        photo_url: student.photo_url,
      },
      expires_at: shareToken.expires_at,
    };
  }

  async getStudentTransactions(
    token: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    const shareToken = await db('share_tokens')
      .where({ token, is_active: true })
      .first();

    if (!shareToken) {
      throw Errors.notFound('Link de acompanhamento');
    }

    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      throw Errors.forbidden('Link expirado');
    }

    const offset = (page - 1) * limit;

    const baseQuery = db('transactions')
      .where({ student_id: shareToken.student_id });

    const [{ count }] = await baseQuery.clone().count('* as count');
    const total = Number(count);

    const isPostgres = db.client.config.client === 'pg';
    const subquery = isPostgres
      ? "(SELECT string_agg(payment_method, ',') FROM transaction_payments WHERE transaction_id = transactions.id)"
      : "(SELECT group_concat(payment_method) FROM transaction_payments WHERE transaction_id = transactions.id)";

    const rawData = await baseQuery
      .clone()
      .select('transactions.*')
      .select(db.raw(`${subquery} as payment_methods`))
      .orderBy('transactions.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const data = rawData.map((tx: any) => {
      const notes = (tx.notes || '').toLowerCase();
      const isAdjustment = tx.identification_method === 'balance_adjustment' || (tx.identification_method === 'manual' && (notes.includes('ajuste') || notes.includes('saldo')));
      const isCredit = isAdjustment && notes.includes('crédito');
      const isRechargePortal = notes.includes('portal') || notes.includes('recarga');
      const isPaymentReceived = notes.includes('recebimento de pagamento');

      let type = 'purchase';
      if (isCredit || isRechargePortal || isPaymentReceived) type = 'credit';
      if (isAdjustment && !isCredit && !isRechargePortal && !isPaymentReceived) type = 'debit';

      return {
        id: tx.id,
        amount: tx.final_amount,
        type,
        method: tx.payment_methods || (isAdjustment ? 'saldo' : 'outros'),
        description: tx.notes || (type === 'purchase' ? 'Consumo na Cantina' : 'Ajuste de Saldo'),
        created_at: tx.created_at,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

export const shareService = new ShareService();
