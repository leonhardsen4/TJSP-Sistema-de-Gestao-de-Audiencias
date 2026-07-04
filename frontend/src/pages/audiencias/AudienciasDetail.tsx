import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Calendar, Clock, MapPin, User, FileText, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import api from '../../services/api';
import { rotuloTipoParticipacao, ordemExibicaoParte } from '../../utils/participacao';
import { rotuloStatus, rotuloTipo, rotuloCompetencia } from './AudienciasList';

interface Audiencia {
  id: number;
  pautaId?: number;
  numeroProcesso: string;
  dataAudiencia: string;
  horarioInicio: string;
  duracao: number;
  tipoAudiencia: string;
  formato: string;
  competencia: string;
  status: string;
  artigo?: string;
  observacoes?: string;
  reuPreso: boolean;
  agendamentoTeams: boolean;
  reconhecimento: boolean;
  depoimentoEspecial: boolean;
  denuncia?: boolean;
  denunciaFolha?: string;
  defesaPrevia?: boolean;
  defesaPreviaFolha?: string;
  faCdc?: boolean;
  faCdcFolha?: string;
  laudo?: boolean;
  laudoFolha?: string;
  vara?: {
    id: number;
    nome: string;
    numero: string;
  };
  juiz?: {
    id: number;
    nome: string;
  };
  promotor?: {
    id: number;
    nome: string;
  };
}

interface Participante {
  id: number;
  pessoa: {
    id: number;
    nome: string;
  };
  tipo: string;
  intimado: boolean;
  statusMandado?: string;
  folhaIntimacao?: string;
  preso?: boolean;
  localPrisao?: string;
  observacoes?: string;
  representacao?: {
    tipo: string;
    advogado: { id: number; nome: string; oab: string };
  } | null;
}

/** Rótulo e cor da situação do mandado de intimação. */
const statusMandadoInfo: Record<string, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: 'Mandado pendente', classe: 'bg-yellow-100 text-yellow-800' },
  POSITIVO: { rotulo: 'Mandado positivo', classe: 'bg-green-100 text-green-800' },
  NEGATIVO: { rotulo: 'Mandado negativo', classe: 'bg-red-100 text-red-800' },
  DISPENSADO: { rotulo: 'Mandado dispensado', classe: 'bg-gray-100 text-gray-700' }
};

const AudienciasDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Volta para a tela anterior (a lista de audiências, o calendário ou a
   * pauta de onde se veio), preservando os filtros já aplicados. Se a tela
   * foi aberta por link direto (sem histórico), cai na lista de audiências.
   */
  const voltar = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/audiencias');
  };
  const [audiencia, setAudiencia] = useState<Audiencia | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudiencia = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/audiencias/${id}`);
        setAudiencia(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    const fetchParticipantes = async () => {
      try {
        const response = await api.get(`/audiencias/${id}/participantes`);
        setParticipantes(response.data || []);
      } catch (err) {
        // Silenciosamente define array vazio se não conseguir carregar participantes
        setParticipantes([]);
      }
    };

    if (id) {
      fetchAudiencia();
      fetchParticipantes();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!audiencia || !window.confirm('Tem certeza que deseja excluir esta audiência?')) {
      return;
    }

    try {
      await api.delete(`/audiencias/${audiencia.id}`);
      navigate('/audiencias');
    } catch (err) {
      setError('Erro ao excluir audiência. Por favor, tente novamente.');
      console.error('Erro ao excluir audiência:', err);
    }
  };

  const formatarData = (data: string) => {
    // Evita problemas de timezone ao tratar a data como local
    const [year, month, day] = data.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-blue-100 text-blue-800';
      case 'REALIZADA':
        return 'bg-green-100 text-green-800';
      case 'NAO_REALIZADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoParticipacaoLabel = rotuloTipoParticipacao;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  if (!audiencia) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        Audiência não encontrada.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detalhes da Audiência</h1>
              <p className="text-2xl font-bold text-blue-900 mt-1 tracking-wide">
                {audiencia.numeroProcesso}
              </p>
            </div>
            <div className="flex space-x-2">
              {audiencia.pautaId && (
                <Link
                  to={`/pautas/${audiencia.pautaId}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Abrir Pauta
                </Link>
              )}
              <Link
                to={`/audiencias/editar/${audiencia.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Editar
              </Link>

              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Excluir
              </button>
              <button
                onClick={voltar}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Data:</span>
                <span>{formatarData(audiencia.dataAudiencia)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Horário:</span>
                <span>{audiencia.horarioInicio}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Duração:</span>
                <span>{audiencia.duracao} minutos</span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Formato:</span>
                <span>{audiencia.formato}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium">Status:</span>
                <Badge className={getStatusBadgeClass(audiencia.status)}>
                  {rotuloStatus[audiencia.status] || audiencia.status}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Vara:</span>
                <span>{audiencia.vara?.nome || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Juiz:</span>
                <span>{audiencia.juiz?.nome || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Promotor:</span>
                <span>{audiencia.promotor?.nome || 'Não informado'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-medium">Tipo:</span>
                <span>{rotuloTipo[audiencia.tipoAudiencia] || audiencia.tipoAudiencia}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-medium">Competência:</span>
                <span>{rotuloCompetencia[audiencia.competencia] || audiencia.competencia}</span>
              </div>

              {audiencia.artigo && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Artigo:</span>
                  <span>{audiencia.artigo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Marcadores da audiência: réu preso, depoimento especial, etc. */}
          {(audiencia.reuPreso || audiencia.depoimentoEspecial
            || audiencia.reconhecimento || audiencia.agendamentoTeams) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {audiencia.reuPreso && (
                <span className="inline-flex items-center rounded-full text-sm font-semibold px-3 py-1 bg-red-600 text-white">RÉU PRESO</span>
              )}
              {audiencia.depoimentoEspecial && (
                <span className="inline-flex items-center rounded-full text-sm font-semibold px-3 py-1 bg-purple-700 text-white">DEPOIMENTO ESPECIAL</span>
              )}
              {audiencia.reconhecimento && (
                <span className="inline-flex items-center rounded-full text-sm font-semibold px-3 py-1 bg-amber-500 text-white">RECONHECIMENTO</span>
              )}
              {audiencia.agendamentoTeams && (
                <span className="inline-flex items-center rounded-full text-sm font-semibold px-3 py-1 bg-cyan-700 text-white">AGENDAMENTO TEAMS</span>
              )}
            </div>
          )}

          {/* Peças processuais juntadas (com a folha, quando informada) */}
          {(audiencia.denuncia || audiencia.defesaPrevia || audiencia.faCdc || audiencia.laudo) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Peças</h3>
              <div className="flex flex-wrap gap-2">
                {audiencia.denuncia && (
                  <Badge className="bg-slate-100 text-slate-800 text-sm">
                    Denúncia{audiencia.denunciaFolha ? ` (fls. ${audiencia.denunciaFolha})` : ''}
                  </Badge>
                )}
                {audiencia.defesaPrevia && (
                  <Badge className="bg-slate-100 text-slate-800 text-sm">
                    Defesa prévia{audiencia.defesaPreviaFolha ? ` (fls. ${audiencia.defesaPreviaFolha})` : ''}
                  </Badge>
                )}
                {audiencia.faCdc && (
                  <Badge className="bg-slate-100 text-slate-800 text-sm">
                    FA/CDC{audiencia.faCdcFolha ? ` (fls. ${audiencia.faCdcFolha})` : ''}
                  </Badge>
                )}
                {audiencia.laudo && (
                  <Badge className="bg-slate-100 text-slate-800 text-sm">
                    Laudo{audiencia.laudoFolha ? ` (fls. ${audiencia.laudoFolha})` : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Partes da audiência (réus, vítimas, testemunhas...) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Partes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participantes.length > 0 ? (
                <div className="space-y-3">
                  {[...participantes]
                    .sort((a, b) => ordemExibicaoParte(a.tipo) - ordemExibicaoParte(b.tipo))
                    .map((participante) => (
                    <div key={participante.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="font-medium">{participante.pessoa.nome}</span>
                          <div className="text-sm text-gray-600">
                            {getTipoParticipacaoLabel(participante.tipo)}
                            {participante.representacao?.advogado && (
                              <span> · Adv.: {participante.representacao.advogado.nome} (OAB {participante.representacao.advogado.oab})</span>
                            )}
                          </div>
                          {participante.folhaIntimacao && (
                            <div className="text-xs text-gray-500">Intimação às {participante.folhaIntimacao}</div>
                          )}
                          {participante.preso && (
                            <div className="text-xs text-red-700 font-medium">
                              Preso{participante.localPrisao ? ` — ${participante.localPrisao}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {participante.preso && (
                          <span className="inline-flex items-center rounded-full text-xs font-semibold px-2 py-0.5 bg-red-600 text-white">Preso</span>
                        )}
                        {participante.intimado ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Intimado
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            Não intimado
                          </Badge>
                        )}
                        {participante.statusMandado && statusMandadoInfo[participante.statusMandado] && (
                          <Badge className={`${statusMandadoInfo[participante.statusMandado].classe} text-xs`}>
                            {statusMandadoInfo[participante.statusMandado].rotulo}
                          </Badge>
                        )}
                        {participante.observacoes && (
                          <span className="text-xs text-gray-500" title={participante.observacoes}>
                            📝
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma parte cadastrada para esta audiência.
                </p>
              )}
            </CardContent>
          </Card>

          {audiencia.observacoes && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Observações</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{audiencia.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudienciasDetail;
