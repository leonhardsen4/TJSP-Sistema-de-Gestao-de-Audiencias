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

/** Pendências apuradas pelo backend para as audiências futuras. */
interface Pendencias {
  audienciasSemParte: {
    id: number; numeroProcesso: string; dataAudiencia: string;
    horarioInicio: string; varaNome: string;
  }[];
  partesNaoIntimadas: {
    id: number; pessoaNome: string; tipo: string; numeroProcesso: string;
    dataAudiencia: string; horarioInicio: string; varaNome: string; audienciaId: number;
  }[];
  mandadosComProblema: {
    id: number; pessoaNome: string; statusMandado: string; numeroProcesso: string;
    dataAudiencia: string; horarioInicio: string; varaNome: string; audienciaId: number;
  }[];
  audienciasVencidas: {
    id: number; numeroProcesso: string; dataAudiencia: string;
    horarioInicio: string; varaNome: string;
  }[];
  totais: {
    audienciasSemParte: number;
    partesNaoIntimadas: number;
    mandadosComProblema: number;
    audienciasVencidas: number;
    total: number;
  };
}

/** Pauta resumida exibida na seção "Pautas de Hoje". */
interface PautaHoje {
  id: number;
  data: string;
  totalAudiencias: number;
  vara: { id: number; nome: string; cor?: string | null };
  juiz: { id: number; nome: string };
  promotor: { id: number; nome: string };
}

/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy. */
const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

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
  const [pendencias, setPendencias] = useState<Pendencias | null>(null);
  const [pautasHoje, setPautasHoje] = useState<PautaHoje[]>([]);
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

        // Fetch pendências (alertas) das audiências futuras
        const pendenciasResponse = await api.get('/pendencias');
        setPendencias(pendenciasResponse.data);

        // Fetch pautas de hoje (atalho para o trabalho do dia)
        const hoje = new Date();
        const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const pautasResponse = await api.get(`/pautas?dataInicio=${hojeIso}&dataFim=${hojeIso}`);
        setPautasHoje(pautasResponse.data || []);

        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-blue-100 text-blue-800';
      case 'REALIZADA':
        return 'bg-green-100 text-green-800';
      case 'NAO_REALIZADA':
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

      {/* Painel de Pendências */}
      {pendencias && pendencias.totais.total > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              ⚠️ Pendências ({pendencias.totais.total})
            </h2>
            <Link to="/mandados" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Abrir controle de mandados →
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Audiências vencidas com status desatualizado */}
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <h3 className="text-sm font-bold text-purple-800 mb-2">
                Status desatualizado ({pendencias.totais.audienciasVencidas})
              </h3>
              <p className="text-xs text-purple-700 mb-2">
                Audiências já passadas ainda como Pendente: marque Realizada ou Não Realizada.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pendencias.audienciasVencidas.slice(0, 8).map(a => (
                  <Link key={a.id} to={`/audiencias/editar/${a.id}`}
                        className="block text-xs text-purple-900 hover:underline">
                    {formatarDataBR(a.dataAudiencia)} {a.horarioInicio} — {a.numeroProcesso}
                  </Link>
                ))}
                {pendencias.audienciasVencidas.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhuma.</p>
                )}
              </div>
            </div>

            {/* Audiências sem parte principal */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="text-sm font-bold text-red-800 mb-2">
                Audiências sem parte principal ({pendencias.totais.audienciasSemParte})
              </h3>
              <p className="text-xs text-red-700 mb-2">
                Sem réu, indiciado, averiguado ou autor do fato cadastrado.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pendencias.audienciasSemParte.slice(0, 8).map(a => (
                  <Link key={a.id} to={`/audiencias/editar/${a.id}`}
                        className="block text-xs text-red-900 hover:underline">
                    {formatarDataBR(a.dataAudiencia)} {a.horarioInicio} — {a.numeroProcesso}
                  </Link>
                ))}
                {pendencias.audienciasSemParte.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhuma.</p>
                )}
              </div>
            </div>

            {/* Partes não intimadas */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <h3 className="text-sm font-bold text-orange-800 mb-2">
                Partes não intimadas ({pendencias.totais.partesNaoIntimadas})
              </h3>
              <p className="text-xs text-orange-700 mb-2">
                Participantes ainda não marcados como intimados.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pendencias.partesNaoIntimadas.slice(0, 8).map(p => (
                  <Link key={p.id} to={`/audiencias/editar/${p.audienciaId}`}
                        className="block text-xs text-orange-900 hover:underline">
                    {p.pessoaNome} — {formatarDataBR(p.dataAudiencia)} — {p.numeroProcesso}
                  </Link>
                ))}
                {pendencias.partesNaoIntimadas.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhuma.</p>
                )}
              </div>
            </div>

            {/* Mandados com problema */}
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h3 className="text-sm font-bold text-yellow-800 mb-2">
                Mandados pendentes/negativos ({pendencias.totais.mandadosComProblema})
              </h3>
              <p className="text-xs text-yellow-700 mb-2">
                Mandados aguardando cumprimento ou devolvidos negativos.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pendencias.mandadosComProblema.slice(0, 8).map(m => (
                  <Link key={m.id} to="/mandados"
                        className="block text-xs text-yellow-900 hover:underline">
                    {m.pessoaNome} ({m.statusMandado === 'NEGATIVO' ? 'negativo' : 'pendente'}) — {formatarDataBR(m.dataAudiencia)}
                  </Link>
                ))}
                {pendencias.mandadosComProblema.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhum.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendencias && pendencias.totais.total === 0 && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-green-800 text-sm">
          ✓ Nenhuma pendência: audiências futuras com parte principal e intimações em dia,
          e nenhuma audiência passada aguardando atualização de status.
        </div>
      )}

      {/* Pautas de Hoje */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Pautas de Hoje</h2>
          <Link to="/pautas" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver calendário de pautas →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Carregando...</div>
        ) : pautasHoje.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pautasHoje.map(pauta => (
              <Link
                key={pauta.id}
                to={`/pautas/${pauta.id}`}
                className="block rounded-lg p-4 text-white hover:opacity-90 shadow"
                style={{ backgroundColor: pauta.vara.cor || '#4F46E5' }}
              >
                <p className="font-bold">{pauta.vara.nome}</p>
                <p className="text-sm opacity-90">Juiz: {pauta.juiz.nome}</p>
                <p className="text-sm opacity-90">Promotor: {pauta.promotor.nome}</p>
                <p className="text-sm font-semibold mt-1">{pauta.totalAudiencias} audiência(s)</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-gray-500">
            Nenhuma pauta cadastrada para hoje.
          </p>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/pautas/nova"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📅</div>
              <span className="text-sm font-medium text-gray-700">Nova Pauta</span>
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