import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays, addMonths, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import { Pauta } from './PautasList';

/**
 * Calendário mensal das pautas: mostra em cada dia apenas os cartões de
 * pauta (vara e quantidade de audiências), sem os processos individuais.
 *
 * Cada cartão usa a cor cadastrada na vara (campo "Cor no calendário"),
 * para identificação visual imediata. Clicar no cartão abre a pauta;
 * clicar em um dia vazio leva à criação de uma pauta naquela data.
 */

/** Cor padrão dos cartões quando a vara não tem cor cadastrada. */
const COR_PADRAO = '#4F46E5';

/** Converte um Date para a chave ISO do dia (yyyy-MM-dd). */
const chaveDia = (data: Date): string => format(data, 'yyyy-MM-dd');

/**
 * Escolhe preto ou branco para o texto conforme a luminosidade do fundo,
 * mantendo o cartão legível com qualquer cor escolhida.
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
  const [referencia, setReferencia] = useState<Date>(new Date());
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Intervalo visível: semanas completas que cobrem o mês. */
  const intervalo = useMemo(() => ({
    inicio: startOfWeek(startOfMonth(referencia), { weekStartsOn: 0 }),
    fim: endOfWeek(endOfMonth(referencia), { weekStartsOn: 0 })
  }), [referencia]);

  // Busca as pautas do período visível.
  useEffect(() => {
    const buscar = async () => {
      try {
        const params = new URLSearchParams({
          dataInicio: chaveDia(intervalo.inicio),
          dataFim: chaveDia(intervalo.fim)
        });
        const response = await api.get<Pauta[]>(`/pautas?${params}`);
        setPautas(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar as pautas do calendário.');
        console.error('Erro ao buscar pautas:', err);
      }
    };
    buscar();
  }, [intervalo.inicio, intervalo.fim]);

  /** Pautas agrupadas por dia. */
  const pautasPorDia = useMemo(() => {
    const mapa: Record<string, Pauta[]> = {};
    pautas.forEach(p => {
      (mapa[p.data] = mapa[p.data] || []).push(p);
    });
    return mapa;
  }, [pautas]);

  const semanas = useMemo(() => {
    const resultado: Date[][] = [];
    let dia = intervalo.inicio;
    while (dia <= intervalo.fim) {
      const semana: Date[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push(dia);
        dia = addDays(dia, 1);
      }
      resultado.push(semana);
    }
    return resultado;
  }, [intervalo]);

  const titulo = useMemo(() => {
    const texto = format(referencia, 'MMMM yyyy', { locale: ptBR });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }, [referencia]);

  const hoje = new Date();

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Navegação do mês */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setReferencia(addMonths(referencia, -1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">←</button>
        <button onClick={() => setReferencia(new Date())}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Hoje</button>
        <button onClick={() => setReferencia(addMonths(referencia, 1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">→</button>
        <h2 className="text-lg font-semibold text-gray-800 ml-2">{titulo}</h2>
        <span className="ml-auto text-xs text-gray-400">
          A cor de cada pauta é definida no cadastro da vara.
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 uppercase border-b pb-1 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
      </div>
      {semanas.map((semana, i) => (
        <div key={i} className="grid grid-cols-7">
          {semana.map(diaCelula => {
            const chave = chaveDia(diaCelula);
            const doDia = pautasPorDia[chave] || [];
            const foraDoMes = !isSameMonth(diaCelula, referencia);
            return (
              <div
                key={chave}
                onClick={() => navigate(`/pautas/nova?data=${chave}`)}
                className={`min-h-[110px] border border-gray-100 p-1 cursor-pointer hover:bg-blue-50 ${
                  foraDoMes ? 'bg-gray-50 text-gray-400' : 'bg-white'
                }`}
                title="Clique para criar uma pauta nesta data"
              >
                <div className={`text-right text-xs mb-1 ${
                  isSameDay(diaCelula, hoje)
                    ? 'font-bold text-white bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center ml-auto'
                    : 'text-gray-600'
                }`}>
                  {format(diaCelula, 'd')}
                </div>
                {doDia.map(pauta => {
                  const cor = pauta.vara.cor || COR_PADRAO;
                  return (
                    <button
                      key={pauta.id}
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

export default CalendarioPautas;
