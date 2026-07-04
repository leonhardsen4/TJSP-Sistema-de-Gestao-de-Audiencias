import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { maskProcessoCNJ, processoCNJCompleto, toUpper } from '../../utils/masks';
import { TIPOS_PARTICIPACAO, PARTES_PRINCIPAIS, rotuloTipoParticipacao } from '../../utils/participacao';

/**
 * Formulário de audiência — sempre vinculada a uma pauta.
 *
 * A data, a vara, o juiz e o promotor vêm da pauta (vínculo rígido) e são
 * exibidos em um cabeçalho fixo. O formulário cuida do que é próprio da
 * audiência: processo, horário, classificação, peças do processo (defesa
 * prévia, FA/CDC e laudo, com as folhas), características, observações,
 * participantes (com mandado, folha e situação de prisão) e o texto de
 * agendamento no Teams, gerado automaticamente.
 *
 * Recursos especiais:
 * - Ao completar o número do processo em uma audiência nova, o sistema
 *   procura a audiência anterior mais recente do mesmo processo e oferece
 *   copiar os dados (continuações são comuns no fórum);
 * - Participante marcado como preso liga automaticamente o badge RP da
 *   audiência (calculado no servidor).
 *
 * Rotas atendidas:
 * - criação: /pautas/:pautaId/audiencias/nova (aceita ?hora=HH:mm);
 * - edição:  /audiencias/editar/:id (a pauta vem da própria audiência).
 */

interface Pessoa {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
}
interface Advogado { id: number; nome: string; oab: string; }

/** Dados da pauta exibidos no cabeçalho fixo. */
interface PautaResumo {
  id: number;
  data: string;
  vara: { id: number; nome: string };
  juiz: { id: number; nome: string };
  promotor: { id: number; nome: string };
  observacoes: string | null;
}

interface ParticipanteForm {
  pessoaId: number;
  tipo: string;
  intimado: boolean;
  statusMandado: string;
  folhaIntimacao: string;
  preso: boolean;
  localPrisao: string;
  observacoes: string;
  advogadoId?: number;
  tipoRepresentacao?: string;
}

interface AudienciaForm {
  hora: string;
  duracao: number;
  status: string;
  tipoAudiencia: string;
  competencia: string;
  formato: string;
  processo: string;
  artigo: string;
  observacoes: string;
  defesaPrevia: boolean;
  defesaPreviaFolha: string;
  faCdc: boolean;
  faCdcFolha: string;
  laudo: boolean;
  laudoFolha: string;
  agendamentoTeams: boolean;
  reconhecimento: boolean;
  depoimentoEspecial: boolean;
}

/** Situações possíveis do mandado de intimação. */
const STATUS_MANDADO: [string, string][] = [
  ['PENDENTE', 'Pendente de cumprimento'],
  ['POSITIVO', 'Cumprido - positivo'],
  ['NEGATIVO', 'Cumprido - negativo'],
  ['DISPENSADO', 'Dispensado']
];

/** Rótulos dos tipos de audiência (usados no formulário e no texto do Teams). */
const TIPOS_AUDIENCIA: [string, string][] = [
  ['INSTRUCAO_DEBATES_JULGAMENTO', 'Instrução, Debates e Julgamento'],
  ['APRESENTACAO', 'Apresentação'],
  ['JUSTIFICACAO', 'Justificação'],
  ['SUSPENSAO_CONDICIONAL_PROCESSO', 'Suspensão Condicional do Processo'],
  ['ACORDO_NAO_PERSECUCAO_PENAL', 'Acordo de Não Persecução Penal'],
  ['JURI', 'Júri'],
  ['OUTROS', 'Outros']
];

const FORMATOS: [string, string][] = [
  ['VIRTUAL', 'Virtual'],
  ['PRESENCIAL', 'Presencial'],
  ['HIBRIDA', 'Híbrida']
];

const PARTICIPANTE_VAZIO: ParticipanteForm = {
  pessoaId: 0,
  tipo: 'REU',
  intimado: false,
  statusMandado: 'PENDENTE',
  folhaIntimacao: '',
  preso: false,
  localPrisao: '',
  observacoes: '',
  advogadoId: undefined,
  tipoRepresentacao: undefined
};

/** Peças do processo: campo booleano, campo da folha e rótulo exibido. */
const PECAS: { flag: keyof AudienciaForm; folha: keyof AudienciaForm; rotulo: string }[] = [
  { flag: 'defesaPrevia', folha: 'defesaPreviaFolha', rotulo: 'Defesa Prévia' },
  { flag: 'faCdc', folha: 'faCdcFolha', rotulo: 'FA e Certidão de Distribuições Criminais' },
  { flag: 'laudo', folha: 'laudoFolha', rotulo: 'Laudo' }
];

/** Formata uma data ISO (yyyy-MM-dd) para dd/MM/yyyy. */
const formatarDataBR = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

/** Escreve uma data ISO por extenso (ex.: "6 de julho de 2026"). */
const dataPorExtenso = (iso: string): string => {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${meses[mes - 1]} de ${ano}`;
};

/** Classe padrão dos inputs do formulário. */
const INPUT = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
const LABEL = 'block text-gray-700 text-sm font-bold mb-2';

const FormAudiencia: React.FC = () => {
  const { id, pautaId } = useParams<{ id?: string; pautaId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = !!id;

  const [pauta, setPauta] = useState<PautaResumo | null>(null);
  const [formData, setFormData] = useState<AudienciaForm>({
    hora: '',
    duracao: 60,
    status: 'PENDENTE',
    tipoAudiencia: '',
    competencia: '',
    formato: '',
    processo: '',
    artigo: '',
    observacoes: '',
    defesaPrevia: false,
    defesaPreviaFolha: '',
    faCdc: false,
    faCdcFolha: '',
    laudo: false,
    laudoFolha: '',
    agendamentoTeams: false,
    reconhecimento: false,
    depoimentoEspecial: false
  });

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([]);
  const [novoParticipante, setNovoParticipante] = useState<ParticipanteForm>({ ...PARTICIPANTE_VAZIO });
  const [pessoaFiltro, setPessoaFiltro] = useState('');
  const [showPessoaDropdown, setShowPessoaDropdown] = useState(false);
  const [advogadoFiltro, setAdvogadoFiltro] = useState('');
  const [showAdvogadoDropdown, setShowAdvogadoDropdown] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoCopia, setAvisoCopia] = useState<string | null>(null);
  /** Último número de processo já verificado (evita perguntar duas vezes). */
  const processoVerificado = useRef<string>('');

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);

        const [pessoasRes, advogadosRes] = await Promise.all([
          api.get<Pessoa[]>('/pessoas'),
          api.get<Advogado[]>('/advogados')
        ]);
        setPessoas(pessoasRes.data);
        setAdvogados(advogadosRes.data);

        if (isEdicao) {
          const audiencia = (await api.get(`/audiencias/${id}`)).data;
          setFormData({
            hora: audiencia.horarioInicio,
            duracao: audiencia.duracao || 60,
            status: audiencia.status,
            tipoAudiencia: audiencia.tipoAudiencia || '',
            competencia: audiencia.competencia || '',
            formato: audiencia.formato || '',
            processo: audiencia.numeroProcesso,
            artigo: audiencia.artigo || '',
            observacoes: audiencia.observacoes || '',
            defesaPrevia: audiencia.defesaPrevia || false,
            defesaPreviaFolha: audiencia.defesaPreviaFolha || '',
            faCdc: audiencia.faCdc || false,
            faCdcFolha: audiencia.faCdcFolha || '',
            laudo: audiencia.laudo || false,
            laudoFolha: audiencia.laudoFolha || '',
            agendamentoTeams: audiencia.agendamentoTeams || false,
            reconhecimento: audiencia.reconhecimento || false,
            depoimentoEspecial: audiencia.depoimentoEspecial || false
          });
          processoVerificado.current = audiencia.numeroProcesso;

          if (audiencia.pautaId) {
            const pautaRes = await api.get(`/pautas/${audiencia.pautaId}`);
            setPauta(pautaRes.data);
          }

          setParticipantes(mapearParticipantes(
            (await api.get(`/audiencias/${id}/participantes`)).data || []));
        } else {
          const pautaRes = await api.get(`/pautas/${pautaId}`);
          setPauta(pautaRes.data);

          const hora = new URLSearchParams(location.search).get('hora');
          if (hora) {
            setFormData(prev => ({ ...prev, hora }));
          }
        }

        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados. Por favor, tente novamente.');
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [id, pautaId, isEdicao, location.search]);

  /** Converte participantes vindos da API para o formato do formulário. */
  const mapearParticipantes = (dados: any[]): ParticipanteForm[] =>
    dados.map((p: any) => ({
      pessoaId: p.pessoa.id,
      tipo: p.tipo,
      intimado: p.intimado,
      statusMandado: p.statusMandado || 'PENDENTE',
      folhaIntimacao: p.folhaIntimacao || '',
      preso: p.preso || false,
      localPrisao: p.localPrisao || '',
      observacoes: p.observacoes || '',
      advogadoId: p.representacao?.advogado?.id || undefined,
      tipoRepresentacao: p.representacao?.tipo || undefined
    }));

  /** Rota de retorno: a pauta da audiência, ou a lista de audiências. */
  const rotaDeVolta = pauta ? `/pautas/${pauta.id}` : '/audiencias';

  /**
   * Procura a audiência anterior mais recente do mesmo processo e oferece
   * copiar os dados — atalho para as continuações de audiência.
   *
   * @param numeroMascarado número do processo com a máscara CNJ completa
   */
  const oferecerCopiaDeAnterior = async (numeroMascarado: string) => {
    if (isEdicao || processoVerificado.current === numeroMascarado) {
      return;
    }
    processoVerificado.current = numeroMascarado;
    try {
      const resposta = await api.get(`/audiencias?q=${encodeURIComponent(numeroMascarado)}`);
      const anteriores = (resposta.data || [])
        .filter((a: any) => a.numeroProcesso === numeroMascarado)
        .sort((a: any, b: any) => (b.dataAudiencia + b.horarioInicio)
          .localeCompare(a.dataAudiencia + a.horarioInicio));
      if (anteriores.length === 0) {
        return;
      }
      const anterior = anteriores[0];
      const copiar = window.confirm(
        `Este processo já teve audiência em ${formatarDataBR(anterior.dataAudiencia)} `
        + `às ${anterior.horarioInicio} (${anterior.vara?.nome || ''}).\n\n`
        + 'Deseja copiar os dados dela para esta audiência (tipo, formato, artigo, '
        + 'peças, observações e participantes)?'
      );
      if (!copiar) {
        return;
      }
      setFormData(prev => ({
        ...prev,
        duracao: anterior.duracao || prev.duracao,
        tipoAudiencia: anterior.tipoAudiencia || '',
        competencia: anterior.competencia || '',
        formato: anterior.formato || '',
        artigo: anterior.artigo || '',
        observacoes: anterior.observacoes || '',
        defesaPrevia: anterior.defesaPrevia || false,
        defesaPreviaFolha: anterior.defesaPreviaFolha || '',
        faCdc: anterior.faCdc || false,
        faCdcFolha: anterior.faCdcFolha || '',
        laudo: anterior.laudo || false,
        laudoFolha: anterior.laudoFolha || '',
        agendamentoTeams: anterior.agendamentoTeams || false,
        reconhecimento: anterior.reconhecimento || false,
        depoimentoEspecial: anterior.depoimentoEspecial || false
      }));
      const participantesRes = await api.get(`/audiencias/${anterior.id}/participantes`);
      setParticipantes(mapearParticipantes(participantesRes.data || []));
      setAvisoCopia(`Dados copiados da audiência de ${formatarDataBR(anterior.dataAudiencia)}. `
        + 'Revise as intimações e a situação dos mandados antes de salvar.');
    } catch (err) {
      console.error('Erro ao verificar audiência anterior:', err);
    }
  };

  /** Aplica máscara/transformação por campo enquanto o usuário digita. */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let valor: string | boolean = type === 'checkbox' ? checked : value;
    if (name === 'processo') {
      valor = maskProcessoCNJ(value);
      if (processoCNJCompleto(valor as string)) {
        oferecerCopiaDeAnterior(valor as string);
      }
    } else if (name === 'artigo' || name === 'observacoes' || name.endsWith('Folha')) {
      valor = toUpper(value);
    }

    setFormData(prev => ({ ...prev, [name]: valor }));
  };

  /** Filtro do autocomplete de pessoas (tolerante a CPF ausente). */
  const pessoasFiltradas = pessoas.filter(pessoa =>
    pessoa.nome.toLowerCase().includes(pessoaFiltro.toLowerCase()) ||
    (pessoa.cpf || '').includes(pessoaFiltro)
  );

  /** Filtro do autocomplete de advogados. */
  const advogadosFiltrados = advogados.filter(advogado =>
    advogado.nome.toLowerCase().includes(advogadoFiltro.toLowerCase()) ||
    (advogado.oab || '').toLowerCase().includes(advogadoFiltro.toLowerCase())
  );

  // Fecha os autocompletes ao clicar fora deles.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete')) {
        setShowPessoaDropdown(false);
        setShowAdvogadoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePessoaFiltroChange = (value: string) => {
    setPessoaFiltro(toUpper(value));
    setShowPessoaDropdown(true);
    setNovoParticipante(prev => ({ ...prev, pessoaId: 0 }));
  };

  const handleAdvogadoFiltroChange = (value: string) => {
    setAdvogadoFiltro(toUpper(value));
    setShowAdvogadoDropdown(true);
    if (value === '') {
      setNovoParticipante(prev => ({ ...prev, advogadoId: undefined, tipoRepresentacao: undefined }));
    }
  };

  const handlePessoaSelect = (pessoa: Pessoa) => {
    setPessoaFiltro(pessoa.cpf ? `${pessoa.nome} - ${pessoa.cpf}` : pessoa.nome);
    setNovoParticipante(prev => ({ ...prev, pessoaId: pessoa.id }));
    setShowPessoaDropdown(false);
  };

  const handleAdvogadoSelect = (advogado: Advogado) => {
    setAdvogadoFiltro(`${advogado.nome} - OAB: ${advogado.oab}`);
    setNovoParticipante(prev => ({ ...prev, advogadoId: advogado.id }));
    setShowAdvogadoDropdown(false);
  };

  const handleNovoParticipanteChange = (field: keyof ParticipanteForm, value: any) => {
    setNovoParticipante(prev => ({ ...prev, [field]: value }));
  };

  const adicionarParticipante = () => {
    if (novoParticipante.pessoaId === 0) {
      setError('Selecione uma pessoa da lista para adicionar como participante.');
      return;
    }
    if (participantes.some(p => p.pessoaId === novoParticipante.pessoaId)) {
      setError('Esta pessoa já foi adicionada como participante.');
      return;
    }
    setError(null);
    setParticipantes([...participantes, { ...novoParticipante }]);
    setNovoParticipante({ ...PARTICIPANTE_VAZIO });
    setPessoaFiltro('');
    setShowPessoaDropdown(false);
    setAdvogadoFiltro('');
    setShowAdvogadoDropdown(false);
  };

  const removerParticipante = (index: number) => {
    setParticipantes(prev => prev.filter((_, i) => i !== index));
  };

  /** Edita um campo de um participante já adicionado à lista. */
  const handleParticipanteChange = (index: number, field: keyof ParticipanteForm, value: any) => {
    setParticipantes(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const nomePessoa = (pessoaId: number): string =>
    pessoas.find(p => p.id === pessoaId)?.nome || 'Pessoa não encontrada';

  /** Dados de contato da pessoa (telefone e e-mail), para acesso rápido. */
  const contatosPessoa = (pessoaId: number): string[] => {
    const pessoa = pessoas.find(p => p.id === pessoaId);
    const contatos: string[] = [];
    if (pessoa?.telefone) contatos.push(`📞 ${pessoa.telefone}`);
    if (pessoa?.email) contatos.push(`✉️ ${pessoa.email}`);
    return contatos;
  };

  const rotuloDe = (lista: [string, string][], valor: string): string =>
    lista.find(([v]) => v === valor)?.[1] || valor;

  /**
   * Gera o texto de agendamento no Microsoft Teams a partir dos dados da
   * pauta, da audiência e das partes principais (com o local de prisão de
   * quem estiver preso).
   */
  const textoTeams = (): string => {
    if (!pauta) return '';
    // Número do processo apenas até o ano: NNNNNNN-DD.AAAA
    const processoAteAno = formData.processo.split('.').slice(0, 2).join('.');
    const linha1 = `${formatarDataBR(pauta.data)} ${formData.hora || '--:--'}hs | ${pauta.vara.nome}`
      + ` | PROC ${processoAteAno || '—'}`;

    const tipo = formData.tipoAudiencia
      ? rotuloDe(TIPOS_AUDIENCIA, formData.tipoAudiencia).toLowerCase() : '[tipo de audiência]';
    const formato = formData.formato
      ? rotuloDe(FORMATOS, formData.formato).toLowerCase() : '[formato]';
    const mensagem = `Prezados, segue o link de ingresso na audiência de ${tipo}, `
      + `que se realizará de forma ${formato} pela plataforma Microsoft Teams `
      + `no dia ${dataPorExtenso(pauta.data)} às ${formData.hora || '--:--'}.`;

    const reus = participantes
      .filter(p => PARTES_PRINCIPAIS.includes(p.tipo))
      .map(p => nomePessoa(p.pessoaId)
        + (p.preso ? ` (PRESO${p.localPrisao ? ' - ' + p.localPrisao : ''})` : ''));

    return [linha1, '', mensagem, '', ...reus].join('\n').trimEnd();
  };

  /** Copia o texto do Teams para a área de transferência. */
  const copiarTextoTeams = async () => {
    try {
      await navigator.clipboard.writeText(textoTeams());
      setAvisoCopia('Texto de agendamento copiado para a área de transferência.');
      setTimeout(() => setAvisoCopia(null), 4000);
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      if (!processoCNJCompleto(formData.processo)) {
        setError('O número do processo deve ter os 20 dígitos do padrão CNJ.');
        setSubmitting(false);
        return;
      }

      // Aviso de pendência: audiência sem parte principal cadastrada.
      const temPartePrincipal = participantes.some(p => PARTES_PRINCIPAIS.includes(p.tipo));
      if (!temPartePrincipal) {
        const continuar = window.confirm(
          'ATENÇÃO: nenhum participante foi cadastrado como parte principal '
          + '(Réu, Indiciado, Averiguado, Autor do Fato ou Querelado).\n\n'
          + 'A audiência ficará marcada como PENDENTE no painel de alertas até que a parte seja incluída.\n\n'
          + 'Deseja salvar mesmo assim?'
        );
        if (!continuar) {
          setSubmitting(false);
          return;
        }
      }

      // Verificação consultiva de conflitos na vara/data da pauta.
      if (pauta && formData.hora && formData.duracao) {
        const conflitosRes = await api.get('/audiencias/verificar-conflitos', {
          params: {
            data: pauta.data,
            horarioInicio: formData.hora,
            duracao: formData.duracao,
            varaId: pauta.vara.id,
            ...(id ? { audienciaId: id } : {})
          }
        });
        if (conflitosRes.data?.temConflito) {
          const conflitosTexto = conflitosRes.data.conflitos
            .map((c: any) => `Processo ${c.numeroProcesso} (${c.horarioInicio} - ${c.horarioFim})`)
            .join('\n');
          const confirmar = window.confirm(
            `ATENÇÃO: Foram detectados conflitos de horário nesta vara:\n\n${conflitosTexto}\n\nDeseja continuar mesmo assim?`
          );
          if (!confirmar) {
            setSubmitting(false);
            return;
          }
        }
      }

      // Data, vara, juiz e promotor não são enviados: o backend os herda
      // da pauta (vínculo rígido). O RP é derivado dos participantes.
      const payload = {
        numeroProcesso: formData.processo,
        horarioInicio: formData.hora,
        duracao: formData.duracao,
        status: formData.status,
        tipoAudiencia: formData.tipoAudiencia,
        competencia: formData.competencia,
        formato: formData.formato,
        artigo: formData.artigo,
        observacoes: formData.observacoes,
        defesaPrevia: formData.defesaPrevia,
        defesaPreviaFolha: formData.defesaPreviaFolha,
        faCdc: formData.faCdc,
        faCdcFolha: formData.faCdcFolha,
        laudo: formData.laudo,
        laudoFolha: formData.laudoFolha,
        agendamentoTeams: formData.agendamentoTeams,
        reconhecimento: formData.reconhecimento,
        depoimentoEspecial: formData.depoimentoEspecial
      };

      let audienciaId: string;
      if (isEdicao) {
        await api.put(`/audiencias/${id}`, payload);
        audienciaId = id!;
      } else {
        const response = await api.post(`/pautas/${pautaId}/audiencias`, payload);
        audienciaId = response.data.id;
      }

      // Regrava a lista completa de participantes (limpa mesmo se vazia).
      if (isEdicao) {
        await api.delete(`/audiencias/${audienciaId}/participantes`);
      }
      for (const p of participantes.filter(pt => pt.pessoaId > 0)) {
        const participantePayload: any = {
          pessoaId: Number(p.pessoaId),
          tipo: p.tipo,
          intimado: p.intimado || false,
          statusMandado: p.statusMandado || 'PENDENTE',
          folhaIntimacao: p.folhaIntimacao || '',
          preso: p.preso || false,
          localPrisao: p.preso ? p.localPrisao || '' : '',
          observacoes: p.observacoes || ''
        };
        if (p.advogadoId && p.advogadoId > 0) {
          participantePayload.advogadoId = Number(p.advogadoId);
          participantePayload.tipoRepresentacao = p.tipoRepresentacao || 'DEFESA';
        }
        await api.post(`/audiencias/${audienciaId}/participantes`, participantePayload);
      }

      navigate(rotaDeVolta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar audiência. Por favor, tente novamente.');
      console.error('Erro ao salvar audiência:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {isEdicao ? 'Editar Audiência' : 'Nova Audiência'}
      </h1>

      {/* Cabeçalho fixo da pauta: dados herdados, não editáveis aqui. */}
      {pauta && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg px-6 py-4 mb-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm text-blue-900">
            <span className="font-bold text-base">Pauta de {formatarDataBR(pauta.data)}</span>
            <span><strong>Vara:</strong> {pauta.vara.nome}</span>
            <span><strong>Juiz:</strong> {pauta.juiz.nome}</span>
            <span><strong>Promotor:</strong> {pauta.promotor.nome}</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            A audiência herda a data, a vara, o juiz e o promotor da pauta.
            Para alterá-los, edite a pauta (a mudança vale para todas as audiências dela).
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {avisoCopia && (
        <div className="bg-green-50 border border-green-400 text-green-800 px-4 py-3 rounded relative mb-4">
          {avisoCopia}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mb-4">
        {/* Seção 1: Processo e horário */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">Processo e Horário</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={LABEL} htmlFor="processo">Número do Processo (padrão CNJ)*</label>
              <input
                className={INPUT}
                id="processo"
                name="processo"
                type="text"
                inputMode="numeric"
                placeholder="0000000-00.0000.0.00.0000"
                maxLength={25}
                value={formData.processo}
                onChange={handleChange}
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Digite apenas os 20 números. Se o processo já teve audiência, o sistema
                oferecerá copiar os dados dela (útil nas continuações).
              </p>
            </div>
            <div>
              <label className={LABEL} htmlFor="artigo">Artigo / Assunto</label>
              <input
                className={INPUT}
                id="artigo"
                name="artigo"
                type="text"
                placeholder="EX.: ART. 157 DO CP"
                maxLength={100}
                value={formData.artigo}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="hora">Hora de início*</label>
              <input className={INPUT} id="hora" name="hora" type="time"
                     value={formData.hora} onChange={handleChange} required />
            </div>
            <div>
              <label className={LABEL} htmlFor="duracao">Duração (minutos)*</label>
              <input className={INPUT} id="duracao" name="duracao" type="number"
                     min="15" max="480" step="15" placeholder="60"
                     value={formData.duracao} onChange={handleChange} required />
            </div>
          </div>
        </fieldset>

        {/* Seção 2: Classificação */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">Classificação</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={LABEL} htmlFor="tipoAudiencia">Tipo de Audiência*</label>
              <select className={INPUT} id="tipoAudiencia" name="tipoAudiencia"
                      value={formData.tipoAudiencia} onChange={handleChange} required>
                <option value="">Selecione o tipo</option>
                {TIPOS_AUDIENCIA.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="formato">Formato*</label>
              <select className={INPUT} id="formato" name="formato"
                      value={formData.formato} onChange={handleChange} required>
                <option value="">Selecione o formato</option>
                {FORMATOS.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="competencia">Competência*</label>
              <select className={INPUT} id="competencia" name="competencia"
                      value={formData.competencia} onChange={handleChange} required>
                <option value="">Selecione a competência</option>
                <option value="CRIMINAL">Criminal</option>
                <option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option>
                <option value="INFANCIA_JUVENTUDE">Infância e Juventude</option>
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="status">Status*</label>
              <select className={INPUT} id="status" name="status"
                      value={formData.status} onChange={handleChange} required>
                <option value="PENDENTE">Pendente</option>
                <option value="REALIZADA">Realizada</option>
                <option value="NAO_REALIZADA">Não Realizada</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                Audiências pendentes com data já passada geram alerta no Dashboard
                até o status ser atualizado.
              </p>
            </div>
          </div>
        </fieldset>

        {/* Seção 3: Peças do processo */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">Peças do Processo</legend>
          <p className="text-gray-500 text-sm mb-4">
            Marque as peças presentes e anote a folha onde se encontram — elas saem na pauta em PDF.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PECAS.map(({ flag, folha, rotulo }) => (
              <div key={flag}>
                <label className="flex items-center text-gray-700 text-sm font-bold cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    name={flag}
                    checked={formData[flag] as boolean}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {rotulo}
                </label>
                {formData[flag] && (
                  <input
                    className={INPUT}
                    name={folha}
                    type="text"
                    placeholder="EX.: FLS. 30"
                    maxLength={30}
                    value={formData[folha] as string}
                    onChange={handleChange}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Seção 4: Características e observações */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">Características</legend>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {([
              ['reconhecimento', 'Reconhecimento'],
              ['depoimentoEspecial', 'Depoimento Especial']
            ] as [keyof AudienciaForm, string][]).map(([campo, rotulo]) => (
              <label key={campo} htmlFor={campo}
                     className="flex items-center text-gray-700 text-sm font-bold cursor-pointer">
                <input
                  type="checkbox"
                  id={campo}
                  name={campo}
                  checked={formData[campo] as boolean}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                {rotulo}
              </label>
            ))}
          </div>
          <p className="text-gray-500 text-xs mb-4">
            O marcador RP (réu preso) é automático: liga quando algum participante é marcado como preso.
          </p>
          <div>
            <label className={LABEL} htmlFor="observacoes">Observações</label>
            <textarea
              className={INPUT}
              id="observacoes"
              name="observacoes"
              rows={3}
              maxLength={500}
              placeholder="OBSERVAÇÕES SOBRE A AUDIÊNCIA"
              value={formData.observacoes}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* Seção 5: Participantes */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">
            Participantes {participantes.length > 0 && `(${participantes.length})`}
          </legend>

          {!participantes.some(p => PARTES_PRINCIPAIS.includes(p.tipo)) && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
              A audiência deve ter ao menos uma parte principal
              (Réu, Indiciado, Averiguado, Autor do Fato ou Querelado).
            </div>
          )}

          {/* Adicionar novo participante */}
          <div className="border border-blue-300 rounded p-4 mb-4 bg-blue-50">
            <h4 className="text-md font-semibold text-gray-700 mb-4">Adicionar Participante</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative autocomplete">
                <label className={LABEL}>Pessoa*</label>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="DIGITE O NOME OU CPF DA PESSOA..."
                  value={pessoaFiltro}
                  onChange={(e) => handlePessoaFiltroChange(e.target.value)}
                  onFocus={() => setShowPessoaDropdown(true)}
                />
                {showPessoaDropdown && pessoasFiltradas.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                    {pessoasFiltradas.slice(0, 10).map(pessoa => (
                      <div
                        key={pessoa.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handlePessoaSelect(pessoa)}
                      >
                        <div className="font-medium">{pessoa.nome}</div>
                        <div className="text-sm text-gray-600">{pessoa.cpf || 'Sem CPF'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={LABEL}>Papel na audiência*</label>
                <select
                  className={INPUT}
                  value={novoParticipante.tipo}
                  onChange={(e) => handleNovoParticipanteChange('tipo', e.target.value)}
                >
                  {TIPOS_PARTICIPACAO.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </select>
              </div>

              <div className="relative autocomplete">
                <label className={LABEL}>Advogado</label>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="DIGITE O NOME OU OAB DO ADVOGADO..."
                  value={advogadoFiltro}
                  onChange={(e) => handleAdvogadoFiltroChange(e.target.value)}
                  onFocus={() => setShowAdvogadoDropdown(true)}
                />
                {showAdvogadoDropdown && advogadosFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                    {advogadosFiltrados.slice(0, 10).map(advogado => (
                      <div
                        key={advogado.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleAdvogadoSelect(advogado)}
                      >
                        <div className="font-medium">{advogado.nome}</div>
                        <div className="text-sm text-gray-600">OAB: {advogado.oab}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {novoParticipante.advogadoId && (
                <div>
                  <label className={LABEL}>Tipo de Representação</label>
                  <select
                    className={INPUT}
                    value={novoParticipante.tipoRepresentacao || ''}
                    onChange={(e) => handleNovoParticipanteChange('tipoRepresentacao', e.target.value)}
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="CONSTITUIDO">Constituído</option>
                    <option value="DATIVO">Dativo</option>
                    <option value="AD_HOC">Ad Hoc</option>
                  </select>
                </div>
              )}

              <div>
                <label className={LABEL}>Situação do mandado de intimação</label>
                <select
                  className={INPUT}
                  value={novoParticipante.statusMandado}
                  onChange={(e) => handleNovoParticipanteChange('statusMandado', e.target.value)}
                >
                  {STATUS_MANDADO.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL}>Folha da intimação (fls.)</label>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="EX.: FLS. 123"
                  maxLength={30}
                  value={novoParticipante.folhaIntimacao}
                  onChange={(e) => handleNovoParticipanteChange('folhaIntimacao', toUpper(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center text-gray-700 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoParticipante.intimado}
                    onChange={(e) => handleNovoParticipanteChange('intimado', e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  Já intimado
                </label>
                <label className="flex items-center text-red-700 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoParticipante.preso}
                    onChange={(e) => handleNovoParticipanteChange('preso', e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  Preso(a)
                </label>
              </div>

              {novoParticipante.preso && (
                <div>
                  <label className={LABEL}>Local de Prisão</label>
                  <textarea
                    className={INPUT}
                    rows={2}
                    maxLength={200}
                    placeholder="EX.: CDP DE CAIEIRAS - RECOLHIDO DESDE 01/06/2026"
                    value={novoParticipante.localPrisao}
                    onChange={(e) => handleNovoParticipanteChange('localPrisao', toUpper(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className={LABEL}>Observações</label>
              <textarea
                className={INPUT}
                rows={2}
                maxLength={300}
                placeholder="OBSERVAÇÕES SOBRE O PARTICIPANTE"
                value={novoParticipante.observacoes}
                onChange={(e) => handleNovoParticipanteChange('observacoes', toUpper(e.target.value))}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={adicionarParticipante}
                disabled={novoParticipante.pessoaId === 0}
                className={`font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  novoParticipante.pessoaId === 0
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Adicionar à Lista
              </button>
            </div>
          </div>

          {/* Lista de participantes adicionados */}
          {participantes.map((participante, index) => (
            <div key={index} className={`border rounded p-4 mb-3 ${
              PARTES_PRINCIPAIS.includes(participante.tipo)
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-sm font-semibold text-gray-800">
                  {nomePessoa(participante.pessoaId)}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">
                    {rotuloTipoParticipacao(participante.tipo)}
                  </span>
                  {PARTES_PRINCIPAIS.includes(participante.tipo) && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-200 text-blue-800">
                      Parte principal
                    </span>
                  )}
                  {participante.preso && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold">
                      PRESO
                    </span>
                  )}
                </h5>
                <button
                  type="button"
                  onClick={() => removerParticipante(index)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none text-xs"
                >
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="block text-gray-600 text-xs font-bold mb-1">Situação do mandado</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    value={participante.statusMandado}
                    onChange={(e) => handleParticipanteChange(index, 'statusMandado', e.target.value)}
                  >
                    {STATUS_MANDADO.map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>{rotulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-bold mb-1">Folha (fls.)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    maxLength={30}
                    value={participante.folhaIntimacao}
                    onChange={(e) => handleParticipanteChange(index, 'folhaIntimacao', toUpper(e.target.value))}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center text-gray-700 text-sm font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4"
                      checked={participante.intimado}
                      onChange={(e) => handleParticipanteChange(index, 'intimado', e.target.checked)}
                    />
                    Intimado
                  </label>
                  {!participante.intimado && (
                    <span className="ml-2 text-xs text-red-600 font-semibold">não intimado</span>
                  )}
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center text-red-700 text-sm font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4"
                      checked={participante.preso}
                      onChange={(e) => handleParticipanteChange(index, 'preso', e.target.checked)}
                    />
                    Preso(a)
                  </label>
                </div>
              </div>

              {participante.preso && (
                <div className="mt-2">
                  <label className="block text-gray-600 text-xs font-bold mb-1">Local de Prisão</label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    rows={2}
                    maxLength={200}
                    placeholder="EX.: CDP DE CAIEIRAS"
                    value={participante.localPrisao}
                    onChange={(e) => handleParticipanteChange(index, 'localPrisao', toUpper(e.target.value))}
                  />
                </div>
              )}

              <div className="text-sm text-gray-600 mt-2 space-y-0.5">
                {contatosPessoa(participante.pessoaId).length > 0 && (
                  <p className="text-blue-800">
                    {contatosPessoa(participante.pessoaId).join('   ')}
                  </p>
                )}
                {participante.advogadoId && (
                  <p>
                    <strong>Advogado:</strong> {advogados.find(a => a.id === participante.advogadoId)?.nome}
                    {' '}- OAB: {advogados.find(a => a.id === participante.advogadoId)?.oab}
                    {participante.tipoRepresentacao && ` (${participante.tipoRepresentacao})`}
                  </p>
                )}
                {participante.observacoes && (
                  <p><strong>Observações:</strong> {participante.observacoes}</p>
                )}
              </div>
            </div>
          ))}
        </fieldset>

        {/* Seção 6: Agendamento no Teams (texto gerado automaticamente) */}
        <fieldset className="bg-white shadow-md rounded px-8 pt-6 pb-6">
          <legend className="text-lg font-bold text-gray-800 px-2">Agendamento Teams</legend>
          <label htmlFor="agendamentoTeams"
                 className="flex items-center text-gray-700 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              id="agendamentoTeams"
              name="agendamentoTeams"
              checked={formData.agendamentoTeams}
              onChange={handleChange}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            Audiência com agendamento no Microsoft Teams
          </label>

          {formData.agendamentoTeams && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-600 text-xs font-bold">
                  Texto para o agendamento (gerado automaticamente com os dados acima)
                </label>
                <button
                  type="button"
                  onClick={copiarTextoTeams}
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-1.5 px-3 rounded"
                >
                  📋 Copiar texto
                </button>
              </div>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-gray-50"
                rows={8}
                readOnly
                value={textoTeams()}
              />
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate(rotaDeVolta)}
          >
            Cancelar
          </button>
          <button
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormAudiencia;
