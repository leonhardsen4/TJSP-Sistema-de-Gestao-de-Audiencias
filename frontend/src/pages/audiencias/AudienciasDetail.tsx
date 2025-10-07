import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Calendar, Clock, MapPin, User, FileText, AlertCircle, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import api from '../../services/api';

interface Audiencia {
  id: number;
  numeroProcesso: string;
  dataAudiencia: string;
  horarioInicio: string;
  duracao: number;
  tipoAudiencia: string;
  formato: string;
  competencia: string;
  status: string;
  observacoes?: string;
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
  observacoes?: string;
}

const AudienciasDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      case 'DESIGNADA':
        return 'bg-blue-100 text-blue-800';
      case 'REALIZADA':
        return 'bg-green-100 text-green-800';
      case 'PARCIALMENTE_REALIZADA':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      case 'REDESIGNADA':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoParticipacaoLabel = (tipo: string) => {
    switch (tipo) {
      case 'REU':
        return 'Réu';
      case 'VITIMA':
        return 'Vítima';
      case 'VITIMA_FATAL':
        return 'Vítima Fatal';
      case 'REPRESENTANTE_LEGAL':
        return 'Representante Legal';
      case 'TESTEMUNHA_COMUM':
        return 'Testemunha Comum';
      case 'TESTEMUNHA_ACUSACAO':
        return 'Testemunha de Acusação';
      case 'TESTEMUNHA_DEFESA':
        return 'Testemunha de Defesa';
      case 'ASSISTENTE_ACUSACAO':
        return 'Assistente de Acusação';
      case 'PERITO':
        return 'Perito';
      case 'TERCEIRO':
        return 'Terceiro';
      default:
        return tipo;
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Detalhes da Audiência</h1>
            <div className="flex space-x-2">
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
              <Link
                to="/audiencias"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Processo:</span>
                <span>{audiencia.numeroProcesso}</span>
              </div>
              
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
                  {audiencia.status}
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
                <span>{audiencia.tipoAudiencia}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-medium">Competência:</span>
                <span>{audiencia.competencia}</span>
              </div>
            </div>
          </div>

          {/* Participantes Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Participantes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participantes.length > 0 ? (
                <div className="space-y-3">
                  {participantes.map((participante) => (
                    <div key={participante.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="font-medium">{participante.pessoa.nome}</span>
                          <div className="text-sm text-gray-600">
                            {getTipoParticipacaoLabel(participante.tipo)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {participante.intimado && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Intimado
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
                  Nenhum participante cadastrado para esta audiência.
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
