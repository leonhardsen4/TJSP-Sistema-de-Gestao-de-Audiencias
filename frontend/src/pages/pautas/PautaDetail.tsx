import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Pauta } from './PautasList';

/**
 * Tela de trabalho da pauta: cabeçalho (data, vara, juiz, promotor,
 * observações), linha do tempo do dia com as audiências e os blocos de
 * tempo livre entre elas (cálculo "cru", sem intervalo de segurança), e
 * as ações de incluir audiência, imprimir a pauta e editar/excluir.
 */

interface Audiencia {
  id: number;
  numeroProcesso: string;
  horarioInicio: string;
  horarioFim: string;
  duracao: number;
  tipoAudiencia: string;
  status: string;
  competencia: string;
  reuPreso: boolean;
  depoimentoEspecial: boolean;
  observacoes: string | null;
}

/** Item da linha do tempo: uma audiência ou um bloco livre. */
type ItemLinhaDoTempo =
  | { tipo: 'audiencia'; inicio: string; fim: string; audiencia: Audiencia }
  | { tipo: 'livre'; inicio: string; fim: string; minutos: number };

const rotuloTipo: Record<string, string> = {
  INSTRUCAO_DEBATES_JULGAMENTO: 'Instrução, Debates e Julgamento',
  APRESENTACAO: 'Apresentação',
  JUSTIFICACAO: 'Justificação',
  SUSPENSAO_CONDICIONAL_PROCESSO: 'Suspensão Condicional do Processo',
  ACORDO_NAO_PERSECUCAO_PENAL: 'Acordo de Não Persecução Penal',
  JURI: 'Júri',
  OUTROS: 'Outros'
};

const rotuloStatus: Record<string, string> = {
  PENDENTE: 'Pendente',
  REALIZADA: 'Realizada',
  NAO_REALIZADA: 'Não Realizada'
};

const badgeStatus = (status: string): string => {
  switch (status) {
    case 'PENDENTE': return 'bg-blue-100 text-blue-800';
    case 'REALIZADA': return 'bg-green-100 text-green-800';
    case 'NAO_REALIZADA': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/** Converte "HH:mm" em minutos desde a meia-noite. */
const minutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/** Converte minutos desde a meia-noite em "HH:mm". */
const horario = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy. */
const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

/**
 * Calcula os blocos de tempo livre de uma pauta dentro da janela dada:
 * o intervalo antes da primeira audiência, os intervalos entre elas e o
 * intervalo após a última — sem intervalo de segurança (bloco "cru").
 *
 * @param audiencias audiências da pauta (canceladas são ignoradas)
 * @param janelaInicio início da janela ("HH:mm")
 * @param janelaFim    fim da janela ("HH:mm")
 * @returns blocos livres ordenados
 */
export const calcularBlocosLivres = (
  audiencias: { horarioInicio: string; horarioFim: string; duracao: number; status: string }[],
  janelaInicio: string,
  janelaFim: string
): { inicio: string; fim: string; minutos: number }[] => {
  const inicioJanela = minutos(janelaInicio);
  const fimJanela = minutos(janelaFim);
  if (fimJanela <= inicioJanela) return [];

  // Períodos ocupados ordenados e mesclados (sobreposições viram um só).
  const ocupados = audiencias
    .filter(a => a.status !== 'NAO_REALIZADA')
    .map(a => [minutos(a.horarioInicio), a.horarioFim ? minutos(a.horarioFim) : minutos(a.horarioInicio) + a.duracao])
    .sort((x, y) => x[0] - y[0]);
  const mesclados: number[][] = [];
  for (const [ini, fim] of ocupados) {
    const ultimo = mesclados[mesclados.length - 1];
    if (ultimo && ini <= ultimo[1]) {
      ultimo[1] = Math.max(ultimo[1], fim);
    } else {
      mesclados.push([ini, fim]);
    }
  }

  const livres: { inicio: string; fim: string; minutos: number }[] = [];
  let cursor = inicioJanela;
  for (const [ini, fim] of mesclados) {
    if (ini > cursor) {
      const inicioLivre = cursor;
      const fimLivre = Math.min(ini, fimJanela);
      if (fimLivre > inicioLivre) {
        livres.push({ inicio: horario(inicioLivre), fim: horario(fimLivre), minutos: fimLivre - inicioLivre });
      }
    }
    cursor = Math.max(cursor, fim);
    if (cursor >= fimJanela) break;
  }
  if (cursor < fimJanela) {
    livres.push({ inicio: horario(cursor), fim: horario(fimJanela), minutos: fimJanela - cursor });
  }
  return livres;
};

const PautaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pauta, setPauta] = useState<Pauta | null>(null);
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [janelaInicio, setJanelaInicio] = useState<string>('13:00');
  const [janelaFim, setJanelaFim] = useState<string>('17:00');

  const carregar = async () => {
    try {
      setLoading(true);
      const [pautaRes, audienciasRes] = await Promise.all([
        api.get(`/pautas/${id}`),
        api.get<Audiencia[]>(`/pautas/${id}/audiencias`)
      ]);
      setPauta(pautaRes.data);
      setAudiencias(audienciasRes.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar a pauta. Por favor, tente novamente.');
      console.error('Erro ao buscar pauta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Linha do tempo: audiências e blocos livres em ordem cronológica. */
  const linhaDoTempo = useMemo((): ItemLinhaDoTempo[] => {
    const itens: ItemLinhaDoTempo[] = audiencias.map(a => ({
      tipo: 'audiencia' as const,
      inicio: a.horarioInicio,
      fim: a.horarioFim,
      audiencia: a
    }));
    calcularBlocosLivres(audiencias, janelaInicio, janelaFim).forEach(bloco => {
      itens.push({ tipo: 'livre', inicio: bloco.inicio, fim: bloco.fim, minutos: bloco.minutos });
    });
    return itens.sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [audiencias, janelaInicio, janelaFim]);

  const handleExcluirPauta = async () => {
    if (!pauta) return;
    const aviso = audiencias.length > 0
      ? `Excluir a pauta de ${formatarDataBR(pauta.data)} da ${pauta.vara.nome}?\n\n`
        + `ATENÇÃO: as ${audiencias.length} audiência(s) desta pauta também serão excluídas!`
      : `Excluir a pauta de ${formatarDataBR(pauta.data)} da ${pauta.vara.nome}?`;
    if (!window.confirm(aviso)) return;
    try {
      await api.delete(`/pautas/${id}`);
      navigate('/pautas');
    } catch (err) {
      setError('Erro ao excluir a pauta. Por favor, tente novamente.');
      console.error('Erro ao excluir pauta:', err);
    }
  };

  const handleExcluirAudiencia = async (audiencia: Audiencia) => {
    if (!window.confirm(`Excluir a audiência do processo "${audiencia.numeroProcesso}"?`)) return;
    try {
      await api.delete(`/audiencias/${audiencia.id}`);
      setAudiencias(atual => atual.filter(a => a.id !== audiencia.id));
    } catch (err) {
      setError('Erro ao excluir a audiência. Por favor, tente novamente.');
      console.error('Erro ao excluir audiência:', err);
    }
  };

  const handleImprimir = async () => {
    try {
      const response = await api.get(`/pautas/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError('Erro ao gerar o PDF da pauta. Por favor, tente novamente.');
      console.error('Erro ao gerar PDF:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!pauta) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded m-6">
        Pauta não encontrada.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho da pauta */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Pauta de {formatarDataBR(pauta.data)}
            </h1>
            <div className="text-gray-700 mt-2 space-y-1 text-sm">
              <p><strong>Vara:</strong> {pauta.vara.nome}</p>
              <p><strong>Juiz:</strong> {pauta.juiz.nome}</p>
              <p><strong>Promotor:</strong> {pauta.promotor.nome}</p>
              {pauta.observacoes && (
                <p><strong>Observações:</strong> {pauta.observacoes}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleImprimir}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Imprimir Pauta
            </button>
            <Link
              to={`/pautas/editar/${pauta.id}`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Editar
            </Link>
            <button
              onClick={handleExcluirPauta}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Excluir
            </button>
            <Link
              to="/pautas"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Linha do tempo do dia */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Audiências do dia ({audiencias.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600">Janela de trabalho:</label>
            <input
              type="time"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={janelaInicio}
              onChange={(e) => setJanelaInicio(e.target.value)}
              title="Início do expediente considerado no cálculo dos horários livres"
            />
            <span className="text-gray-500">às</span>
            <input
              type="time"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={janelaFim}
              onChange={(e) => setJanelaFim(e.target.value)}
              title="Fim do expediente considerado no cálculo dos horários livres"
            />
            <button
              onClick={() => navigate(`/pautas/${pauta.id}/audiencias/nova`)}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded ml-2"
            >
              Adicionar Audiência
            </button>
          </div>
        </div>

        {linhaDoTempo.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            Ajuste a janela de trabalho para ver os horários livres, ou adicione a primeira audiência.
          </p>
        ) : (
          <div className="space-y-2">
            {linhaDoTempo.map((item, i) =>
              item.tipo === 'livre' ? (
                <button
                  key={`livre-${i}`}
                  type="button"
                  onClick={() => navigate(`/pautas/${pauta.id}/audiencias/nova?hora=${item.inicio}`)}
                  className="w-full flex items-center justify-between border-2 border-dashed border-green-400 bg-green-50 hover:bg-green-100 rounded-lg px-4 py-3 text-left"
                  title="Clique para agendar uma audiência neste horário"
                >
                  <span className="text-green-800 font-semibold">
                    {item.inicio} – {item.fim} · LIVRE ({Math.floor(item.minutos / 60) > 0
                      ? `${Math.floor(item.minutos / 60)}h${item.minutos % 60 > 0 ? String(item.minutos % 60).padStart(2, '0') : ''}`
                      : `${item.minutos} min`})
                  </span>
                  <span className="text-green-700 text-sm font-medium">+ Agendar às {item.inicio}</span>
                </button>
              ) : (
                <div
                  key={`aud-${item.audiencia.id}`}
                  className="flex flex-wrap items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-blue-900 font-bold whitespace-nowrap">
                      {item.inicio} – {item.fim}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {item.audiencia.numeroProcesso}
                        {item.audiencia.reuPreso && (
                          <span className="ml-2 px-1.5 text-xs font-semibold rounded bg-red-600 text-white" title="Réu preso">
                            RP
                          </span>
                        )}
                        {item.audiencia.depoimentoEspecial && (
                          <span className="ml-1 px-1.5 text-xs font-semibold rounded bg-purple-600 text-white" title="Depoimento especial">
                            DE
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {rotuloTipo[item.audiencia.tipoAudiencia] || item.audiencia.tipoAudiencia}
                      </p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${badgeStatus(item.audiencia.status)}`}>
                      {rotuloStatus[item.audiencia.status] || item.audiencia.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/audiencias/${item.audiencia.id}`}
                      className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Detalhes
                    </Link>
                    <Link
                      to={`/audiencias/editar/${item.audiencia.id}`}
                      className="px-3 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleExcluirAudiencia(item.audiencia)}
                      className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PautaDetail;
