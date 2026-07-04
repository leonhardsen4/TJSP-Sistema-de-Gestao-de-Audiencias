import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import CalendarioPautas from './CalendarioPautas';

/**
 * Listagem das pautas de audiências, com filtros por período, vara e
 * busca textual (vara, juiz, promotor ou observações). É a porta de
 * entrada do fluxo de trabalho: cada pauta agrupa as audiências de um
 * dia em uma vara.
 */

export interface Pauta {
  id: number;
  data: string;
  observacoes: string | null;
  totalAudiencias: number;
  vara: { id: number; nome: string; cor?: string | null };
  juiz: { id: number; nome: string };
  promotor: { id: number; nome: string };
}

interface Vara { id: number; nome: string; }

interface Filtros {
  dataInicio: string;
  dataFim: string;
  varaId: string;
  texto: string;
}

const FILTROS_VAZIOS: Filtros = { dataInicio: '', dataFim: '', varaId: '', texto: '' };

/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy. */
const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const PautasList: React.FC = () => {
  const navigate = useNavigate();
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [varas, setVaras] = useState<Vara[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // O calendário é a visão padrão: dá a noção imediata do mês de trabalho.
  const [visao, setVisao] = useState<'calendario' | 'tabela'>('calendario');

  useEffect(() => {
    api.get<Vara[]>('/varas')
      .then(res => setVaras(res.data))
      .catch(err => console.error('Erro ao carregar varas:', err));
  }, []);

  // Recarrega a lista quando os filtros mudam (a busca é no servidor).
  useEffect(() => {
    const buscar = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
        if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
        if (filtros.varaId) params.set('varaId', filtros.varaId);
        if (filtros.texto.trim()) params.set('q', filtros.texto.trim());

        const response = await api.get<Pauta[]>(`/pautas?${params.toString()}`);
        setPautas(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar pautas. Por favor, tente novamente.');
        console.error('Erro ao buscar pautas:', err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(buscar, filtros.texto ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filtros]);

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleDelete = async (pauta: Pauta) => {
    const aviso = pauta.totalAudiencias > 0
      ? `Tem certeza que deseja excluir a pauta de ${formatarDataBR(pauta.data)} da ${pauta.vara.nome}?\n\n`
        + `ATENÇÃO: as ${pauta.totalAudiencias} audiência(s) desta pauta também serão excluídas!`
      : `Tem certeza que deseja excluir a pauta de ${formatarDataBR(pauta.data)} da ${pauta.vara.nome}?`;
    if (!window.confirm(aviso)) {
      return;
    }
    try {
      await api.delete(`/pautas/${pauta.id}`);
      setPautas(atual => atual.filter(p => p.id !== pauta.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir pauta. Por favor, tente novamente.');
      console.error('Erro ao excluir pauta:', err);
    }
  };

  const filtrosAtivos = Object.values(filtros).some(v => v !== '');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pautas de Audiências</h1>
        <div className="flex gap-2">
          {/* Alternância entre calendário (padrão) e tabela */}
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setVisao('calendario')}
              className={`px-4 py-2 text-sm font-medium ${
                visao === 'calendario' ? 'bg-blue-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Calendário
            </button>
            <button
              onClick={() => setVisao('tabela')}
              className={`px-4 py-2 text-sm font-medium ${
                visao === 'tabela' ? 'bg-blue-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tabela
            </button>
          </div>
          <Link
            to="/pautas/nova"
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
          >
            Nova Pauta
          </Link>
        </div>
      </div>

      {visao === 'calendario' && <CalendarioPautas />}

      {/* Filtros (visão de tabela) */}
      <div className={`bg-white p-4 rounded-lg shadow-md mb-6 ${visao === 'calendario' ? 'hidden' : ''}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Vara</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.varaId}
              onChange={(e) => handleFiltroChange('varaId', e.target.value)}
            >
              <option value="">Todas</option>
              {varas.map(vara => (
                <option key={vara.id} value={vara.id}>{vara.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Busca</label>
            <input
              type="text"
              placeholder="Vara, juiz, promotor, observações..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.texto}
              onChange={(e) => handleFiltroChange('texto', e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {visao === 'tabela' && (loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <DataTable
          data={pautas}
          storageKey="pautas"
          columns={[
            {
              key: 'data',
              label: 'Data',
              sortable: true,
              width: 110,
              render: (value) => formatarDataBR(value)
            },
            { key: 'vara.nome', label: 'Vara', sortable: true },
            { key: 'juiz.nome', label: 'Juiz', sortable: true },
            { key: 'promotor.nome', label: 'Promotor', sortable: true },
            {
              key: 'totalAudiencias',
              label: 'Audiências',
              sortable: true,
              width: 110,
              render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  value > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {value}
                </span>
              )
            },
            { key: 'observacoes', label: 'Observações', sortable: false, render: (v) => v || '—' }
          ]}
          actions={[
            {
              label: 'Abrir',
              onClick: (pauta) => navigate(`/pautas/${pauta.id}`),
              className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            },
            {
              label: 'Editar',
              href: '/pautas/editar/:id',
              className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            },
            {
              label: 'Excluir',
              onClick: handleDelete,
              className: 'bg-red-100 text-red-700 hover:bg-red-200'
            }
          ]}
          emptyMessage="Nenhuma pauta cadastrada. Clique em 'Nova Pauta' para montar o dia de trabalho de uma vara."
        />
      ))}
    </div>
  );
};

export default PautasList;
