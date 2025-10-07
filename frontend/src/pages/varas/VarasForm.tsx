import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface VaraForm {
  nome: string;
  comarca: string;
  endereco: string;
  telefone: string;
  email: string;
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
    email: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVara = async () => {
      if (!isEdicao) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/varas/${id}`);
        setFormData(response.data);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
            placeholder="Nome da Vara"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="comarca">
            Comarca*
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="comarca"
            name="comarca"
            type="text"
            placeholder="Comarca"
            value={formData.comarca}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endereco">
            Endereço*
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="endereco"
            name="endereco"
            rows={3}
            placeholder="Endereço completo"
            value={formData.endereco}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefone">
            Telefone*
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="telefone"
            name="telefone"
            type="text"
            placeholder="(00) 0000-0000"
            value={formData.telefone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            name="email"
            type="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={handleChange}
          />
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
