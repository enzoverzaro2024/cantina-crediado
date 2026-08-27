import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Coffee, ArrowUpCircle, ShoppingCart, AlertTriangle,
  CreditCard, BookOpen, User, ChevronDown, ChevronUp
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

interface WeekGroup {
  label: string;
  transactions: Transaction[];
}

interface MonthGroup {
  label: string;
  weeks: WeekGroup[];
  total: number;
  collapsed: boolean;
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function formatDateOnly(dateStr: string): string {
  if (!dateStr) return '---';
  const normalizedDate = dateStr.includes('Z') || dateStr.includes('+')
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(normalizedDate);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function cleanDescription(desc: string): string {
  if (!desc) return 'Consumo na Cantina';
  if (desc.toLowerCase().includes('lançamento manual') && desc.toLowerCase().includes('ficha a prazo')) {
    return 'Consumo na Cantina';
  }
  if (desc.toLowerCase().includes('lançamento manual')) {
    return 'Consumo na Cantina';
  }
  if (desc.toLowerCase().includes('recebimento de pagamento')) return 'Recebimento de Pagamento';
  return desc;
}

function groupByMonthAndWeek(transactions: Transaction[]): MonthGroup[] {
  const months: Record<string, MonthGroup> = {};

  const sorted = [...transactions].sort((a, b) => {
    const da = new Date((a.created_at.includes('Z') || a.created_at.includes('+') ? a.created_at : a.created_at.replace(' ', 'T') + 'Z'));
    const db = new Date((b.created_at.includes('Z') || b.created_at.includes('+') ? b.created_at : b.created_at.replace(' ', 'T') + 'Z'));
    return db.getTime() - da.getTime();
  });

  for (const tx of sorted) {
    const normalizedDate = tx.created_at.includes('Z') || tx.created_at.includes('+')
      ? tx.created_at
      : tx.created_at.replace(' ', 'T') + 'Z';
    const d = new Date(normalizedDate);
    if (isNaN(d.getTime())) continue;

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    if (!months[monthKey]) {
      months[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), weeks: [], total: 0, collapsed: false };
    }

    const weekNum = getWeekNumber(d);
    const weekKey = `S${weekNum}`;
    let weekGroup = months[monthKey].weeks.find(w => w.label === weekKey);
    if (!weekGroup) {
      weekGroup = { label: weekKey, transactions: [] };
      months[monthKey].weeks.push(weekGroup);
    }
    weekGroup.transactions.push(tx);
    months[monthKey].total += Number(tx.amount);
  }

  return Object.values(months);
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) loadData();
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
      setError(err.response?.data?.error?.message || 'Link inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatExpires = (dateStr: string) => {
    if (!dateStr) return '';
    const normalizedDate = dateStr.includes('Z') || dateStr.includes('+')
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(normalizedDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const totalExpenses = transactions
    .filter(t => t.type === 'purchase' || t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCredits = transactions
    .filter(t => t.type === 'credit' || t.type === 'recharge')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthGroups = useMemo(() => groupByMonthAndWeek(transactions), [transactions]);

  const toggleMonth = (label: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

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
      <div className="track-page track-page-error">
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
                <div className="track-balance-card expenses">
                  <div className="track-balance-label">Total Gasto</div>
                  <div className="track-balance-value expenses">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>
                {totalCredits > 0 && (
                  <div className="track-balance-card credits">
                    <div className="track-balance-label">Total Recebido</div>
                    <div className="track-balance-value credit">
                      {formatCurrency(totalCredits)}
                    </div>
                  </div>
                )}
              </div>

              {expiresAt && (
                <div className="track-expires">
                  Link válido até: {formatExpires(expiresAt)}
                </div>
              )}
            </div>

            <div className="track-transactions">
              <div className="track-section-title">
                <h3>Extrato</h3>
              </div>

              {transactions.length === 0 ? (
                <div className="track-empty">
                  <p>Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                <div className="track-months">
                  {monthGroups.map((month) => {
                    const isCollapsed = collapsedMonths.has(month.label);
                    return (
                      <div key={month.label} className="track-month-group">
                        <button className="track-month-header" onClick={() => toggleMonth(month.label)}>
                          <span className="track-month-label">{month.label}</span>
                          <span className="track-month-toggle">
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </span>
                        </button>
                        {!isCollapsed && month.weeks.map((week) => (
                          <div key={week.label} className="track-week-group">
                            <div className="track-week-label">{week.label}</div>
                            <div className="track-tx-list">
                              {week.transactions.map((tx) => {
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
                                        <p>{cleanDescription(tx.description)}</p>
                                        <div className="track-tx-meta-info">
                                          <span>{formatDateOnly(tx.created_at)}</span>
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
                          </div>
                        ))}
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
