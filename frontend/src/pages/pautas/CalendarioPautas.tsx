import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import {
  Audiencia, formatarDataBR, getStatusBadgeClass, rotuloStatus, rotuloTipo
} from '../audiencias/AudienciasList';
import { Pauta } from './PautasList';
import { calcularBlocosLivres } from './PautaDetail';

/**
 * Calendário da tela de Pautas, com visualizações de mês, semana e dia.
 *
 * Regras de uso (definidas com o usuário):
 * - MÊS: visão geral de todas as varas. Cada dia mostra apenas os cartões
 *   das pautas (cor da vara + quantidade de audiências) e um sinal verde
 *   quando há horário livre — sem detalhar quais nem quantos blocos.
 * - SEMANA e DIA: exigem uma vara selecionada, pois a grade horária não
 *   comporta várias varas sobrepostas. Mostram as audiências da vara e os
 *   blocos verdes de tempo livre da(s) pauta(s) daquele dia.
 *
 * O horário livre é uma propriedade da pauta: os blocos são calculados de
 * forma "crua" (sem intervalo de segurança), dentro da janela de horário
 * escolhida, e existem somente em dias com pauta cadastrada.
 *
 * Interações:
 * - Clicar em um dia abre o painel com as pautas do dia (ou a criação);
 * - Clicar em uma pauta abre a tela da pauta;
 * - Clicar em um bloco livre abre o cadastro de audiência na pauta, com a
 *   hora pré-preenchida;
 * - Clicar em uma audiência abre o painel com ver/editar/excluir.
 */

interface Vara {
  id: number;
  nome: string;
  cor?: string | null;
}

type Modo = 'mes' | 'semana' | 'dia';

/** Primeira e última hora exibidas na grade de semana/dia. */
const HORA_INICIO = 8;
const HORA_FIM = 19;
/** Altura em pixels de um minuto na grade. */
const PX_POR_MINUTO = 0.8;
/** Cor padrão dos cartões quando a vara não tem cor cadastrada. */
const COR_PADRAO = '#4F46E5';

/** Converte "HH:mm" em minutos desde a meia-noite. */
const minutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/** Converte um Date para a chave ISO do dia (yyyy-MM-dd). */
const chaveDia = (data: Date): string => format(data, 'yyyy-MM-dd');

/**
 * Escolhe preto ou branco para o texto conforme a luminosidade do fundo,
 * mantendo o cartão legível com qualquer cor escolhida na vara.
 */
const corDoTexto = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const luminosidade = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luminosidade > 150 ? '#1F2937' : '#FFFFFF';
};

const CalendarioPautas: React.FC = () => {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>('mes');
  const [referencia, setReferencia] = useState<Date>(new Date());
  const [varaId, setVaraId] = useState<string>('');
  const [selecionada, setSelecionada] = useState<Audiencia | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [varas, setVaras] = useState<Vara[]>([]);
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarLivres, setMostrarLivres] = useState<boolean>(true);
  const [janelaInicio, setJanelaInicio] = useState<string>('13:00');
  const [janelaFim, setJanelaFim] = useState<string>('17:00');

  /** Intervalo de dias visível conforme o modo. */
  const intervalo = useMemo(() => {
    if (modo === 'mes') {
      return {
        inicio: startOfWeek(startOfMonth(referencia), { weekStartsOn: 0 }),
        fim: endOfWeek(endOfMonth(referencia), { weekStartsOn: 0 })
      };
    }
    if (modo === 'semana') {
      const inicioSemana = startOfWeek(referencia, { weekStartsOn: 0 });
      // Grade útil de segunda a sexta.
      return { inicio: addDays(inicioSemana, 1), fim: addDays(inicioSemana, 5) };
    }
    return { inicio: referencia, fim: referencia };
  }, [modo, referencia]);

  // Carrega as varas uma vez (alimenta o seletor).
  useEffect(() => {
    api.get<Vara[]>('/varas')
      .then(res => setVaras(res.data))
      .catch(err => console.error('Erro ao carregar varas:', err));
  }, []);

  // Busca pautas e audiências do período visível (todas as varas — o filtro
  // por vara é aplicado no cliente conforme a visualização).
  const carregar = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        dataInicio: chaveDia(intervalo.inicio),
        dataFim: chaveDia(intervalo.fim)
      });
      const [pautasRes, audienciasRes] = await Promise.all([
        api.get<Pauta[]>(`/pautas?${params}`),
        api.get<Audiencia[]>(`/audiencias?${params}`)
      ]);
      setPautas(pautasRes.data);
      setAudiencias(audienciasRes.data);
      setErro(null);
    } catch (err) {
      setErro('Erro ao carregar o calendário. Por favor, tente novamente.');
      console.error('Erro ao carregar o calendário:', err);
    }
  }, [intervalo.inicio, intervalo.fim]);

  useEffect(() => { carregar(); }, [carregar]);

  /** Exclui a audiência selecionada e recarrega o calendário. */
  const excluirAudiencia = async (audiencia: Audiencia) => {
    if (!window.confirm(`Tem certeza que deseja excluir a audiência do processo "${audiencia.numeroProcesso}"?`)) {
      return;
    }
    try {
      await api.delete(`/audiencias/${audiencia.id}`);
      setSelecionada(null);
      await carregar();
    } catch (err) {
      setErro('Erro ao excluir audiência. Por favor, tente novamente.');
      console.error('Erro ao excluir audiência:', err);
    }
  };

  /**
   * Nas visões de semana/dia trabalhamos só com a vara escolhida; no mês,
   * exibimos todas. Estes recortes já respeitam essa regra.
   */
  const pautasVisiveis = useMemo(() => (
    modo === 'mes' || !varaId
      ? pautas
      : pautas.filter(p => String(p.vara.id) === varaId)
  ), [pautas, modo, varaId]);

  const audienciasVisiveis = useMemo(() => (
    modo === 'mes' || !varaId
      ? audiencias
      : audiencias.filter(a => String(a.vara?.id) === varaId)
  ), [audiencias, modo, varaId]);

  /** Audiências (da vara escolhida) agrupadas por dia. */
  const porDia = useMemo(() => {
    const mapa: Record<string, Audiencia[]> = {};
    audienciasVisiveis.forEach(a => {
      (mapa[a.dataAudiencia] = mapa[a.dataAudiencia] || []).push(a);
    });
    Object.values(mapa).forEach(lista =>
      lista.sort((x, y) => x.horarioInicio.localeCompare(y.horarioInicio)));
    return mapa;
  }, [audienciasVisiveis]);

  /** Pautas agrupadas por dia. */
  const pautasPorDia = useMemo(() => {
    const mapa: Record<string, Pauta[]> = {};
    pautasVisiveis.forEach(p => {
      (mapa[p.data] = mapa[p.data] || []).push(p);
    });
    return mapa;
  }, [pautasVisiveis]);

  /**
   * Blocos livres por pauta (chave: id da pauta), calculados sobre TODAS
   * as audiências da pauta.
   */
  const livresPorPauta = useMemo(() => {
    const mapa: Record<number, { inicio: string; fim: string; minutos: number }[]> = {};
    if (!mostrarLivres) return mapa;
    pautas.forEach(pauta => {
      const daPauta = audiencias.filter(a => a.pautaId === pauta.id);
      mapa[pauta.id] = calcularBlocosLivres(daPauta, janelaInicio, janelaFim);
    });
    return mapa;
  }, [pautas, audiencias, mostrarLivres, janelaInicio, janelaFim]);

  const navegar = (direcao: -1 | 1) => {
    if (modo === 'mes') setReferencia(addMonths(referencia, direcao));
    else if (modo === 'semana') setReferencia(addWeeks(referencia, direcao));
    else setReferencia(addDays(referencia, direcao));
  };

  const tituloPeriodo = (): string => {
    if (modo === 'mes') {
      const titulo = format(referencia, 'MMMM yyyy', { locale: ptBR });
      return titulo.charAt(0).toUpperCase() + titulo.slice(1);
    }
    if (modo === 'semana') {
      return `${format(intervalo.inicio, 'dd/MM')} a ${format(intervalo.fim, 'dd/MM/yyyy')}`;
    }
    const titulo = format(referencia, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    return titulo.charAt(0).toUpperCase() + titulo.slice(1);
  };

  /** Visão do mês: cartões de pauta de todas as varas + sinal de livre. */
  const renderMes = () => {
    const semanas: Date[][] = [];
    let dia = intervalo.inicio;
    while (dia <= intervalo.fim) {
      const semana: Date[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push(dia);
        dia = addDays(dia, 1);
      }
      semanas.push(semana);
    }
    const hoje = new Date();

    return (
      <div>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 uppercase border-b pb-1 mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
        </div>
        {semanas.map((semana, i) => (
          <div key={i} className="grid grid-cols-7">
            {semana.map(diaCelula => {
              const chave = chaveDia(diaCelula);
              const pautasDoDia = pautasPorDia[chave] || [];
              const foraDoMes = !isSameMonth(diaCelula, referencia);
              const temLivre = mostrarLivres
                && pautasDoDia.some(p => (livresPorPauta[p.id]?.length || 0) > 0);
              return (
                <div
                  key={chave}
                  onClick={() => setDiaSelecionado(chave)}
                  className={`min-h-[110px] border border-gray-100 p-1 cursor-pointer hover:bg-blue-50 ${
                    foraDoMes ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  }`}
                  title="Clique para ver as pautas do dia"
                >
                  <div className="flex items-center justify-between mb-1">
                    {/* Sinal verde: há horário livre em alguma pauta do dia. */}
                    {temLivre ? (
                      <span className="w-2 h-2 rounded-full bg-green-500"
                            title="Há horário livre neste dia" />
                    ) : <span />}
                    <span className={`text-xs ${
                      isSameDay(diaCelula, hoje)
                        ? 'font-bold text-white bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center'
                        : 'text-gray-600'
                    }`}>
                      {format(diaCelula, 'd')}
                    </span>
                  </div>

                  {/* Cartões de pauta do dia (cor da vara + quantidade) */}
                  {pautasDoDia.map(pauta => {
                    const cor = pauta.vara.cor || COR_PADRAO;
                    return (
                      <button
                        key={`pauta-${pauta.id}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/pautas/${pauta.id}`); }}
                        className="w-full text-left px-1.5 py-1 mb-1 rounded text-xs font-semibold truncate hover:opacity-80 shadow-sm"
                        style={{ backgroundColor: cor, color: corDoTexto(cor) }}
                        title={`${pauta.vara.nome} — ${pauta.totalAudiencias} audiência(s). `
                          + `Juiz: ${pauta.juiz.nome}. Clique para abrir a pauta.`}
                      >
                        {pauta.vara.nome} · {pauta.totalAudiencias} aud.
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  /** Coluna de um dia nas visões de semana e dia. */
  const colunaDia = (diaColuna: Date) => {
    const chave = chaveDia(diaColuna);
    const doDia = porDia[chave] || [];
    const pautasDoDia = pautasPorDia[chave] || [];
    const alturaTotal = (HORA_FIM - HORA_INICIO) * 60 * PX_POR_MINUTO;
    const varias = pautasDoDia.length > 1;

    return (
      <div key={chave} className="flex-1 border-l border-gray-200 relative"
           style={{ height: alturaTotal }} onClick={() => setDiaSelecionado(chave)}
           title={pautasDoDia.length === 0 ? 'Sem pauta cadastrada — clique para criar' : 'Clique para ver as pautas do dia'}>
        {/* Linhas de hora */}
        {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
          <div key={i} className="absolute w-full border-t border-gray-100"
               style={{ top: i * 60 * PX_POR_MINUTO }} />
        ))}

        {/* Dia sem pauta: aviso e criação */}
        {pautasDoDia.length === 0 && (
          <div className="absolute inset-x-1 top-2 text-center">
            <p className="text-xs text-gray-400 mb-1">Sem pauta cadastrada</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/pautas/nova?data=${chave}`); }}
              className="text-xs px-2 py-1 rounded border border-dashed border-blue-400 text-blue-700 hover:bg-blue-50"
            >
              + Criar pauta
            </button>
          </div>
        )}

        {/* Blocos livres por pauta (atrás das audiências) */}
        {mostrarLivres && pautasDoDia.map(pauta =>
          (livresPorPauta[pauta.id] || []).map((bloco, i) => (
            <button
              key={`livre-${pauta.id}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/pautas/${pauta.id}/audiencias/nova?hora=${bloco.inicio}`);
              }}
              className="absolute left-0.5 right-0.5 rounded border border-green-400 bg-green-50 hover:bg-green-100 text-green-800 text-xs px-1 overflow-hidden text-left"
              style={{
                top: (minutos(bloco.inicio) - HORA_INICIO * 60) * PX_POR_MINUTO,
                height: Math.max(16, bloco.minutos * PX_POR_MINUTO) - 2
              }}
              title={`Livre na pauta da ${pauta.vara.nome}: ${bloco.inicio} - ${bloco.fim}. Clique para agendar.`}
            >
              {bloco.inicio}–{bloco.fim} livre{varias ? ` · ${pauta.vara.nome}` : ''}
            </button>
          ))
        )}

        {/* Audiências */}
        {doDia.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelecionada(a); }}
            className={`absolute left-1 right-1 rounded border text-xs px-1 text-left overflow-hidden shadow-sm ${getStatusBadgeClass(a.status)} hover:opacity-80`}
            style={{
              top: (minutos(a.horarioInicio) - HORA_INICIO * 60) * PX_POR_MINUTO,
              height: Math.max(18, (a.duracao || 60) * PX_POR_MINUTO) - 2
            }}
            title={`${a.horarioInicio}-${a.horarioFim} ${a.numeroProcesso}`}
          >
            <span className="font-semibold">{a.horarioInicio}</span> {a.numeroProcesso}
            {a.vara && <div className="truncate">{a.vara.nome}</div>}
          </button>
        ))}
      </div>
    );
  };

  /** Visões de semana (seg-sex) e dia: grade com eixo de horas. */
  const renderGradeHoraria = () => {
    // Semana/dia exigem uma vara escolhida.
    if (!varaId) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg py-16 text-center text-gray-500">
          <p className="text-lg font-medium mb-1">Selecione uma vara</p>
          <p className="text-sm">
            As visões de semana e dia mostram a grade de horários de uma vara por
            vez. Escolha a vara no seletor acima para continuar.
          </p>
        </div>
      );
    }

    const dias: Date[] = [];
    for (let d = intervalo.inicio; d <= intervalo.fim; d = addDays(d, 1)) {
      dias.push(d);
    }
    const hoje = new Date();

    return (
      <div>
        <div className="flex ml-12 border-b border-gray-200">
          {dias.map(d => (
            <div key={chaveDia(d)}
                 className={`flex-1 text-center text-sm py-1 font-medium ${
                   isSameDay(d, hoje) ? 'text-blue-700 font-bold' : 'text-gray-600'
                 }`}>
              {format(d, 'EEE dd/MM', { locale: ptBR })}
            </div>
          ))}
        </div>
        <div className="flex">
          {/* Eixo de horas */}
          <div className="w-12 relative" style={{ height: (HORA_FIM - HORA_INICIO) * 60 * PX_POR_MINUTO }}>
            {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
              <div key={i} className="absolute text-xs text-gray-400 -translate-y-1/2 right-1"
                   style={{ top: i * 60 * PX_POR_MINUTO }}>
                {String(HORA_INICIO + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {dias.map(colunaDia)}
        </div>
      </div>
    );
  };

  const pautasDoDiaSelecionado = diaSelecionado ? (pautasPorDia[diaSelecionado] || []) : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Barra de navegação do calendário */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">←</button>
          <button onClick={() => setReferencia(new Date())}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Hoje</button>
          <button onClick={() => navegar(1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">→</button>
          <h2 className="text-lg font-semibold text-gray-800 ml-2">{tituloPeriodo()}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de vara (obrigatório em semana/dia; ignorado no mês) */}
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={varaId}
            onChange={(e) => setVaraId(e.target.value)}
            title={modo === 'mes'
              ? 'No mês são exibidas todas as varas'
              : 'Escolha a vara para ver a grade de semana/dia'}
          >
            <option value="">
              {modo === 'mes' ? 'Todas as varas' : 'Selecione a vara…'}
            </option>
            {varas.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>

          {/* Horários livres: janela de busca + ativação */}
          <label className="flex items-center text-sm text-gray-700 gap-1"
                 title="Exibe os blocos de tempo livre das pautas cadastradas">
            <input
              type="checkbox"
              checked={mostrarLivres}
              onChange={(e) => setMostrarLivres(e.target.checked)}
            />
            Horários livres
          </label>
          {mostrarLivres && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              das
              <input
                type="time"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={janelaInicio}
                onChange={(e) => setJanelaInicio(e.target.value)}
                title="Início da janela de busca de horários livres"
              />
              às
              <input
                type="time"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={janelaFim}
                onChange={(e) => setJanelaFim(e.target.value)}
                title="Fim da janela de busca de horários livres"
              />
            </span>
          )}

          {/* Modos de visualização */}
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            {(['mes', 'semana', 'dia'] as Modo[]).map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-3 py-1 text-sm font-medium ${
                  modo === m ? 'bg-blue-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {m === 'mes' ? 'Mês' : m === 'semana' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3 text-sm">
          {erro}
        </div>
      )}

      {modo === 'mes' ? renderMes() : renderGradeHoraria()}

      {/* Painel do dia: pautas do dia ou criação de pauta */}
      {diaSelecionado && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={() => setDiaSelecionado(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              {formatarDataBR(diaSelecionado)}
            </h3>

            {pautasDoDiaSelecionado.length === 0 ? (
              <p className="text-sm text-gray-600 mb-4">
                Não há pauta cadastrada nesta data. Crie uma pauta para começar a
                agendar as audiências do dia.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {pautasDoDiaSelecionado.map(pauta => (
                  <button
                    key={pauta.id}
                    type="button"
                    onClick={() => { setDiaSelecionado(null); navigate(`/pautas/${pauta.id}`); }}
                    className="w-full text-left border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-4 py-3"
                  >
                    <p className="font-semibold text-indigo-900">📋 {pauta.vara.nome}</p>
                    <p className="text-sm text-indigo-800">
                      Juiz: {pauta.juiz.nome} · Promotor: {pauta.promotor.nome}
                    </p>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      {pauta.totalAudiencias} audiência(s)
                      {mostrarLivres && ` · ${(livresPorPauta[pauta.id] || []).length} bloco(s) livre(s)`}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { const dia = diaSelecionado; setDiaSelecionado(null); navigate(`/pautas/nova?data=${dia}`); }}
                className="px-3 py-1.5 rounded bg-blue-900 text-white hover:bg-blue-800 text-sm font-medium"
              >
                + Nova Pauta
              </button>
              <button
                onClick={() => setDiaSelecionado(null)}
                className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel da audiência selecionada */}
      {selecionada && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={() => setSelecionada(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              Processo {selecionada.numeroProcesso}
            </h3>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mb-3 ${getStatusBadgeClass(selecionada.status)}`}>
              {rotuloStatus[selecionada.status] || selecionada.status}
            </span>
            <div className="text-sm text-gray-700 space-y-1 mb-4">
              <p><strong>Data:</strong> {formatarDataBR(selecionada.dataAudiencia)} das {selecionada.horarioInicio} às {selecionada.horarioFim}</p>
              <p><strong>Tipo:</strong> {rotuloTipo[selecionada.tipoAudiencia] || selecionada.tipoAudiencia}</p>
              {selecionada.vara && <p><strong>Vara:</strong> {selecionada.vara.nome}</p>}
              {selecionada.juiz && <p><strong>Juiz:</strong> {selecionada.juiz.nome}</p>}
              {selecionada.promotor && <p><strong>Promotor:</strong> {selecionada.promotor.nome}</p>}
              {selecionada.reuPreso && <p className="text-red-700 font-semibold">RÉU PRESO</p>}
              {selecionada.depoimentoEspecial && (
                <p className="text-purple-700 font-semibold">DEPOIMENTO ESPECIAL</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {selecionada.pautaId && (
                <Link
                  to={`/pautas/${selecionada.pautaId}`}
                  className="px-3 py-1.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-sm font-medium"
                >
                  Abrir Pauta
                </Link>
              )}
              <Link
                to={`/audiencias/${selecionada.id}`}
                className="px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium"
              >
                Detalhes
              </Link>
              <Link
                to={`/audiencias/editar/${selecionada.id}`}
                className="px-3 py-1.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-sm font-medium"
              >
                Editar
              </Link>
              <button
                onClick={() => excluirAudiencia(selecionada)}
                className="px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelecionada(null)}
                className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioPautas;
