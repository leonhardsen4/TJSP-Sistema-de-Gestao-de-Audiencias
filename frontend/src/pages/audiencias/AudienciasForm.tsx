import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

interface Vara {
  id: number;
  nome: string;
}

interface Juiz {
  id: number;
  nome: string;
}

interface Promotor {
  id: number;
  nome: string;
}

interface Pessoa {
  id: number;
  nome: string;
  cpf: string;
  email: string;
}

interface Advogado {
  id: number;
  nome: string;
  oab: string;
}

interface ParticipanteForm {
  pessoaId: number;
  tipo: string;
  intimado: boolean;
  observacoes: string;
  advogadoId?: number;
  tipoRepresentacao?: string;
}

interface AudienciaForm {
  data: string;
  hora: string;
  duracao: number;
  status: string;
  tipoAudiencia: string;
  competencia: string;
  formato: string;
  varaId: number;
  juizId: number;
  promotorId: number;
  processo: string;
  sala: string;
  observacoes: string;
  reuPreso: boolean;
  agendamentoTeams: boolean;
  reconhecimento: boolean;
  depoimentoEspecial: boolean;
}

const FormAudiencia: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = !!id;

  const [formData, setFormData] = useState<AudienciaForm>({
    data: '',
    hora: '',
    duracao: 60,
    status: 'DESIGNADA',
    tipoAudiencia: '',
    competencia: '',
    formato: '',
    varaId: 0,
    juizId: 0,
    promotorId: 0,
    processo: '',
    sala: '',
    observacoes: '',
    reuPreso: false,
    agendamentoTeams: false,
    reconhecimento: false,
    depoimentoEspecial: false
  });

  const [varas, setVaras] = useState<Vara[]>([]);
  const [juizes, setJuizes] = useState<Juiz[]>([]);
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([]);
  const [novoParticipante, setNovoParticipante] = useState<ParticipanteForm>({
    pessoaId: 0,
    tipo: 'AUTOR',
    intimado: false,
    observacoes: '',
    advogadoId: undefined,
    tipoRepresentacao: undefined
  });
  const [pessoaFiltro, setPessoaFiltro] = useState('');
  const [pessoasFiltradas, setPessoasFiltradas] = useState<Pessoa[]>([]);
  const [showPessoaDropdown, setShowPessoaDropdown] = useState(false);
  const [advogadoFiltro, setAdvogadoFiltro] = useState('');
  const [advogadosFiltrados, setAdvogadosFiltrados] = useState<Advogado[]>([]);
  const [showAdvogadoDropdown, setShowAdvogadoDropdown] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        
        // Carregar listas de varas, juízes, promotores, pessoas e advogados
        const [varasRes, juizesRes, promotoresRes, pessoasRes, advogadosRes] = await Promise.all([
          api.get<Vara[]>('/varas'),
          api.get<Juiz[]>('/juizes'),
          api.get<Promotor[]>('/promotores'),
          api.get<Pessoa[]>('/pessoas'),
          api.get<Advogado[]>('/advogados')
        ]);
        
        setVaras(varasRes.data);
        setJuizes(juizesRes.data);
        setPromotores(promotoresRes.data);
        setPessoas(pessoasRes.data);
        setAdvogados(advogadosRes.data);
        
        // Se for edição, carregar dados da audiência
        if (isEdicao) {
          const audienciaRes = await api.get(`/audiencias/${id}`);
          const audiencia = audienciaRes.data;
          
          setFormData({
            data: audiencia.dataAudiencia, // Campo correto do backend
            hora: audiencia.horarioInicio, // Campo correto do backend
            duracao: audiencia.duracao || 60, // Adicionado campo faltante
            status: audiencia.status,
            tipoAudiencia: audiencia.tipoAudiencia || '',
            competencia: audiencia.competencia || '',
            formato: audiencia.formato || '',
            varaId: audiencia.vara?.id || 0,
            juizId: audiencia.juiz?.id || 0,
            promotorId: audiencia.promotor?.id || 0,
            processo: audiencia.numeroProcesso,
            sala: audiencia.vara?.nome || '', // Usando nome da vara como sala temporariamente
            observacoes: audiencia.observacoes || '',
            reuPreso: audiencia.reuPreso || false,
            agendamentoTeams: audiencia.agendamentoTeams || false,
            reconhecimento: audiencia.reconhecimento || false,
            depoimentoEspecial: audiencia.depoimentoEspecial || false
          });
          
          // Carregar participantes da audiência
          try {
            const participantesRes = await api.get(`/audiencias/${id}/participantes`);
            const participantesData = (participantesRes.data || []).map((p: any) => ({
              pessoaId: p.pessoa.id,
              tipo: p.tipo,
              intimado: p.intimado,
              observacoes: p.observacoes || '',
              advogadoId: p.representacao?.advogado?.id || undefined,
              tipoRepresentacao: p.representacao?.tipo || undefined
            }));
            setParticipantes(participantesData);
          } catch (participantesErr) {
            console.log('Nenhum participante encontrado para esta audiência');
            setParticipantes([]);
          }
        } else {
          // Se não for edição, verificar se há parâmetros da URL vindos de Horários Livres
          const searchParams = new URLSearchParams(location.search);
          const data = searchParams.get('data');
          const hora = searchParams.get('hora');
          const duracao = searchParams.get('duracao');
          const varaId = searchParams.get('varaId');
          
          if (data || hora || duracao || varaId) {
            setFormData(prev => ({
              ...prev,
              data: data || prev.data,
              hora: hora || prev.hora,
              duracao: duracao ? parseInt(duracao) : prev.duracao,
              varaId: varaId ? parseInt(varaId) : prev.varaId
            }));
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
  }, [id, isEdicao, location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const adicionarParticipante = () => {
    if (novoParticipante.pessoaId === 0) {
      alert('Por favor, selecione uma pessoa válida.');
      return;
    }

    const pessoaSelecionada = pessoas.find(p => p.id === novoParticipante.pessoaId);
    if (!pessoaSelecionada) {
      alert('Pessoa não encontrada.');
      return;
    }

    // Verificar se a pessoa já foi adicionada
    if (participantes.some(p => p.pessoaId === novoParticipante.pessoaId)) {
      alert('Esta pessoa já foi adicionada como participante.');
      return;
    }

    const novoParticipanteCompleto = {
      ...novoParticipante,
      pessoa: pessoaSelecionada,
      advogado: novoParticipante.advogadoId ? advogados.find(a => a.id === novoParticipante.advogadoId) : undefined
    };

    setParticipantes([...participantes, novoParticipanteCompleto]);
    
    // Resetar o formulário
    setNovoParticipante({
      pessoaId: 0,
      tipo: 'AUTOR',
      intimado: false,
      observacoes: '',
      advogadoId: undefined,
      tipoRepresentacao: undefined
    });
    setPessoaFiltro('');
    setShowPessoaDropdown(false);
    setAdvogadoFiltro('');
    setShowAdvogadoDropdown(false);
  };

  useEffect(() => {
    const filtered = pessoas.filter(pessoa =>
      pessoa.nome.toLowerCase().includes(pessoaFiltro.toLowerCase()) ||
      pessoa.cpf.includes(pessoaFiltro)
    );
    setPessoasFiltradas(filtered);
  }, [pessoas, pessoaFiltro]);

  useEffect(() => {
    const filtered = advogados.filter(advogado =>
      advogado.nome.toLowerCase().includes(advogadoFiltro.toLowerCase()) ||
      advogado.oab.toLowerCase().includes(advogadoFiltro.toLowerCase())
    );
    setAdvogadosFiltrados(filtered);
  }, [advogados, advogadoFiltro]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowPessoaDropdown(false);
        setShowAdvogadoDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePessoaFiltroChange = (value: string) => {
    setPessoaFiltro(value);
    setShowPessoaDropdown(true);
    
    // Se o valor corresponde exatamente a uma pessoa, seleciona automaticamente
    const pessoaExata = pessoas.find(p => 
      p.nome.toLowerCase() === value.toLowerCase() || p.cpf === value
    );
    if (pessoaExata) {
      setNovoParticipante(prev => ({ ...prev, pessoaId: pessoaExata.id }));
    } else {
      setNovoParticipante(prev => ({ ...prev, pessoaId: 0 }));
    }
  };

  const handleAdvogadoFiltroChange = (value: string) => {
    setAdvogadoFiltro(value);
    setShowAdvogadoDropdown(true);
    
    // Se o valor corresponde exatamente a um advogado, seleciona automaticamente
    const advogadoExato = advogados.find(a => 
      a.nome.toLowerCase() === value.toLowerCase() || a.oab.toLowerCase() === value.toLowerCase()
    );
    if (advogadoExato) {
      setNovoParticipante(prev => ({ ...prev, advogadoId: advogadoExato.id }));
    } else if (value === '') {
      setNovoParticipante(prev => ({ ...prev, advogadoId: undefined }));
    }
  };

  const handlePessoaSelect = (pessoa: Pessoa) => {
    setPessoaFiltro(`${pessoa.nome} - ${pessoa.cpf}`);
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

  const removerParticipante = (index: number) => {
    setParticipantes(prev => prev.filter((_, i) => i !== index));
  };

  const handleParticipanteChange = (index: number, field: keyof ParticipanteForm, value: any) => {
    setParticipantes(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Validação dos campos obrigatórios
      if (!formData.varaId || formData.varaId === 0) {
        setError('Por favor, selecione uma vara.');
        setSubmitting(false);
        return;
      }
      
      if (!formData.juizId || formData.juizId === 0) {
        setError('Por favor, selecione um juiz.');
        setSubmitting(false);
        return;
      }
      
      if (!formData.promotorId || formData.promotorId === 0) {
        setError('Por favor, selecione um promotor.');
        setSubmitting(false);
        return;
      }

      // Verificar conflitos de horário antes de salvar
      if (formData.data && formData.hora && formData.duracao && formData.varaId) {
        const conflitosResponse = await fetch(
          `/api/audiencias/verificar-conflitos?data=${formData.data}&horarioInicio=${formData.hora}&duracao=${formData.duracao}&varaId=${formData.varaId}${id ? `&audienciaId=${id}` : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (conflitosResponse.ok) {
          const conflitosData = await conflitosResponse.json();
          
          if (conflitosData.temConflito) {
            const conflitosTexto = conflitosData.conflitos
              .map((c: any) => `Processo ${c.numeroProcesso} (${c.horarioInicio} - ${c.horarioFim})`)
              .join('\n');
            
            const confirmar = window.confirm(
              `ATENÇÃO: Foram detectados conflitos de horário:\n\n${conflitosTexto}\n\nDeseja continuar mesmo assim?`
            );
            
            if (!confirmar) {
              setSubmitting(false);
              return;
            }
          }
        }
      }
      
      const payload = {
        numeroProcesso: formData.processo,
        dataAudiencia: formData.data,
        horarioInicio: formData.hora,
        duracao: formData.duracao, // Usar o valor do formulário
        status: formData.status,
        tipoAudiencia: formData.tipoAudiencia,
        competencia: formData.competencia,
        formato: formData.formato,
        observacoes: formData.observacoes,
        reuPreso: formData.reuPreso,
        agendamentoTeams: formData.agendamentoTeams,
        reconhecimento: formData.reconhecimento,
        depoimentoEspecial: formData.depoimentoEspecial,
        varaId: Number(formData.varaId),
        juizId: Number(formData.juizId),
        promotorId: Number(formData.promotorId)
      };
      
      let audienciaId: string;
      
      if (isEdicao) {
        await api.put(`/audiencias/${id}`, payload);
        audienciaId = id!;
      } else {
        const response = await api.post('/audiencias', payload);
        audienciaId = response.data.id;
      }
      
      // Salvar participantes
      if (participantes.length > 0) {
        const participantesPayload = participantes
          .filter(p => p.pessoaId > 0)
          .map(p => {
            const payload: any = {
              pessoaId: Number(p.pessoaId),
              tipo: p.tipo,
              intimado: p.intimado || false,
              observacoes: p.observacoes || ''
            };
            
            // Adicionar advogado e tipo de representação apenas se especificados
            if (p.advogadoId && p.advogadoId > 0) {
              payload.advogadoId = Number(p.advogadoId);
              payload.tipoRepresentacao = p.tipoRepresentacao || 'DEFESA';
            }
            
            return payload;
          });
        
        if (isEdicao) {
          // Remover participantes existentes e adicionar novos
          await api.delete(`/audiencias/${audienciaId}/participantes`);
        }
        
        for (const participante of participantesPayload) {
          await api.post(`/audiencias/${audienciaId}/participantes`, participante);
        }
      }
      
      navigate('/audiencias');
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdicao ? 'Editar Audiência' : 'Nova Audiência'}
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="processo">
              Número do Processo*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="processo"
              name="processo"
              type="text"
              placeholder="0000000-00.0000.0.00.0000"
              value={formData.processo}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data">
              Data*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="data"
              name="data"
              type="date"
              value={formData.data}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hora">
              Hora*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="hora"
              name="hora"
              type="time"
              value={formData.hora}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duracao">
              Duração (minutos)*
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="duracao"
              name="duracao"
              type="number"
              min="15"
              max="480"
              step="15"
              placeholder="60"
              value={formData.duracao}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sala">
              Sala
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="sala"
              name="sala"
              type="text"
              placeholder="Sala de Audiência"
              value={formData.sala}
              onChange={handleChange}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tipoAudiencia">
              Tipo de Audiência*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="tipoAudiencia"
              name="tipoAudiencia"
              value={formData.tipoAudiencia}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o tipo</option>
              <option value="INSTRUCAO_DEBATES_JULGAMENTO">Instrução, Debates e Julgamento</option>
              <option value="APRESENTACAO">Apresentação</option>
              <option value="JUSTIFICACAO">Justificação</option>
              <option value="SUSPENSAO_CONDICIONAL_PROCESSO">Suspensão Condicional do Processo</option>
              <option value="ACORDO_NAO_PERSECUCAO_PENAL">Acordo de Não Persecução Penal</option>
              <option value="JURI">Júri</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="formato">
              Formato*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="formato"
              name="formato"
              value={formData.formato}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o formato</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="HIBRIDA">Híbrida</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="competencia">
              Competência*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="competencia"
              name="competencia"
              value={formData.competencia}
              onChange={handleChange}
              required
            >
              <option value="">Selecione a competência</option>
              <option value="CRIMINAL">Criminal</option>
              <option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option>
              <option value="INFANCIA_JUVENTUDE">Infância e Juventude</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Status*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="DESIGNADA">Designada</option>
              <option value="REALIZADA">Realizada</option>
              <option value="PARCIALMENTE_REALIZADA">Parcialmente Realizada</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="REDESIGNADA">Redesignada</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="varaId">
              Vara*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="varaId"
              name="varaId"
              value={formData.varaId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione uma vara</option>
              {varas.map(vara => (
                <option key={vara.id} value={vara.id}>{vara.nome}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="juizId">
              Juiz*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="juizId"
              name="juizId"
              value={formData.juizId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um juiz</option>
              {juizes.map(juiz => (
                <option key={juiz.id} value={juiz.id}>{juiz.nome}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="promotorId">
              Promotor*
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="promotorId"
              name="promotorId"
              value={formData.promotorId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um promotor</option>
              {promotores.map(promotor => (
                <option key={promotor.id} value={promotor.id}>{promotor.nome}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="observacoes">
            Observações
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="observacoes"
            name="observacoes"
            rows={4}
            placeholder="Observações sobre a audiência"
            value={formData.observacoes}
            onChange={handleChange}
          />
        </div>

        {/* Campos Boolean */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Características da Audiência</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reuPreso"
                name="reuPreso"
                checked={formData.reuPreso}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="reuPreso" className="text-gray-700 text-sm font-bold">
                Réu Preso
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="agendamentoTeams"
                name="agendamentoTeams"
                checked={formData.agendamentoTeams}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="agendamentoTeams" className="text-gray-700 text-sm font-bold">
                Agendamento Teams
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="reconhecimento"
                name="reconhecimento"
                checked={formData.reconhecimento}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="reconhecimento" className="text-gray-700 text-sm font-bold">
                Reconhecimento
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="depoimentoEspecial"
                name="depoimentoEspecial"
                checked={formData.depoimentoEspecial}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="depoimentoEspecial" className="text-gray-700 text-sm font-bold">
                Depoimento Especial
              </label>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Participantes</h3>
          </div>
          
          {/* Formulário para adicionar novo participante */}
          <div className="border border-blue-300 rounded p-4 mb-4 bg-blue-50">
            <h4 className="text-md font-semibold text-gray-700 mb-4">Adicionar Novo Participante</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Pessoa*
                </label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Digite o nome ou CPF da pessoa..."
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
                        <div className="text-sm text-gray-600">{pessoa.cpf}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Tipo*
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={novoParticipante.tipo}
                  onChange={(e) => handleNovoParticipanteChange('tipo', e.target.value)}
                >
                  <option value="AUTOR">Autor</option>
                  <option value="REU">Réu</option>
                  <option value="VITIMA">Vítima</option>
                  <option value="VITIMA_FATAL">Vítima Fatal</option>
                  <option value="REPRESENTANTE_LEGAL">Representante Legal</option>
                  <option value="TESTEMUNHA_COMUM">Testemunha Comum</option>
                  <option value="TESTEMUNHA_ACUSACAO">Testemunha de Acusação</option>
                  <option value="TESTEMUNHA_DEFESA">Testemunha de Defesa</option>
                  <option value="ASSISTENTE_ACUSACAO">Assistente de Acusação</option>
                  <option value="PERITO">Perito</option>
                  <option value="TERCEIRO">Terceiro</option>
                </select>
              </div>
              
              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Advogado
                </label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Digite o nome ou OAB do advogado..."
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
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Tipo de Representação
                  </label>
                  <select
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="novo-intimado"
                  checked={novoParticipante.intimado}
                  onChange={(e) => handleNovoParticipanteChange('intimado', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="novo-intimado" className="text-gray-700 text-sm font-bold">
                  Intimado
                </label>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Observações
              </label>
              <textarea
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={2}
                placeholder="Observações sobre o participante"
                value={novoParticipante.observacoes}
                onChange={(e) => handleNovoParticipanteChange('observacoes', e.target.value)}
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
          {participantes.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-4">Participantes Adicionados ({participantes.length})</h4>
              {participantes.map((participante, index) => (
                <div key={index} className="border border-gray-300 rounded p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-semibold text-gray-700">
                      {pessoas.find(p => p.id === participante.pessoaId)?.nome || 'Pessoa não encontrada'} - {participante.tipo}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removerParticipante(index)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline text-xs"
                    >
                      Remover
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>CPF:</strong> {pessoas.find(p => p.id === participante.pessoaId)?.cpf}</p>
                    {participante.advogadoId && (
                      <p><strong>Advogado:</strong> {advogados.find(a => a.id === participante.advogadoId)?.nome} - OAB: {advogados.find(a => a.id === participante.advogadoId)?.oab}</p>
                    )}
                    {participante.tipoRepresentacao && (
                      <p><strong>Tipo de Representação:</strong> {participante.tipoRepresentacao}</p>
                    )}
                    <p><strong>Intimado:</strong> {participante.intimado ? 'Sim' : 'Não'}</p>
                    {participante.observacoes && (
                      <p><strong>Observações:</strong> {participante.observacoes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate('/audiencias')}
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