import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { toUpper } from '../../utils/masks';

/**
 * Cadastro da pauta de audiências: o "dia de trabalho" de uma vara.
 *
 * A pauta define a data, a vara, o juiz e o promotor que valerão para
 * todas as audiências nela cadastradas (vínculo rígido — exceções são
 * anotadas nas observações). Aceita data e vara pré-preenchidas pela
 * URL (vindas do calendário ou da tela de horários livres).
 */

interface Vara { id: number; nome: string; }
interface Juiz { id: number; nome: string; }
interface Promotor { id: number; nome: string; }

interface PautaFormDados {
  data: string;
  varaId: number;
  juizId: number;
  promotorId: number;
  observacoes: string;
}

const PautaForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = !!id;

  const [formData, setFormData] = useState<PautaFormDados>({
    data: '',
    varaId: 0,
    juizId: 0,
    promotorId: 0,
    observacoes: ''
  });
  const [varas, setVaras] = useState<Vara[]>([]);
  const [juizes, setJuizes] = useState<Juiz[]>([]);
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        const [varasRes, juizesRes, promotoresRes] = await Promise.all([
          api.get<Vara[]>('/varas'),
          api.get<Juiz[]>('/juizes'),
          api.get<Promotor[]>('/promotores')
        ]);
        setVaras(varasRes.data);
        setJuizes(juizesRes.data);
        setPromotores(promotoresRes.data);

        if (isEdicao) {
          const pauta = (await api.get(`/pautas/${id}`)).data;
          setFormData({
            data: pauta.data,
            varaId: pauta.vara?.id || 0,
            juizId: pauta.juiz?.id || 0,
            promotorId: pauta.promotor?.id || 0,
            observacoes: pauta.observacoes || ''
          });
        } else {
          // Pré-preenchimento vindo do calendário/horários livres.
          const params = new URLSearchParams(location.search);
          const data = params.get('data');
          const varaId = params.get('varaId');
          if (data || varaId) {
            setFormData(prev => ({
              ...prev,
              data: data || prev.data,
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'observacoes' ? toUpper(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        data: formData.data,
        varaId: Number(formData.varaId),
        juizId: Number(formData.juizId),
        promotorId: Number(formData.promotorId),
        observacoes: formData.observacoes
      };

      if (isEdicao) {
        await api.put(`/pautas/${id}`, payload);
        navigate(`/pautas/${id}`);
      } else {
        const response = await api.post('/pautas', payload);
        // Segue direto para a pauta criada, onde as audiências são incluídas.
        navigate(`/pautas/${response.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar pauta. Por favor, tente novamente.');
      console.error('Erro ao salvar pauta:', err);
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

  const INPUT = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
  const LABEL = 'block text-gray-700 text-sm font-bold mb-2';

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {isEdicao ? 'Editar Pauta' : 'Nova Pauta'}
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        A pauta reúne as audiências de um dia em uma vara, com o mesmo juiz e promotor.
        Todas as audiências cadastradas nela herdarão esses dados automaticamente.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LABEL} htmlFor="data">Data*</label>
            <input className={INPUT} id="data" name="data" type="date"
                   value={formData.data} onChange={handleChange} required />
          </div>
          <div>
            <label className={LABEL} htmlFor="varaId">Vara*</label>
            <select className={INPUT} id="varaId" name="varaId"
                    value={formData.varaId} onChange={handleChange} required>
              <option value="">Selecione uma vara</option>
              {varas.map(vara => (
                <option key={vara.id} value={vara.id}>{vara.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="juizId">Juiz*</label>
            <select className={INPUT} id="juizId" name="juizId"
                    value={formData.juizId} onChange={handleChange} required>
              <option value="">Selecione um juiz</option>
              {juizes.map(juiz => (
                <option key={juiz.id} value={juiz.id}>{juiz.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="promotorId">Promotor*</label>
            <select className={INPUT} id="promotorId" name="promotorId"
                    value={formData.promotorId} onChange={handleChange} required>
              <option value="">Selecione um promotor</option>
              {promotores.map(promotor => (
                <option key={promotor.id} value={promotor.id}>{promotor.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 mb-6">
          <label className={LABEL} htmlFor="observacoes">Observações</label>
          <textarea
            className={INPUT}
            id="observacoes"
            name="observacoes"
            rows={3}
            maxLength={500}
            placeholder="ANOTAÇÕES DA PAUTA (EX.: JUIZ SUBSTITUTO NA AUDIÊNCIA DAS 15H)"
            value={formData.observacoes}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate(isEdicao ? `/pautas/${id}` : '/pautas')}
          >
            Cancelar
          </button>
          <button
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : isEdicao ? 'Salvar' : 'Criar Pauta'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PautaForm;
