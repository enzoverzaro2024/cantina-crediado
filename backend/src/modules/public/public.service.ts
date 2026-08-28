import crypto from 'crypto';
import { db } from '../../shared/database/knex';
import { Errors } from '../../shared/middlewares/error-handler';

export class PublicService {
  /**
   * Generate or return existing public token for a student.
   */
  async generateToken(schoolId: string, studentId: string): Promise<{ token: string; url: string }> {
    const student = await db('students')
      .where({ id: studentId, school_id: schoolId })
      .first();

    if (!student) {
      throw Errors.notFound('Aluno');
    }

    let token = student.public_token;

    if (!token) {
      token = crypto.randomUUID();
      await db('students')
        .where({ id: studentId })
        .update({ public_token: token, updated_at: new Date() });
    }

    return {
      token,
      url: `/aluno/${token}`,
    };
  }

  /**
   * Regenerate public token for a student.
   */
  async regenerateToken(schoolId: string, studentId: string): Promise<{ token: string; url: string }> {
    const student = await db('students')
      .where({ id: studentId, school_id: schoolId })
      .first();

    if (!student) {
      throw Errors.notFound('Aluno');
    }

    const token = crypto.randomUUID();
    await db('students')
      .where({ id: studentId })
      .update({ public_token: token, updated_at: new Date() });

    return {
      token,
      url: `/aluno/${token}`,
    };
  }

  /**
   * Get student data by public token (no auth required).
   */
  async getStudentByToken(token: string): Promise<Record<string, any>> {
    const student = await db('students as s')
      .join('users as u', 's.user_id', 'u.id')
      .where({ 's.public_token': token, 's.is_active': true })
      .select(
        'u.name',
        's.enrollment_number',
        's.grade',
        's.class_group',
        's.balance',
        's.photo_url',
        's.created_at'
      )
      .first();

    if (!student) {
      throw Errors.notFound('Aluno');
    }

    return student;
  }

  /**
   * Get transactions by public token (no auth required).
   */
  async getTransactionsByToken(
    token: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: any[]; pagination: any }> {
    const student = await db('students')
      .where({ public_token: token, is_active: true })
      .select('id', 'school_id')
      .first();

    if (!student) {
      throw Errors.notFound('Aluno');
    }

    const offset = (page - 1) * limit;

    const baseQuery = db('transactions')
      .where({ student_id: student.id, school_id: student.school_id });

    const [{ count }] = await baseQuery.clone().count('* as count');
    const total = Number(count);

    const data = await baseQuery
      .clone()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

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

export const publicService = new PublicService();
