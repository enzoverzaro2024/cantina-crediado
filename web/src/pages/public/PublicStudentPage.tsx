import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Coffee, ArrowUpCircle, ShoppingCart, Clock, RefreshCw, Wallet, BookOpen, Users } from 'lucide-react';
import axios from 'axios';
import './PublicStudentPage.css';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_BASE = rawUrl.endsWith('/api') || rawUrl.endsWith('/api/')
  ? rawUrl
  : `${rawUrl.replace(/\/+$/, '')}/api`;

interface Student {
  name: string;
  enrollment_number: string;
  grade: string;
  class_group: string;
  balance: number;
  photo_url: string | null;
}

interface Transaction {
  id: string;
  notes: string | null;
  total_amount: number;
  final_amount: number;
  status: string;
  identification_method: string;
  created_at: string;
}

export default function PublicStudentPage() {
  const { token } = useParams<{ token: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
    loadData();

    const interval = setInterval(() => {
      if (tokenRef.current) {
        loadData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      const [studentRes, txRes] = await Promise.all([
        axios.get(`${API_BASE}/public/student/${token}`),
        axios.get(`${API_BASE}/public/student/${token}/transactions`),
      ]);

      setStudent(studentRes.data.data.student);
      setTransactions(txRes.data.data.data || []);
      setLastUpdate(new Date());
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Link inválido ou aluno não encontrado.');
      } else {
        setError('Erro ao carregar dados. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setLoadingTx(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    let d: Date;
    if (typeof dateStr === 'string') {
      const normalizedDate = dateStr.includes('Z') || dateStr.includes('+')
        ? dateStr
        : dateStr.replace(' ', 'T') + 'Z';
      d = new Date(normalizedDate);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const totalExpenses = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.final_amount || t.total_amount), 0);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    const isCredit = tx.notes?.toLowerCase().includes('crédito') ||
      tx.notes?.toLowerCase().includes('recarga') ||
      tx.notes?.toLowerCase().includes('portal');
    if (filterType === 'balance') return isCredit;
    if (filterType === 'purchase') return !isCredit;
    return true;
  });

  if (loading) {
    return (
      <div className="public-student-page">
        <div className="public-student-header">
          <div className="public-student-header-logo">
            <Coffee size={18} />
          </div>
          <div>
            <h1>Cantina Escolar</h1>
            <p>Acompanhamento de Gastos</p>
          </div>
        </div>
        <div className="public-student-loading">
          <div className="public-student-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-student-page">
        <div className="public-student-header">
          <div className="public-student-header-logo">
            <Coffee size={18} />
          </div>
          <div>
            <h1>Cantina Escolar</h1>
            <p>Acompanhamento de Gastos</p>
          </div>
        </div>
        <div className="public-student-error">
          <Users size={48} />
          <h2>Link Inválido</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-student-page">
      <header className="public-student-header">
        <div className="public-student-header-logo">
          <Coffee size={18} />
        </div>
        <div>
          <h1>Cantina Escolar</h1>
          <p>Acompanhamento de Gastos</p>
        </div>
      </header>

      <div className="public-student-content">
        <div className="public-student-welcome">
          <h2>Olá, <span>{student?.name}</span></h2>
          <p>Veja em tempo real os gastos e saldo na cantina</p>
        </div>

        <div className="public-student-cards">
          <div className="public-student-card main">
            <div className="public-student-card-label">Saldo Atual</div>
            <div className="public-student-card-value">
              {formatCurrency(Number(student?.balance) || 0)}
            </div>
          </div>
          <div className="public-student-card">
            <div className="public-student-card-label">Total Gasto</div>
            <div className="public-student-card-value expenses">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
          <div className="public-student-card">
            <div className="public-student-card-label">Transações</div>
            <div className="public-student-card-value">
              {transactions.length}
            </div>
          </div>
        </div>

        <div className="public-student-info">
          <div className="public-student-info-row">
            <span className="public-student-info-label">Matrícula</span>
            <span className="public-student-info-value">{student?.enrollment_number}</span>
          </div>
          {student?.grade && (
            <div className="public-student-info-row">
              <span className="public-student-info-label">Série</span>
              <span className="public-student-info-value">{student.grade}</span>
            </div>
          )}
          {student?.class_group && (
            <div className="public-student-info-row">
              <span className="public-student-info-label">Turma</span>
              <span className="public-student-info-value">{student.class_group}</span>
            </div>
          )}
          <div className="public-student-info-row">
            <span className="public-student-info-label">Última atualização</span>
            <span className="public-student-info-value">
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="public-student-transactions">
          <h3>
            <Clock size={18} />
            Histórico de Movimentações
            <button
              style={{
                marginLeft: 'auto',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8',
                borderRadius: '8px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 600,
              }}
              onClick={loadData}
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </h3>

          <div className="public-student-filter-tabs">
            <button
              className={`public-student-filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Tudo
            </button>
            <button
              className={`public-student-filter-tab ${filterType === 'balance' ? 'active' : ''}`}
              onClick={() => setFilterType('balance')}
            >
              Saldo / Recarga
            </button>
            <button
              className={`public-student-filter-tab ${filterType === 'purchase' ? 'active' : ''}`}
              onClick={() => setFilterType('purchase')}
            >
              Compras
            </button>
          </div>

          {loadingTx ? (
            <div className="public-student-loading" style={{ minHeight: '20vh' }}>
              <div className="public-student-spinner" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="public-student-empty">
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <div className="public-student-tx-list">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.notes?.toLowerCase().includes('crédito') ||
                  tx.notes?.toLowerCase().includes('recarga') ||
                  tx.notes?.toLowerCase().includes('portal');
                const isPending = tx.status === 'pending';

                return (
                  <div key={tx.id} className="public-student-tx-item" style={isPending ? { opacity: 0.7 } : {}}>
                    <div className="public-student-tx-left">
                      <div className={`public-student-tx-icon ${isPending ? 'pending' : (isCredit ? 'credit' : 'purchase')}`}>
                        {isCredit ? <ArrowUpCircle size={18} /> : <ShoppingCart size={18} />}
                      </div>
                      <div className="public-student-tx-info">
                        <p>{tx.notes || (isCredit ? 'Recarga' : 'Compra na Cantina')}</p>
                        <div className="public-student-tx-meta">
                          <span>{formatDate(tx.created_at)}</span>
                          <span className="public-student-tx-method">
                            {tx.identification_method === 'manual' ? 'Manual' :
                              tx.identification_method === 'card' ? 'Cartão' :
                                tx.identification_method === 'facial' ? 'Facial' :
                                  tx.identification_method}
                          </span>
                          {isPending && <span style={{ color: '#f59e0b' }}>Pendente</span>}
                        </div>
                      </div>
                    </div>
                    <div className={`public-student-tx-amount ${isPending ? 'pending' : (isCredit ? 'credit' : 'purchase')}`}>
                      {isPending ? '' : (isCredit ? '+' : '-')}
                      {formatCurrency(Number(tx.final_amount || tx.total_amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="public-student-footer">
          Acompanhamento em tempo real • Dados atualizados a cada 10 segundos
        </div>
      </div>
    </div>
  );
}
