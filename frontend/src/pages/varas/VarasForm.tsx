import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { maskTelefone, toUpper } from '../../utils/masks';

/**
 * Cadastro de vara: nome obrigatório; comarca, endereço, telefone e
 * e-mail opcionais. Os textos vão para MAIÚSCULAS ao digitar.
 */

interface VaraForm {
  nome: string;
  comarca: string;
  endereco: string;
  telefone: string;
  email: string;
  /** Cor das pautas desta vara no calendário (hex). */
  cor: string;
}

const VarasForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdicao = !!id;

  const [formData, setFormData] = useState<VaraForm>({
    nome: '',
    comarca: '',
    endereco: '',
    telefone: '',
    email: '',
    cor: '#4F46E5'
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVara = async () => {
      if (!isEdicao) return;
      try {
        setLoading(true);
        const v = (await api.get(`/varas/${id}`)).data;
        setFormData({
          nome: v.nome || '',
          comarca: v.comarca || '',
          endereco: v.endereco || '',
          telefone: v.telefone || '',
          email: v.email || '',
          cor: v.cor || '#4F46E5'
        });
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados da vara. Por favor, tente novamente.');
        console.error('Erro ao buscar vara:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVara();
  }, [id, isEdicao]);

  /** Aplica a máscara/transformação adequada a cada campo enquanto digita. */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let valor = value;
    if (name === 'telefone') {
      valor = maskTelefone(value);
    } else if (name !== 'email' && name !== 'cor') {
      valor = toUpper(value);
    }
    setFormData(prev => ({ ...prev, [name]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      if (isEdicao) {
        await api.put(`/varas/${id}`, formData);
      } else {
        await api.post('/varas', formData);
      }

      navigate('/varas');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar vara. Por favor, tente novamente.');
      console.error('Erro ao salvar vara:', err);
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
        {isEdicao ? 'Editar Vara' : 'Nova Vara'}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
            Nome*
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="nome"
            name="nome"
            type="text"
            placeholder="EX.: 1ª VARA CRIMINAL"
            maxLength={100}
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="comarca">
            Comarca
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="comarca"
            name="comarca"
            type="text"
            placeholder="EX.: COTIA"
            maxLength={100}
            value={formData.comarca}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endereco">
            Endereço
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="endereco"
            name="endereco"
            type="text"
            placeholder="ENDEREÇO DO FÓRUM"
            maxLength={200}
            value={formData.endereco}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefone">
            Telefone
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="telefone"
            name="telefone"
            type="text"
            inputMode="numeric"
            placeholder="(00) 0000-0000"
            maxLength={15}
            value={formData.telefone}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            E-mail
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            name="email"
            type="email"
            placeholder="email@tjsp.jus.br"
            maxLength={100}
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cor">
            Cor no calendário
          </label>
          <div className="flex items-center gap-3">
            <input
              className="h-10 w-20 border rounded cursor-pointer"
              id="cor"
              name="cor"
              type="color"
              value={formData.cor}
              onChange={handleChange}
              title="Cor dos cartões de pauta desta vara no calendário"
            />
            <span className="px-3 py-1 rounded text-sm font-semibold text-white"
                  style={{ backgroundColor: formData.cor }}>
              {formData.nome || 'PRÉVIA DA PAUTA'}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            As pautas desta vara aparecerão com esta cor nos calendários.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate('/varas')}
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

export default VarasForm;
