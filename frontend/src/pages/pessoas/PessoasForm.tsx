import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface PessoaForm {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  observacoes: string;
}

const PessoasForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdicao = !!id;

  const [formData, setFormData] = useState<PessoaForm>({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    observacoes: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPessoa = async () => {
      if (!isEdicao) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/pessoas/${id}`);
        setFormData(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados da pessoa. Por favor, tente novamente.');
        console.error('Erro ao buscar pessoa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPessoa();
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
        await api.put(`/pessoas/${id}`, formData);
      } else {
        await api.post('/pessoas', formData);
      }
      
      navigate('/pessoas');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar pessoa. Por favor, tente novamente.');
      console.error('Erro ao salvar pessoa:', err);
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
        {isEdicao ? 'Editar Pessoa' : 'Nova Pessoa'}
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
            placeholder="Nome completo"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cpf">
            CPF
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="cpf"
            name="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-4">
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
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefone">
            Telefone
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="telefone"
            name="telefone"
            type="text"
            placeholder="(00) 00000-0000"
            value={formData.telefone}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="observacoes">
            Observações
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="observacoes"
            name="observacoes"
            placeholder="Informações adicionais, endereço ou outras observações"
            value={formData.observacoes}
            onChange={handleChange}
            rows={3}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate('/pessoas')}
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

export default PessoasForm;
