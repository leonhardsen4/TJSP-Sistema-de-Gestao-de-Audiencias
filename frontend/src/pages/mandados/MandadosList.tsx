import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import { toUpper } from '../../utils/masks';
import { rotuloTipoParticipacao } from '../../utils/participacao';

/**
 * Controle de Mandados de Intimação.
 *
 * Lista todos os participantes das audiências com a situação do mandado
 * de cada um, permitindo filtrar por vara, período, situação, intimação
 * e texto (nome ou processo). A situação, a intimação e a folha podem
 * ser atualizadas diretamente na tabela, sem abrir a audiência.
 */

interface Mandado {
  id: number;
  tipo: string;
  intimado: boolean;
  statusMandado: string;
  folhaIntimacao: string | null;
  pessoa: { id: number; nome: string; cpf: string };
  audiencia: {
    id: number;
    numeroProcesso: string;
    dataAudiencia: string;
    horarioInicio: string;
    status: string;
    vara: { id: number; nome: string };
  };
}

interface Vara { id: number; nome: string; }

interface Filtros {
  varaId: string;
  dataInicio: string;
  dataFim: string;
  statusMandado: string;
  intimado: string;
  texto: string;
}

const FILTROS_VAZIOS: Filtros = {
  varaId: '', dataInicio: '', dataFim: '', statusMandado: '', intimado: '', texto: ''
};

/** Rótulos e cores das situações do mandado. */
const STATUS_MANDADO: Record<string, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: 'Pendente de cumprimento', classe: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  POSITIVO: { rotulo: 'Cumprido - positivo', classe: 'bg-green-100 text-green-800 border-green-300' },
  NEGATIVO: { rotulo: 'Cumprido - negativo', classe: 'bg-red-100 text-red-800 border-red-300' },
  DISPENSADO: { rotulo: 'Dispensado', classe: 'bg-gray-100 text-gray-700 border-gray-300' }
};


/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy. */
const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const MandadosList: React.FC = () => {
  const [mandados, setMandados] = useState<Mandado[]>([]);
  const [varas, setVaras] = useState<Vara[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  useEffect(() => {
    api.get<Vara[]>('/varas')
      .then(res => setVaras(res.data))
      .catch(err => console.error('Erro ao carregar varas:', err));
  }, []);

  // Recarrega a lista sempre que os filtros mudam (a busca é no servidor).
  useEffect(() => {
    const buscar = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filtros.varaId) params.set('varaId', filtros.varaId);
        if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
        if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
        if (filtros.statusMandado) params.set('statusMandado', filtros.statusMandado);
        if (filtros.intimado) params.set('intimado', filtros.intimado);
        if (filtros.texto.trim()) params.set('q', filtros.texto.trim());

        const response = await api.get<Mandado[]>(`/mandados?${params.toString()}`);
        setMandados(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar mandados. Por favor, tente novamente.');
        console.error('Erro ao buscar mandados:', err);
      } finally {
        setLoading(false);
      }
    };
    // Pequeno atraso para não disparar uma busca a cada tecla digitada.
    const timer = setTimeout(buscar, filtros.texto ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filtros]);

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  /** Atualiza um campo do mandado no servidor e reflete na tabela. */
  const atualizarMandado = async (mandado: Mandado, dados: Partial<{
    statusMandado: string; intimado: boolean; folhaIntimacao: string;
  }>) => {
    try {
      setSalvandoId(mandado.id);
      const response = await api.put(`/mandados/${mandado.id}`, dados);
      setMandados(atual => atual.map(m => (m.id === mandado.id ? response.data : m)));
      setError(null);
    } catch (err) {
      setError('Erro ao atualizar o mandado. Por favor, tente novamente.');
      console.error('Erro ao atualizar mandado:', err);
    } finally {
      setSalvandoId(null);
    }
  };

  const filtrosAtivos = Object.values(filtros).some(v => v !== '');
  const pendentes = mandados.filter(m => m.statusMandado === 'PENDENTE').length;
  const negativos = mandados.filter(m => m.statusMandado === 'NEGATIVO').length;
  const naoIntimados = mandados.filter(m => !m.intimado).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Controle de Mandados</h1>
      </div>

      {/* Resumo do resultado atual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800 font-medium">Pendentes de cumprimento</p>
          <p className="text-2xl font-bold text-yellow-900">{loading ? '...' : pendentes}</p>
        </div>
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">Retornaram negativos</p>
          <p className="text-2xl font-bold text-red-900">{loading ? '...' : negativos}</p>
        </div>
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
          <p className="text-sm text-orange-800 font-medium">Partes não intimadas</p>
          <p className="text-2xl font-bold text-orange-900">{loading ? '...' : naoIntimados}</p>
        </div>
      </div>

      {/* Filtros */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Audiência — de</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.dataInicio}
              onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audiência — até</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.dataFim}
              onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situação do mandado</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.statusMandado}
              onChange={(e) => handleFiltroChange('statusMandado', e.target.value)}
            >
              <option value="">Todas</option>
              {Object.entries(STATUS_MANDADO).map(([valor, { rotulo }]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intimado</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.intimado}
              onChange={(e) => handleFiltroChange('intimado', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Busca</label>
            <input
              type="text"
              placeholder="Nome ou processo..."
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <DataTable
          data={mandados}
          storageKey="mandados"
          itemsPerPage={15}
          columns={[
            { key: 'pessoa.nome', label: 'Pessoa', sortable: true },
            {
              key: 'tipo',
              label: 'Papel',
              sortable: true,
              width: 140,
              render: (value) => rotuloTipoParticipacao(value)
            },
            { key: 'audiencia.numeroProcesso', label: 'Processo', sortable: true, width: 210 },
            {
              key: 'audiencia.dataAudiencia',
              label: 'Audiência',
              sortable: true,
              width: 130,
              render: (value, row) => `${formatarDataBR(value)} ${row.audiencia.horarioInicio}`
            },
            { key: 'audiencia.vara.nome', label: 'Vara', sortable: true },
            {
              key: 'statusMandado',
              label: 'Situação do mandado',
              sortable: true,
              width: 200,
              render: (value, row) => (
                <select
                  className={`w-full border rounded px-2 py-1 text-xs font-semibold ${STATUS_MANDADO[value]?.classe || ''}`}
                  value={value}
                  disabled={salvandoId === row.id}
                  onChange={(e) => atualizarMandado(row, { statusMandado: e.target.value })}
                >
                  {Object.entries(STATUS_MANDADO).map(([valor, { rotulo }]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </select>
              )
            },
            {
              key: 'intimado',
              label: 'Intimado',
              sortable: true,
              width: 90,
              sortValue: (row) => (row.intimado ? 1 : 0),
              render: (value, row) => (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 mr-1"
                    checked={value}
                    disabled={salvandoId === row.id}
                    onChange={(e) => atualizarMandado(row, { intimado: e.target.checked })}
                  />
                  <span className={value ? 'text-green-700 text-xs font-semibold' : 'text-red-600 text-xs font-semibold'}>
                    {value ? 'Sim' : 'Não'}
                  </span>
                </label>
              )
            },
            {
              key: 'folhaIntimacao',
              label: 'Fls.',
              sortable: true,
              width: 110,
              render: (value, row) => (
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  defaultValue={value || ''}
                  maxLength={30}
                  placeholder="fls."
                  disabled={salvandoId === row.id}
                  onBlur={(e) => {
                    const novo = toUpper(e.target.value.trim());
                    if (novo !== (value || '')) {
                      atualizarMandado(row, { folhaIntimacao: novo });
                    }
                  }}
                />
              )
            },
            {
              key: 'audiencia.id',
              label: 'Ações',
              sortable: false,
              width: 110,
              render: (value) => (
                <Link
                  to={`/audiencias/${value}`}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  Audiência
                </Link>
              )
            }
          ]}
          emptyMessage="Nenhum mandado encontrado para os filtros informados."
        />
      )}
    </div>
  );
};

export default MandadosList;
