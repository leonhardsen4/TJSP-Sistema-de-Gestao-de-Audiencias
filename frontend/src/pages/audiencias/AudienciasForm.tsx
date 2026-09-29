import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { maskCPF, maskOAB, maskProcessoCNJ, processoCNJCompleto, toUpper } from '../../utils/masks';
import Modal from '../../components/Modal';
import { PessoaCadastro, PessoaForm } from '../pessoas/PessoasForm';
import { AdvogadoCadastro, AdvogadoForm } from '../advogados/AdvogadosForm';
import { TIPOS_PARTICIPACAO, PARTES_PRINCIPAIS, rotuloTipoParticipacao, ordemExibicaoParte } from '../../utils/participacao';

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
 *   audiência (calculado no servidor);
 * - Pessoa ou advogado não encontrado na busca pode ser cadastrado numa
 *   janela modal, sem sair do formulário; o novo cadastro já volta
 *   selecionado no campo;
 * - Cada parte pode ter vários advogados ("+ Adicionar advogado" abre
 *   outro campo de busca), inclusive nas partes já incluídas na lista;
 * - Ao incluir uma parte, um aviso confirma a inclusão e os campos são
 *   limpos; a mesma pessoa não pode entrar duas vezes (aviso + limpeza);
 * - A duração aceita os valores da lista (de 5 em 5 minutos) ou qualquer
 *   valor digitado.
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
interface Advogado {
  id: number;
  nome: string;
  oab: string;
  telefone: string | null;
  email: string | null;
}

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
  advogados: RepresentacaoForm[];
}

/** Advogado vinculado a uma parte, com o tipo de representação. */
interface RepresentacaoForm {
  advogadoId: number;
  tipoRepresentacao: string;
}

/** Linha de busca de advogado na área "Adicionar Parte". */
interface LinhaAdvogado {
  /** Chave estável da linha (recria o campo de busca ao limpar). */
  chave: number;
  advogadoId?: number;
  tipoRepresentacao: string;
}

/** Aviso exibido junto ao botão "Adicionar à Lista". */
interface AvisoParte {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

interface AudienciaForm {
  hora: string;
  /** Duração em minutos, como texto (o campo aceita digitação livre). */
  duracao: string;
  status: string;
  tipoAudiencia: string;
  competencia: string;
  formato: string;
  processo: string;
  artigo: string;
  observacoes: string;
  denuncia: boolean;
  denunciaFolha: string;
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
  ['DISPENSADO', 'Dispensado'],
  ['OFICIO_REQUISICAO', 'Ofício de Requisição']
];

/** Sugestões de duração da lista (5 a 240 minutos, de 5 em 5). */
const DURACOES_SUGERIDAS: number[] = Array.from({ length: 48 }, (_, i) => (i + 1) * 5);

/** Tamanho máximo das anotações de cada peça do processo. */
const MAX_ANOTACAO_PECA = 1000;

/** Descreve uma duração em minutos (ex.: 90 → "1h 30min"). */
const descreverDuracao = (minutos: number): string => {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${String(resto).padStart(2, '0')}min`;
};

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
  advogados: []
};

/** Tipos de representação oferecidos no formulário. */
const TIPOS_REPRESENTACAO: [string, string][] = [
  ['CONSTITUIDO', 'Constituído'],
  ['DATIVO', 'Dativo'],
  ['AD_HOC', 'Ad Hoc']
];

/** Peças do processo: campo booleano, campo da folha e rótulo exibido. */
const PECAS: { flag: keyof AudienciaForm; folha: keyof AudienciaForm; rotulo: string }[] = [
  { flag: 'denuncia', folha: 'denunciaFolha', rotulo: 'Denúncia' },
  { flag: 'defesaPrevia', folha: 'defesaPreviaFolha', rotulo: 'Defesa Prévia' },
  { flag: 'faCdc', folha: 'faCdcFolha', rotulo: 'FA e Certidão do Distribuidor' },
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

/** Propriedades do campo de busca de advogado. */
interface CampoAdvogadoProps {
  advogados: Advogado[];
  /** Advogado selecionado (undefined = nenhum). */
  advogadoId?: number;
  /** Chamado ao escolher um advogado, ou com undefined ao desfazer a escolha. */
  onSelecionar: (advogadoId?: number) => void;
  /** Chamado quando a busca não acha ninguém e o usuário quer cadastrar. */
  onCadastrar: (termo: string) => void;
  /** Foca o campo ao aparecer (útil quando é aberto por um botão). */
  autoFocus?: boolean;
}

/** Contatos (telefone e e-mail) de um advogado, formatados para exibição. */
const contatosDoAdvogado = (advogado?: Advogado): string[] => {
  const contatos: string[] = [];
  if (advogado?.telefone) contatos.push(`📞 ${advogado.telefone}`);
  if (advogado?.email) contatos.push(`✉️ ${advogado.email}`);
  return contatos;
};

/**
 * Campo de busca de advogado por nome ou OAB, com lista de sugestões,
 * contatos do selecionado e oferta de cadastro quando nada é encontrado.
 * Cada campo tem seu próprio texto de busca, o que permite vários na tela.
 */
const CampoAdvogado: React.FC<CampoAdvogadoProps> = ({ advogados, advogadoId, onSelecionar, onCadastrar, autoFocus }) => {
  const [filtro, setFiltro] = useState('');
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const selecionado = advogados.find(a => a.id === advogadoId);

  // Mostra o advogado escolhido (inclusive o recém-cadastrado na modal).
  useEffect(() => {
    if (selecionado) setFiltro(`${selecionado.nome} - OAB: ${selecionado.oab}`);
  }, [selecionado]);

  // Fecha a lista ao clicar fora deste campo.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, []);

  const termo = filtro.toLowerCase();
  const encontrados = advogados.filter(a =>
    a.nome.toLowerCase().includes(termo) || (a.oab || '').toLowerCase().includes(termo));

  return (
    <div className="relative" ref={raiz}>
      <input
        type="text"
        className={INPUT}
        placeholder="DIGITE O NOME OU OAB DO ADVOGADO..."
        value={filtro}
        autoFocus={autoFocus}
        onChange={(e) => {
          setFiltro(toUpper(e.target.value));
          setAberto(true);
          // Qualquer edição desfaz a escolha anterior (evita vincular o
          // advogado antigo com outro nome digitado).
          if (advogadoId) onSelecionar(undefined);
        }}
        onFocus={() => setAberto(true)}
      />
      {aberto && !advogadoId && encontrados.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
          {encontrados.slice(0, 10).map(advogado => (
            <div
              key={advogado.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => { onSelecionar(advogado.id); setAberto(false); }}
            >
              <div className="font-medium">{advogado.nome}</div>
              <div className="text-sm text-gray-600">
                OAB: {advogado.oab}
                {contatosDoAdvogado(advogado).length > 0 && `   ${contatosDoAdvogado(advogado).join('   ')}`}
              </div>
            </div>
          ))}
        </div>
      )}
      {filtro.trim().length >= 3 && !advogadoId && encontrados.length === 0 && (
        <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-sm text-yellow-900">
          Nenhum advogado cadastrado com “{filtro.trim()}”. Deseja cadastrá-lo?
          <button
            type="button"
            onClick={() => { onCadastrar(filtro.trim()); setAberto(false); }}
            className="ml-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-1 px-3 rounded"
          >
            Cadastrar advogado
          </button>
        </div>
      )}
      {selecionado && (
        <p className="mt-1 text-sm text-blue-800">
          {contatosDoAdvogado(selecionado).join('   ') || 'Advogado sem telefone/e-mail cadastrado'}
        </p>
      )}
    </div>
  );
};

const FormAudiencia: React.FC = () => {
  const { id, pautaId } = useParams<{ id?: string; pautaId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = !!id;

  const [pauta, setPauta] = useState<PautaResumo | null>(null);
  const [formData, setFormData] = useState<AudienciaForm>({
    hora: '',
    duracao: '60',
    status: 'PENDENTE',
    tipoAudiencia: '',
    competencia: '',
    formato: '',
    processo: '',
    artigo: '',
    observacoes: '',
    denuncia: false,
    denunciaFolha: '',
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
  /** Contador das chaves das linhas de advogado. */
  const proximaChave = useRef(1);
  const novaLinhaAdvogado = useCallback((): LinhaAdvogado =>
    ({ chave: proximaChave.current++, tipoRepresentacao: '' }), []);
  const [linhasAdvogado, setLinhasAdvogado] = useState<LinhaAdvogado[]>(() => [novaLinhaAdvogado()]);
  /** Índice da parte (na lista) que está recebendo mais um advogado. */
  const [parteRecebendoAdvogado, setParteRecebendoAdvogado] = useState<number | null>(null);
  const [avisoParte, setAvisoParte] = useState<AvisoParte | null>(null);
  const [showDuracaoDropdown, setShowDuracaoDropdown] = useState(false);
  /** Valores iniciais da modal de cadastro rápido aberta (null = fechada). */
  const [cadastroPessoa, setCadastroPessoa] = useState<Partial<PessoaForm> | null>(null);
  /** Modal de cadastro de advogado: valores iniciais e quem recebe o novo advogado. */
  const [cadastroAdvogado, setCadastroAdvogado] = useState<{
    valores: Partial<AdvogadoForm>;
    aoCadastrar: (advogadoId: number) => void;
  } | null>(null);
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
            duracao: String(audiencia.duracao || 60),
            status: audiencia.status,
            tipoAudiencia: audiencia.tipoAudiencia || '',
            competencia: audiencia.competencia || '',
            formato: audiencia.formato || '',
            processo: audiencia.numeroProcesso,
            artigo: audiencia.artigo || '',
            observacoes: audiencia.observacoes || '',
            denuncia: audiencia.denuncia || false,
            denunciaFolha: audiencia.denunciaFolha || '',
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
      advogados: (p.representacoes || []).map((r: any) => ({
        advogadoId: r.advogado.id,
        tipoRepresentacao: r.tipo || ''
      }))
    }));

  /**
   * Destino de fallback quando não há histórico de navegação (a tela foi
   * aberta por link direto): a pauta da audiência, ou a lista de audiências.
   */
  const rotaDeVolta = pauta ? `/pautas/${pauta.id}` : '/audiencias';

  /**
   * Volta para a tela anterior de onde o formulário foi aberto (a lista de
   * audiências com seus filtros, o calendário, a pauta...). Sem histórico
   * dentro do app, usa a rota de fallback.
   */
  const voltar = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(rotaDeVolta);
  };

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
        duracao: anterior.duracao ? String(anterior.duracao) : prev.duracao,
        tipoAudiencia: anterior.tipoAudiencia || '',
        competencia: anterior.competencia || '',
        formato: anterior.formato || '',
        artigo: anterior.artigo || '',
        observacoes: anterior.observacoes || '',
        denuncia: anterior.denuncia || false,
        denunciaFolha: anterior.denunciaFolha || '',
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
    if (name === 'duracao') {
      valor = value.replace(/\D/g, '').slice(0, 3);
    } else if (name === 'processo') {
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

  // Fecha os autocompletes ao clicar fora deles.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete')) {
        setShowPessoaDropdown(false);
        setShowDuracaoDropdown(false);
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

  const handlePessoaSelect = (pessoa: Pessoa) => {
    setPessoaFiltro(pessoa.cpf ? `${pessoa.nome} - ${pessoa.cpf}` : pessoa.nome);
    setNovoParticipante(prev => ({ ...prev, pessoaId: pessoa.id }));
    setShowPessoaDropdown(false);
  };

  /**
   * Abre a modal de cadastro de pessoa aproveitando o que foi digitado na
   * busca: números viram o CPF; o resto, o nome.
   */
  const abrirCadastroPessoa = () => {
    const termo = pessoaFiltro.trim();
    setCadastroPessoa(/[A-Z]/i.test(termo) ? { nome: termo } : { cpf: maskCPF(termo) });
    setShowPessoaDropdown(false);
  };

  /**
   * Abre a modal de cadastro de advogado com o nome ou a OAB digitados.
   *
   * @param termo        texto digitado na busca
   * @param aoCadastrar  recebe o id do advogado cadastrado
   */
  const abrirCadastroAdvogado = (termo: string, aoCadastrar: (advogadoId: number) => void) => {
    setCadastroAdvogado({
      valores: /^[\d/]+[A-Z]{0,2}$/i.test(termo) ? { oab: maskOAB(termo) } : { nome: termo },
      aoCadastrar
    });
  };

  /** Pessoa gravada na modal: entra na lista e já fica selecionada. */
  const pessoaCadastrada = (pessoa: Pessoa) => {
    setPessoas(prev => [...prev, pessoa]);
    handlePessoaSelect(pessoa);
    setCadastroPessoa(null);
  };

  /** Advogado gravado na modal: entra na lista e já fica selecionado no campo de origem. */
  const advogadoCadastrado = (advogado: Advogado) => {
    setAdvogados(prev => [...prev, advogado]);
    cadastroAdvogado?.aoCadastrar(advogado.id);
    setCadastroAdvogado(null);
  };

  /** Altera uma linha de advogado da área "Adicionar Parte". */
  const alterarLinhaAdvogado = (chave: number, mudancas: Partial<LinhaAdvogado>) => {
    setLinhasAdvogado(prev => prev.map(l => (l.chave === chave ? { ...l, ...mudancas } : l)));
  };

  /** Volta a área "Adicionar Parte" ao estado inicial. */
  const limparNovoParticipante = () => {
    setNovoParticipante({ ...PARTICIPANTE_VAZIO });
    setPessoaFiltro('');
    setShowPessoaDropdown(false);
    setLinhasAdvogado([novaLinhaAdvogado()]);
  };

  // O aviso de inclusão some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!avisoParte) return;
    const timer = setTimeout(() => setAvisoParte(null), 6000);
    return () => clearTimeout(timer);
  }, [avisoParte]);

  const handleNovoParticipanteChange = (field: keyof ParticipanteForm, value: any) => {
    setNovoParticipante(prev => ({ ...prev, [field]: value }));
  };

  const adicionarParticipante = () => {
    if (novoParticipante.pessoaId === 0) {
      setError('Selecione uma pessoa da lista para adicionar como participante.');
      return;
    }
    const nome = nomePessoa(novoParticipante.pessoaId);
    if (participantes.some(p => p.pessoaId === novoParticipante.pessoaId)) {
      limparNovoParticipante();
      setAvisoParte({
        tipo: 'erro',
        texto: `${nome} já está na lista de partes desta audiência. A mesma pessoa não pode ser incluída duas vezes; os campos foram limpos.`
      });
      return;
    }
    // Advogados escolhidos, sem repetição.
    const advogadosDaParte: RepresentacaoForm[] = [];
    linhasAdvogado.forEach(l => {
      if (l.advogadoId && !advogadosDaParte.some(a => a.advogadoId === l.advogadoId)) {
        advogadosDaParte.push({ advogadoId: l.advogadoId, tipoRepresentacao: l.tipoRepresentacao });
      }
    });
    setError(null);
    setParticipantes([...participantes, { ...novoParticipante, advogados: advogadosDaParte }]);
    limparNovoParticipante();
    setAvisoParte({
      tipo: 'sucesso',
      texto: `${nome} foi incluída na lista de partes como ${rotuloTipoParticipacao(novoParticipante.tipo)}. `
        + 'Clique em Salvar para gravar a audiência.'
    });
  };

  const removerParticipante = (index: number) => {
    setParteRecebendoAdvogado(null);
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

  /** Inclui um advogado numa parte já listada (sem repetir). */
  const incluirAdvogadoNaParte = (index: number, advogadoId: number) => {
    setParticipantes(prev => prev.map((p, i) => (i === index && !p.advogados.some(a => a.advogadoId === advogadoId)
      ? { ...p, advogados: [...p.advogados, { advogadoId, tipoRepresentacao: '' }] }
      : p)));
    setParteRecebendoAdvogado(null);
  };

  /** Retira um advogado de uma parte já listada. */
  const retirarAdvogadoDaParte = (index: number, advogadoId: number) => {
    setParticipantes(prev => prev.map((p, i) => (i === index
      ? { ...p, advogados: p.advogados.filter(a => a.advogadoId !== advogadoId) }
      : p)));
  };

  /** Altera o tipo de representação de um advogado de uma parte já listada. */
  const alterarTipoRepresentacao = (index: number, advogadoId: number, tipoRepresentacao: string) => {
    setParticipantes(prev => prev.map((p, i) => (i === index
      ? { ...p, advogados: p.advogados.map(a => (a.advogadoId === advogadoId ? { ...a, tipoRepresentacao } : a)) }
      : p)));
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
      .map(p => 'Réu: ' + nomePessoa(p.pessoaId)
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

      const duracao = Number(formData.duracao);
      if (!duracao || duracao <= 0) {
        setError('Informe a duração da audiência em minutos (maior que zero).');
        setSubmitting(false);
        return;
      }

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
            duracao,
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
        duracao,
        status: formData.status,
        tipoAudiencia: formData.tipoAudiencia,
        competencia: formData.competencia,
        formato: formData.formato,
        artigo: formData.artigo,
        observacoes: formData.observacoes,
        denuncia: formData.denuncia,
        denunciaFolha: formData.denunciaFolha,
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

      // Regrava toda a relação de partes numa única chamada atômica: o
      // servidor limpa as antigas e grava as novas dentro de uma transação
      // (evita ficar com a lista pela metade se algo falhar no meio).
      const partesPayload = participantes
        .filter(pt => pt.pessoaId > 0)
        .map(p => {
          const parte: any = {
            pessoaId: Number(p.pessoaId),
            tipo: p.tipo,
            intimado: p.intimado || false,
            statusMandado: p.statusMandado || 'PENDENTE',
            folhaIntimacao: p.folhaIntimacao || '',
            preso: p.preso || false,
            localPrisao: p.preso ? p.localPrisao || '' : '',
            observacoes: p.observacoes || ''
          };
          parte.advogados = p.advogados.map(a => ({
            advogadoId: Number(a.advogadoId),
            tipoRepresentacao: a.tipoRepresentacao || 'DEFESA'
          }));
          return parte;
        });
      await api.put(`/audiencias/${audienciaId}/participantes`, partesPayload);

      voltar();
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
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdicao ? 'Editar Audiência' : 'Nova Audiência'}
        </h1>
        <div className="flex gap-2">
          {pauta && (
            <button
              type="button"
              onClick={() => navigate(`/pautas/${pauta.id}`)}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-4 rounded"
              title="Abrir a pauta desta audiência"
            >
              Abrir Pauta
            </button>
          )}
          <button
            type="submit"
            form="form-audiencia"
            disabled={submitting}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={voltar}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded"
          >
            Voltar
          </button>
        </div>
      </div>

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

      <form id="form-audiencia" onSubmit={handleSubmit} className="space-y-6 mb-4">
        {/* Seção 1: Processo e horário */}
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Processo e Horário</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
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
            </div>
            <div>
              <label className={LABEL} htmlFor="hora">Hora de início*</label>
              <input className={INPUT} id="hora" name="hora" type="time"
                     value={formData.hora} onChange={handleChange} required />
            </div>
            <div className="relative autocomplete">
              <label className={LABEL} htmlFor="duracao">Duração (min)*</label>
              <div className="flex">
                <input
                  className={`${INPUT} rounded-r-none`}
                  id="duracao"
                  name="duracao"
                  type="text"
                  inputMode="numeric"
                  placeholder="60"
                  title="Escolha na lista ou digite os minutos"
                  value={formData.duracao}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="border border-l-0 rounded-r px-3 bg-gray-50 hover:bg-gray-100 text-gray-600"
                  onClick={() => setShowDuracaoDropdown(v => !v)}
                  aria-label="Escolher duração na lista"
                >
                  ▾
                </button>
              </div>
              {showDuracaoDropdown && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {DURACOES_SUGERIDAS.map(minutos => (
                    <div
                      key={minutos}
                      className={`px-3 py-1.5 cursor-pointer hover:bg-gray-100 text-sm ${
                        formData.duracao === String(minutos) ? 'bg-blue-50 font-semibold' : ''
                      }`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, duracao: String(minutos) }));
                        setShowDuracaoDropdown(false);
                      }}
                    >
                      {minutos} min{minutos >= 60 && <span className="text-gray-500"> ({descreverDuracao(minutos)})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
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
            <div className="col-span-2 flex items-end">
              <p className="text-gray-500 text-xs">
                Digite apenas os 20 números do processo. Se ele já teve audiência, o
                sistema oferece copiar os dados dela (útil nas continuações).
              </p>
            </div>
          </div>
        </fieldset>

        {/* Seção 2: Classificação */}
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Classificação</h2>
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
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Peças do Processo</h2>
          <p className="text-gray-500 text-sm mb-4">
            Marque as peças presentes e anote as folhas e o que mais for útil — elas saem na pauta em PDF.
          </p>
          <div className="space-y-3">
            {PECAS.map(({ flag, folha, rotulo }) => (
              <div key={flag} className="flex items-start gap-3">
                <label className="flex items-center text-gray-700 text-sm font-bold cursor-pointer w-72 shrink-0 pt-2">
                  <input
                    type="checkbox"
                    name={flag}
                    checked={formData[flag] as boolean}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {rotulo}
                </label>
                <div className="flex-1">
                  <textarea
                    className={`${INPUT} ${formData[flag] ? '' : 'bg-gray-100 text-gray-400'}`}
                    name={folha}
                    rows={formData[flag] ? 2 : 1}
                    placeholder={formData[flag] ? 'FOLHAS E ANOTAÇÕES (EX.: FLS. 30/35; ADITAMENTO ÀS FLS. 120)' : '—'}
                    maxLength={MAX_ANOTACAO_PECA}
                    value={formData[folha] as string}
                    onChange={handleChange}
                    disabled={!formData[flag]}
                  />
                  {formData[flag] && (formData[folha] as string).length > MAX_ANOTACAO_PECA * 0.8 && (
                    <p className="text-xs text-gray-500 text-right">
                      {(formData[folha] as string).length}/{MAX_ANOTACAO_PECA}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {/* Seção 4: Características e observações */}
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Características</h2>
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

        {/* Seção 5: Partes */}
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Partes {participantes.length > 0 && `(${participantes.length})`}
          </h2>

          {!participantes.some(p => PARTES_PRINCIPAIS.includes(p.tipo)) && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
              A audiência deve ter ao menos uma parte principal
              (Réu, Indiciado, Averiguado, Autor do Fato ou Querelado).
            </div>
          )}

          {/* Adicionar novo participante */}
          <div className="border border-blue-300 rounded p-4 mb-4 bg-blue-50">
            <h4 className="text-md font-semibold text-gray-700 mb-4">Adicionar Parte</h4>

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
                {pessoaFiltro.trim().length >= 3 && novoParticipante.pessoaId === 0
                  && pessoasFiltradas.length === 0 && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-sm text-yellow-900">
                    Nenhuma pessoa cadastrada com “{pessoaFiltro.trim()}”. Deseja cadastrá-la?
                    <button
                      type="button"
                      onClick={abrirCadastroPessoa}
                      className="ml-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-1 px-3 rounded"
                    >
                      Cadastrar pessoa
                    </button>
                  </div>
                )}
                {novoParticipante.pessoaId > 0 && contatosPessoa(novoParticipante.pessoaId).length > 0 && (
                  <p className="mt-1 text-sm text-blue-800">
                    {contatosPessoa(novoParticipante.pessoaId).join('   ')}
                  </p>
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

              <div className="md:col-span-2">
                <label className={LABEL}>Advogado(s)</label>
                <div className="space-y-3">
                  {linhasAdvogado.map(linha => (
                    <div key={linha.chave} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                      <CampoAdvogado
                        advogados={advogados}
                        advogadoId={linha.advogadoId}
                        autoFocus={linhasAdvogado.length > 1 && !linha.advogadoId}
                        onSelecionar={(advogadoId) => alterarLinhaAdvogado(linha.chave, { advogadoId })}
                        onCadastrar={(termo) => abrirCadastroAdvogado(termo,
                          (advogadoId) => alterarLinhaAdvogado(linha.chave, { advogadoId }))}
                      />
                      <div className="flex gap-2">
                        {linha.advogadoId && (
                          <select
                            className={INPUT}
                            value={linha.tipoRepresentacao}
                            onChange={(e) => alterarLinhaAdvogado(linha.chave, { tipoRepresentacao: e.target.value })}
                            title="Tipo de representação"
                          >
                            <option value="">Tipo de representação</option>
                            {TIPOS_REPRESENTACAO.map(([valor, rotulo]) => (
                              <option key={valor} value={valor}>{rotulo}</option>
                            ))}
                          </select>
                        )}
                        {linhasAdvogado.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLinhasAdvogado(prev => prev.filter(l => l.chave !== linha.chave))}
                            className="shrink-0 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold py-2 px-3 rounded"
                            title="Retirar este advogado"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setLinhasAdvogado(prev => [...prev, novaLinhaAdvogado()])}
                  className="mt-2 text-sm font-bold text-blue-800 hover:text-blue-900 hover:underline"
                >
                  + Adicionar advogado
                </button>
              </div>

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

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              {avisoParte && (
                <div
                  role="alert"
                  className={`flex-1 min-w-[16rem] px-4 py-2 rounded border text-sm font-semibold ${
                    avisoParte.tipo === 'sucesso'
                      ? 'bg-green-50 border-green-400 text-green-800'
                      : 'bg-red-50 border-red-400 text-red-800'
                  }`}
                >
                  {avisoParte.tipo === 'sucesso' ? '✔ ' : '⚠ '}{avisoParte.texto}
                </div>
              )}
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

          {/* Lista de partes adicionadas, na ordem de exibição (réu, vítima,
              testemunhas...) preservando o índice original para os handlers. */}
          {participantes
            .map((participante, index) => ({ participante, index }))
            .sort((a, b) => ordemExibicaoParte(a.participante.tipo) - ordemExibicaoParte(b.participante.tipo))
            .map(({ participante, index }) => (
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
                {participante.advogados.map(({ advogadoId, tipoRepresentacao }) => {
                  const advogado = advogados.find(a => a.id === advogadoId);
                  return (
                    <div key={advogadoId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        <strong>Advogado:</strong> {advogado?.nome || 'Advogado não encontrado'}
                        {advogado && ` - OAB: ${advogado.oab}`}
                      </span>
                      <select
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                        value={tipoRepresentacao}
                        onChange={(e) => alterarTipoRepresentacao(index, advogadoId, e.target.value)}
                        title="Tipo de representação"
                      >
                        <option value="">Tipo…</option>
                        {TIPOS_REPRESENTACAO.map(([valor, rotulo]) => (
                          <option key={valor} value={valor}>{rotulo}</option>
                        ))}
                        {/* Tipos gravados por versões anteriores continuam visíveis. */}
                        {tipoRepresentacao && !TIPOS_REPRESENTACAO.some(([v]) => v === tipoRepresentacao) && (
                          <option value={tipoRepresentacao}>{tipoRepresentacao}</option>
                        )}
                      </select>
                      {contatosDoAdvogado(advogado).length > 0 && (
                        <span className="text-blue-800">{contatosDoAdvogado(advogado).join('   ')}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => retirarAdvogadoDaParte(index, advogadoId)}
                        className="text-red-700 hover:text-red-900 text-xs font-bold"
                        title="Retirar este advogado da parte"
                      >
                        retirar
                      </button>
                    </div>
                  );
                })}
                {parteRecebendoAdvogado === index ? (
                  <div className="flex items-start gap-2 pt-1">
                    <div className="flex-1">
                      <CampoAdvogado
                        advogados={advogados}
                        autoFocus
                        onSelecionar={(advogadoId) => advogadoId && incluirAdvogadoNaParte(index, advogadoId)}
                        onCadastrar={(termo) => abrirCadastroAdvogado(termo,
                          (advogadoId) => incluirAdvogadoNaParte(index, advogadoId))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setParteRecebendoAdvogado(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-2 px-3 rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setParteRecebendoAdvogado(index)}
                    className="text-xs font-bold text-blue-800 hover:underline"
                  >
                    + Adicionar advogado
                  </button>
                )}
                {participante.observacoes && (
                  <p><strong>Observações:</strong> {participante.observacoes}</p>
                )}
              </div>
            </div>
          ))}
        </fieldset>

        {/* Seção 6: Agendamento no Teams (texto gerado automaticamente) */}
        <fieldset className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Agendamento Teams</h2>
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
            onClick={voltar}
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

      {/* Cadastros rápidos: ficam fora do <form> da audiência (formulários
          não podem ser aninhados). */}
      {cadastroPessoa && (
        <Modal titulo="Cadastrar Pessoa" onFechar={() => setCadastroPessoa(null)}>
          <PessoaCadastro
            valoresIniciais={cadastroPessoa}
            onSalvo={pessoaCadastrada}
            onCancelar={() => setCadastroPessoa(null)}
          />
        </Modal>
      )}
      {cadastroAdvogado && (
        <Modal titulo="Cadastrar Advogado" onFechar={() => setCadastroAdvogado(null)}>
          <AdvogadoCadastro
            valoresIniciais={cadastroAdvogado.valores}
            onSalvo={advogadoCadastrado}
            onCancelar={() => setCadastroAdvogado(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default FormAudiencia;
