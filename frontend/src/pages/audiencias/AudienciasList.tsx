import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import CalendarioAudiencias from './CalendarioAudiencias';

/**
 * Tela de audiências: listagem em tabela ou calendário (mês/semana/dia),
 * com filtros por vara, data exata, período, tipo, status, competência e
 * busca textual. A pauta em PDF é gerada com os mesmos filtros aplicados.
 */

export interface Audiencia {
  id: number;
  pautaId?: number;
  dataAudiencia: string;
  horarioInicio: string;
  horarioFim: string;
  duracao: number;
  status: string;
  competencia: string;
  tipoAudiencia: string;
  vara: { id: number; nome: string } | null;
  juiz: { id: number; nome: string } | null;
  promotor: { id: number; nome: string } | null;
  numeroProcesso: string;
  reuPreso: boolean;
  agendamentoTeams: boolean;
  reconhecimento: boolean;
  depoimentoEspecial: boolean;
  observacoes: string | null;
}

interface Vara {
  id: number;
  nome: string;
}

/** Filtros aplicáveis à listagem (e repassados à pauta em PDF). */
interface Filtros {
  varaId: string;
  data: string;
  dataInicio: string;
  dataFim: string;
  tipoAudiencia: string;
  status: string;
  competencia: string;
  texto: string;
  /** Filtros por característica: '' (todos), 'sim' ou 'nao'. */
  reuPreso: string;
  depoimentoEspecial: string;
  agendamentoTeams: string;
}

const FILTROS_VAZIOS: Filtros = {
  varaId: '', data: '', dataInicio: '', dataFim: '',
  tipoAudiencia: '', status: '', competencia: '', texto: '',
  reuPreso: '', depoimentoEspecial: '', agendamentoTeams: ''
};

/** Rótulos legíveis dos enums exibidos na tela. */
export const rotuloStatus: Record<string, string> = {
  PENDENTE: 'Pendente',
  REALIZADA: 'Realizada',
  NAO_REALIZADA: 'Não Realizada'
};

export const rotuloCompetencia: Record<string, string> = {
  CRIMINAL: 'Criminal',
  VIOLENCIA_DOMESTICA: 'Violência Doméstica',
  INFANCIA_JUVENTUDE: 'Infância e Juventude'
};

export const rotuloTipo: Record<string, string> = {
  INSTRUCAO_DEBATES_JULGAMENTO: 'Instrução, Debates e Julgamento',
  APRESENTACAO: 'Apresentação',
  JUSTIFICACAO: 'Justificação',
  SUSPENSAO_CONDICIONAL_PROCESSO: 'Suspensão Condicional do Processo',
  ACORDO_NAO_PERSECUCAO_PENAL: 'Acordo de Não Persecução Penal',
  JURI: 'Júri',
  OUTROS: 'Outros'
};

/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy sem problemas de fuso. */
export const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'PENDENTE': return 'bg-blue-100 text-blue-800';
    case 'REALIZADA': return 'bg-green-100 text-green-800';
    case 'NAO_REALIZADA': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getCompetenciaBadgeClass = (competencia: string): string => {
  switch (competencia) {
    case 'CRIMINAL': return 'bg-red-100 text-red-800';
    case 'VIOLENCIA_DOMESTICA': return 'bg-purple-100 text-purple-800';
    case 'INFANCIA_JUVENTUDE': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const AudienciasList: React.FC = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [varas, setVaras] = useState<Vara[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [visao, setVisao] = useState<'tabela' | 'calendario'>('tabela');

  const carregarAudiencias = async () => {
    try {
      setLoading(true);
      const [audienciasRes, varasRes] = await Promise.all([
        api.get<Audiencia[]>('/audiencias'),
        api.get<Vara[]>('/varas')
      ]);
      setAudiencias(audienciasRes.data);
      setVaras(varasRes.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar audiências. Por favor, tente novamente.');
      console.error('Erro ao buscar audiências:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAudiencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleDelete = async (audiencia: Audiencia) => {
    if (!window.confirm(`Tem certeza que deseja excluir a audiência do processo "${audiencia.numeroProcesso}"?`)) {
      return;
    }
    try {
      await api.delete(`/audiencias/${audiencia.id}`);
      setAudiencias(atual => atual.filter(a => a.id !== audiencia.id));
    } catch (err) {
      setError('Erro ao excluir audiência. Por favor, tente novamente.');
      console.error('Erro ao excluir audiência:', err);
    }
  };

  /** Aplica todos os filtros no cliente (a base já está carregada). */
  const audienciasFiltradas = useMemo(() => {
    const termo = filtros.texto.trim().toLowerCase();
    return audiencias.filter(a => {
      if (filtros.varaId && String(a.vara?.id) !== filtros.varaId) return false;
      if (filtros.data && a.dataAudiencia !== filtros.data) return false;
      if (filtros.dataInicio && a.dataAudiencia < filtros.dataInicio) return false;
      if (filtros.dataFim && a.dataAudiencia > filtros.dataFim) return false;
      if (filtros.tipoAudiencia && a.tipoAudiencia !== filtros.tipoAudiencia) return false;
      if (filtros.status && a.status !== filtros.status) return false;
      if (filtros.competencia && a.competencia !== filtros.competencia) return false;
      // Filtros por característica (sim/não).
      if (filtros.reuPreso && a.reuPreso !== (filtros.reuPreso === 'sim')) return false;
      if (filtros.depoimentoEspecial && a.depoimentoEspecial !== (filtros.depoimentoEspecial === 'sim')) return false;
      if (filtros.agendamentoTeams && a.agendamentoTeams !== (filtros.agendamentoTeams === 'sim')) return false;
      if (termo) {
        const alvo = [
          a.numeroProcesso, a.observacoes, a.vara?.nome, a.juiz?.nome, a.promotor?.nome
        ].filter(Boolean).join(' ').toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [audiencias, filtros]);

  /** Monta os parâmetros de consulta a partir dos filtros aplicados. */
  const montarParamsFiltros = (): URLSearchParams => {
    const params = new URLSearchParams();
    // Data exata tem prioridade; senão, usa o período.
    if (filtros.data) {
      params.set('dataInicio', filtros.data);
      params.set('dataFim', filtros.data);
    } else {
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
    }
    if (filtros.varaId) params.set('varaId', filtros.varaId);
    if (filtros.competencia) params.set('competencia', filtros.competencia);
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.tipoAudiencia) params.set('tipoAudiencia', filtros.tipoAudiencia);
    if (filtros.texto.trim()) params.set('q', filtros.texto.trim());
    return params;
  };

  /** Gera o relatório detalhado em PDF com os filtros aplicados. */
  const handleImprimirPauta = async () => {
    try {
      const response = await api.get(`/pauta/pdf?${montarParamsFiltros().toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError('Erro ao gerar PDF da pauta. Por favor, tente novamente.');
      console.error('Erro ao gerar PDF:', err);
    }
  };

  /**
   * Exporta a lista filtrada: planilha CSV (baixa o arquivo, abre no
   * Excel/Planilhas Google) ou PDF em paisagem (abre em nova aba).
   */
  const handleExportar = async (formato: 'csv' | 'pdf') => {
    try {
      const response = await api.get(
        `/audiencias/exportar/${formato}?${montarParamsFiltros().toString()}`,
        { responseType: 'blob' }
      );
      if (formato === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'audiencias.csv';
        link.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      } else {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      setError('Erro ao exportar a lista de audiências. Por favor, tente novamente.');
      console.error('Erro ao exportar:', err);
    }
  };

  const filtrosAtivos = Object.values(filtros).some(v => v !== '');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audiências</h1>
        <div className="flex gap-2">
          {/* Alternância entre tabela e calendário */}
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setVisao('tabela')}
              className={`px-4 py-2 text-sm font-medium ${
                visao === 'tabela' ? 'bg-blue-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setVisao('calendario')}
              className={`px-4 py-2 text-sm font-medium ${
                visao === 'calendario' ? 'bg-blue-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Calendário
            </button>
          </div>
          <button
            onClick={handleImprimirPauta}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            title="Relatório detalhado em PDF (com participantes) das audiências filtradas"
          >
            Relatório PDF
          </button>
          <button
            onClick={() => handleExportar('csv')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-4 rounded"
            title="Baixa a planilha (CSV) das audiências filtradas — abre no Excel ou no Planilhas Google"
          >
            Exportar Planilha
          </button>
          <button
            onClick={() => handleExportar('pdf')}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded"
            title="PDF em paisagem com a lista das audiências filtradas"
          >
            Exportar PDF
          </button>
          {/* Audiências são criadas dentro de uma pauta (fluxo do fórum). */}
          <Link
            to="/pautas/nova"
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
            title="A audiência é cadastrada dentro de uma pauta"
          >
            Nova Pauta
          </Link>
        </div>
      </div>

      {/* Painel de filtros */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Filtros</h2>
          {filtrosAtivos && (
            <button
              onClick={() => setFiltros(FILTROS_VAZIOS)}
              className="text-sm text-blue-700 hover:text-blue-900 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vara</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.varaId}
              onChange={(e) => handleFiltroChange('varaId', e.target.value)}
            >
              <option value="">Todas as Varas</option>
              {varas.map(vara => (
                <option key={vara.id} value={vara.id}>{vara.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data exata</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.data}
              onChange={(e) => handleFiltroChange('data', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período — início</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.dataInicio}
              onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período — fim</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.dataFim}
              onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de audiência</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.tipoAudiencia}
              onChange={(e) => handleFiltroChange('tipoAudiencia', e.target.value)}
            >
              <option value="">Todos os Tipos</option>
              {Object.entries(rotuloTipo).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.status}
              onChange={(e) => handleFiltroChange('status', e.target.value)}
            >
              <option value="">Todos os Status</option>
              {Object.entries(rotuloStatus).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.competencia}
              onChange={(e) => handleFiltroChange('competencia', e.target.value)}
            >
              <option value="">Todas as Competências</option>
              {Object.entries(rotuloCompetencia).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Busca textual</label>
            <input
              type="text"
              placeholder="Processo, vara, juiz, promotor, observações..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.texto}
              onChange={(e) => handleFiltroChange('texto', e.target.value)}
            />
          </div>

          {/* Filtros por característica */}
          {([
            ['reuPreso', 'Réu Preso'],
            ['depoimentoEspecial', 'Depoimento Especial'],
            ['agendamentoTeams', 'Agendamento Teams']
          ] as [keyof Filtros, string][]).map(([campo, rotulo]) => (
            <div key={campo}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{rotulo}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filtros[campo]}
                onChange={(e) => handleFiltroChange(campo, e.target.value)}
              >
                <option value="">Todos</option>
                <option value="sim">Somente com {rotulo.toLowerCase()}</option>
                <option value="nao">Somente sem {rotulo.toLowerCase()}</option>
              </select>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {audienciasFiltradas.length} audiência(s) encontrada(s)
          {filtrosAtivos ? ' com os filtros aplicados' : ''}.
        </p>
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

      {!loading && !error && visao === 'calendario' && (
        <CalendarioAudiencias
          audiencias={audienciasFiltradas}
          todasAudiencias={audiencias}
          onExcluir={handleDelete}
        />
      )}

      {!loading && !error && visao === 'tabela' && (
        <DataTable
          data={audienciasFiltradas}
          storageKey="audiencias"
          columns={[
            {
              key: 'numeroProcesso',
              label: 'Processo',
              sortable: true,
              width: 220,
              render: (value, row) => (
                <span>
                  {value}
                  {row.reuPreso && (
                    <span className="ml-2 px-1.5 inline-flex text-xs leading-5 font-semibold rounded bg-red-600 text-white"
                          title="Réu preso">
                      RP
                    </span>
                  )}
                  {row.depoimentoEspecial && (
                    <span className="ml-1 px-1.5 inline-flex text-xs leading-5 font-semibold rounded bg-purple-600 text-white"
                          title="Depoimento especial">
                      DE
                    </span>
                  )}
                </span>
              )
            },
            {
              key: 'dataAudiencia',
              label: 'Data',
              sortable: true,
              width: 110,
              render: (value) => formatarDataBR(value)
            },
            { key: 'horarioInicio', label: 'Horário', sortable: true, width: 90 },
            { key: 'vara.nome', label: 'Vara', sortable: true },
            {
              key: 'tipoAudiencia',
              label: 'Tipo',
              sortable: true,
              render: (value) => rotuloTipo[value] || value
            },
            {
              key: 'competencia',
              label: 'Competência',
              sortable: true,
              width: 150,
              render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCompetenciaBadgeClass(value || '')}`}>
                  {rotuloCompetencia[value] || value || 'N/A'}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              width: 130,
              render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(value || '')}`}>
                  {rotuloStatus[value] || value || 'N/A'}
                </span>
              )
            },
            { key: 'juiz.nome', label: 'Juiz', sortable: true },
            { key: 'promotor.nome', label: 'Promotor', sortable: true }
          ]}
          actions={[
            {
              label: 'Pauta',
              onClick: (row: Audiencia) => {
                if (row.pautaId) {
                  window.location.href = `/pautas/${row.pautaId}`;
                }
              },
              className: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            },
            {
              label: 'Detalhes',
              href: '/audiencias/:id',
              className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            },
            {
              label: 'Editar',
              href: '/audiencias/editar/:id',
              className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            },
            {
              label: 'Excluir',
              onClick: handleDelete,
              className: 'bg-red-100 text-red-700 hover:bg-red-200'
            }
          ]}
          emptyMessage="Nenhuma audiência encontrada."
        />
      )}
    </div>
  );
};

export default AudienciasList;
