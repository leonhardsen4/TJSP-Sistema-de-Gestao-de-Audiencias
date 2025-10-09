import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface DashboardStats {
  totalAudiencias: number;
  audienciasHoje: number;
  totalVaras: number;
  totalJuizes: number;
  totalPromotores: number;
  totalAdvogados: number;
  totalPessoas: number;
}

interface Audiencia {
  id: number;
  dataAudiencia: string;
  horarioInicio: string;
  status: string;
  numeroProcesso: string;
  vara: {
    id: number;
    nome: string;
  };
  juiz: {
    id: number;
    nome: string;
  };
  tipoAudiencia: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAudiencias: 0,
    audienciasHoje: 0,
    totalVaras: 0,
    totalJuizes: 0,
    totalPromotores: 0,
    totalAdvogados: 0,
    totalPessoas: 0,
  });
  const [audienciasHoje, setAudienciasHoje] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard statistics
        const statsResponse = await api.get('/estatisticas/dashboard');
        setStats({
          totalAudiencias: statsResponse.data.totalAudiencias || 0,
          audienciasHoje: statsResponse.data.audienciasHoje || 0,
          totalVaras: statsResponse.data.totalVaras || 0,
          totalJuizes: statsResponse.data.totalJuizes || 0,
          totalPromotores: statsResponse.data.totalPromotores || 0,
          totalAdvogados: statsResponse.data.totalAdvogados || 0,
          totalPessoas: statsResponse.data.totalPessoas || 0,
        });

        // Fetch today's audiências
        const today = new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const audienciasResponse = await api.get(`/audiencias/data?data=${today}`);
        setAudienciasHoje(audienciasResponse.data || []);
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmada':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'agendada':
        return 'bg-blue-100 text-blue-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const StatCard: React.FC<{ title: string; value: number; link: string; color: string }> = ({
    title,
    value,
    link,
    color,
  }) => (
    <Link
      to={link}
      className={`block p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow ${color}`}
    >
      <div className="text-white">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-3xl font-bold">{loading ? '...' : value}</p>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Audiências"
          value={stats.totalAudiencias}
          link="/audiencias"
          color="bg-blue-600"
        />
        <StatCard
          title="Audiências Hoje"
          value={stats.audienciasHoje}
          link="/audiencias"
          color="bg-green-600"
        />
        <StatCard
          title="Varas Cadastradas"
          value={stats.totalVaras}
          link="/varas"
          color="bg-purple-600"
        />
        <StatCard
          title="Juízes"
          value={stats.totalJuizes}
          link="/juizes"
          color="bg-indigo-600"
        />
      </div>

      {/* Estatísticas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Promotores"
          value={stats.totalPromotores}
          link="/promotores"
          color="bg-orange-600"
        />
        <StatCard
          title="Advogados"
          value={stats.totalAdvogados}
          link="/advogados"
          color="bg-red-600"
        />
        <StatCard
          title="Pessoas Cadastradas"
          value={stats.totalPessoas}
          link="/pessoas"
          color="bg-teal-600"
        />
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/audiencias/nova"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📅</div>
              <span className="text-sm font-medium text-gray-700">Nova Audiência</span>
            </div>
          </Link>
          <Link
            to="/varas/nova"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🏛️</div>
              <span className="text-sm font-medium text-gray-700">Nova Vara</span>
            </div>
          </Link>
          <Link
            to="/juizes/novo"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">⚖️</div>
              <span className="text-sm font-medium text-gray-700">Novo Juiz</span>
            </div>
          </Link>
          <Link
            to="/pessoas/nova"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">👤</div>
              <span className="text-sm font-medium text-gray-700">Nova Pessoa</span>
            </div>
          </Link>
          <Link
            to="/promotores/novo"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">👨‍⚖️</div>
              <span className="text-sm font-medium text-gray-700">Novo Promotor</span>
            </div>
          </Link>
          <Link
            to="/advogados/novo"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">💼</div>
              <span className="text-sm font-medium text-gray-700">Novo Advogado</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Audiências Recentes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Audiências Hoje</h2>
          <Link
            to="/audiencias"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todas →
          </Link>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Carregando...</div>
          ) : audienciasHoje.length > 0 ? (
            audienciasHoje.slice(0, 3).map((audiencia) => (
              <div key={audiencia.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-lg text-blue-900 mb-1">
                    {audiencia.numeroProcesso}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    {audiencia.horarioInicio} - {audiencia.tipoAudiencia}
                  </div>
                  <div className="text-xs text-gray-500">
                    {audiencia.vara?.nome}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(audiencia.status)}`}>
                  {audiencia.status}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhuma audiência agendada para hoje.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;