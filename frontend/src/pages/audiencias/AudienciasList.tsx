import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PaginatedTable from '../../components/PaginatedTable';

interface Audiencia {
  id: number;
  dataAudiencia: string;
  horarioInicio: string;
  status: string;
  competencia: string;
  vara: {
    id: number;
    nome: string;
  };
  juiz: {
    id: number;
    nome: string;
  };
  promotor: {
    id: number;
    nome: string;
  };
  numeroProcesso: string;
  reuPreso: boolean;
  agendamentoTeams: boolean;
  reconhecimento: boolean;
  depoimentoEspecial: boolean;
}

const AudienciasList: React.FC = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroProcesso, setFiltroProcesso] = useState<string>('');
  const [filtroData, setFiltroData] = useState<string>('');
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  useEffect(() => {
    const fetchAudiencias = async () => {
      try {
        setLoading(true);
        let url = '/audiencias/por-competencia';
        if (filtroCompetencia) {
          url += `?competencia=${encodeURIComponent(filtroCompetencia)}`;
        }
        const response = await api.get<Audiencia[]>(url);
        setAudiencias(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar audiências. Por favor, tente novamente.');
        console.error('Erro ao buscar audiências:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAudiencias();
  }, [filtroCompetencia]);

  const handleDelete = async (id: number, processo: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a audiência do processo "${processo}"?`)) {
      return;
    }

    try {
      await api.delete(`/audiencias/${id}`);
      setAudiencias(audiencias.filter(audiencia => audiencia.id !== id));
    } catch (err) {
      setError('Erro ao excluir audiência. Por favor, tente novamente.');
      console.error('Erro ao excluir audiência:', err);
    }
  };

  const handleImprimirPauta = async () => {
    if (!filtroData) {
      alert('Por favor, selecione uma data para imprimir a pauta.');
      return;
    }

    try {
      const response = await api.get(`/pauta/pdf?data=${filtroData}`, {
        responseType: 'blob'
      });

      // Criar URL do blob e abrir em nova aba
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Limpar URL após um tempo para liberar memória
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      setError('Erro ao gerar PDF da pauta. Por favor, tente novamente.');
      console.error('Erro ao gerar PDF:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DESIGNADA':
        return 'bg-blue-100 text-blue-800';
      case 'REALIZADA':
        return 'bg-green-100 text-green-800';
      case 'PARCIALMENTE_REALIZADA':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      case 'REDESIGNADA':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompetenciaBadgeClass = (competencia: string) => {
    switch (competencia) {
      case 'CRIMINAL':
        return 'bg-red-100 text-red-800';
      case 'VIOLENCIA_DOMESTICA':
        return 'bg-purple-100 text-purple-800';
      case 'INFANCIA_JUVENTUDE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCompetenciaDisplay = (competencia: string) => {
    switch (competencia) {
      case 'VIOLENCIA_DOMESTICA':
        return 'Violência Doméstica';
      case 'INFANCIA_JUVENTUDE':
        return 'Infância e Juventude';
      case 'CRIMINAL':
        return 'Criminal';
      default:
        return competencia;
    }
  };

  const audienciasFiltradas = audiencias.filter(audiencia => {
    const termoBusca = filtroProcesso.toLowerCase();
    
    const correspondeProcesso = filtroProcesso ? 
      (audiencia.numeroProcesso || '').toLowerCase().includes(termoBusca) : true;
    
    const correspondeData = filtroData ? 
      audiencia.dataAudiencia === filtroData : true;
    
    const correspondeCompetencia = filtroCompetencia ? 
      audiencia.competencia === filtroCompetencia : true;
    
    const correspondeStatus = filtroStatus ? 
      audiencia.status === filtroStatus : true;
    
    return correspondeProcesso && correspondeData && correspondeCompetencia && correspondeStatus;
  });





  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audiências</h1>
        <div className="flex gap-2">
          <button
            onClick={handleImprimirPauta}
            disabled={!filtroData}
            className={`font-bold py-2 px-4 rounded ${
              filtroData
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Imprimir Pauta
          </button>
          <Link 
            to="/audiencias/nova" 
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
          >
            Nova Audiência
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Audiência
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="DESIGNADA">Designada</option>
              <option value="REALIZADA">Realizada</option>
              <option value="PARCIALMENTE_REALIZADA">Parcialmente Realizada</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="REDESIGNADA">Redesignada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Competência
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroCompetencia}
              onChange={(e) => setFiltroCompetencia(e.target.value)}
            >
              <option value="">Todas as Competências</option>
              <option value="CRIMINAL">Criminal</option>
              <option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option>
              <option value="INFANCIA_JUVENTUDE">Infância e Juventude</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Processo
            </label>
            <input
              type="text"
              placeholder="Digite o número do processo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroProcesso}
              onChange={(e) => setFiltroProcesso(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!loading && !error && (
        <PaginatedTable
          data={audienciasFiltradas}
          columns={[
            { 
              key: 'numeroProcesso', 
              label: 'Processo', 
              sortable: true 
            },
            { 
              key: 'dataAudiencia', 
              label: 'Data', 
              sortable: true,
              render: (value) => {
                // Evita problemas de timezone ao tratar a data como local
                const [year, month, day] = value.split('-');
                return format(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), 'dd/MM/yyyy', { locale: ptBR });
              }
            },
            { 
              key: 'horarioInicio', 
              label: 'Horário', 
              sortable: true 
            },
            { 
              key: 'competencia', 
              label: 'Competência', 
              sortable: true,
              render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCompetenciaBadgeClass(value || '')}`}>
                  {formatCompetenciaDisplay(value || 'N/A')}
                </span>
              )
            },
            { 
              key: 'status', 
              label: 'Status', 
              sortable: true,
              render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(value || '')}`}>
                  {value || 'N/A'}
                </span>
              )
            }
          ]}
          actions={[
            {
              label: 'Detalhes',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
              className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
              onClick: (item) => window.location.href = `/audiencias/${item.id}`
            },
            {
              label: 'Editar',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ),
              className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
              onClick: (item) => window.location.href = `/audiencias/editar/${item.id}`
            },
            {
              label: 'Excluir',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ),
              className: 'bg-red-100 text-red-700 hover:bg-red-200',
              onClick: (item) => handleDelete(item.id, item.numeroProcesso)
            }
          ]}
          emptyMessage="Nenhuma audiência encontrada."
        />
      )}
    </div>
  );
};

export default AudienciasList;
