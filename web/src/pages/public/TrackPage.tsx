import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Coffee, ArrowUpCircle, ShoppingCart, Clock, AlertTriangle,
  CreditCard, BookOpen, User
} from 'lucide-react';
import { api } from '../../services/api';
import './TrackPage.css';

interface Student {
  id: string;
  name: string;
  enrollment_number: string;
  grade: string;
  class_group: string;
  balance: number;
  photo_url: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  method: string;
  description: string;
  created_at: string;
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTx, setLoadingTx] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentRes, txRes] = await Promise.all([
        api.get(`/share/${token}`),
        api.get(`/share/${token}/transactions`),
      ]);

      if (studentRes.data.success) {
        setStudent(studentRes.data.data.student);
        setExpiresAt(studentRes.data.data.expires_at);
      }

      if (txRes.data.success) {
        setTransactions(txRes.data.data.data || []);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Link inválido ou expirado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const normalizedDate = dateStr.includes('Z') || dateStr.includes('+')
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(normalizedDate);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const totalExpenses = transactions
    .filter(t => t.type === 'purchase' || t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (loading) {
    return (
      <div className="track-page">
        <div className="track-loading">
          <div className="track-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="track-page">
        <div className="track-error">
          <AlertTriangle size={48} />
          <h2>Link Indisponível</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-page">
      <header className="track-header">
        <div className="track-header-left">
          <div className="track-header-logo">
            <Coffee size={20} />
          </div>
          <div className="track-header-title">
            <h1>Acompanhamento</h1>
            <p>Cantina Escolar</p>
          </div>
        </div>
      </header>

      <div className="track-content">
        {student && (
          <>
            <div className="track-student-card">
              <div className="track-student-header">
                <div className="track-student-avatar">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.name} />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className="track-student-info">
                  <h2>{student.name}</h2>
                  <div className="track-student-meta">
                    <span><CreditCard size={12} /> Matrícula: {student.enrollment_number}</span>
                    {student.grade && <span><BookOpen size={12} /> {student.grade}</span>}
                    {student.class_group && <span>{student.class_group}</span>}
                  </div>
                </div>
              </div>

              <div className="track-balance-section">
                <div className="track-balance-card main">
                  <div className="track-balance-label">Saldo Atual</div>
                  <div className="track-balance-value">
                    {formatCurrency(student.balance)}
                  </div>
                </div>
                <div className="track-balance-card">
                  <div className="track-balance-label">Total Gasto</div>
                  <div className="track-balance-value expenses">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>
              </div>

              {expiresAt && (
                <div className="track-expires">
                  <Clock size={14} />
                  Link válido até: {formatDate(expiresAt)}
                </div>
              )}
            </div>

            <div className="track-transactions">
              <div className="track-section-title">
                <h3>
                  <Clock size={18} />
                  Histórico de Movimentações
                </h3>
              </div>

              {transactions.length === 0 ? (
                <div className="track-empty">
                  <p>Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                <div className="track-tx-list">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'credit' || tx.type === 'recharge';
                    return (
                      <div key={tx.id} className="track-tx-item">
                        <div className="track-tx-left">
                          <div className={`track-tx-icon ${isCredit ? 'credit' : 'purchase'}`}>
                            {isCredit
                              ? <ArrowUpCircle size={18} />
                              : <ShoppingCart size={18} />
                            }
                          </div>
                          <div className="track-tx-info">
                            <p>{tx.description || (isCredit ? 'Recarga' : 'Compra na Cantina')}</p>
                            <div className="track-tx-meta-info">
                              <span>{formatDate(tx.created_at)}</span>
                              <span className="track-method-badge">
                                {tx.method.replace('school_balance', 'Saldo').replace('cash', 'Dinheiro').replace('pix', 'PIX').replace('credit_card', 'Cartão').replace('debit_card', 'Cartão')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`track-tx-amount ${isCredit ? 'credit' : 'purchase'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
