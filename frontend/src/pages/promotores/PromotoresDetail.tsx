import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

interface Promotor {
  id: number;
  nome: string;
  email: string;
  telefone: string;
}

const PromotoresDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promotor, setPromotor] = useState<Promotor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotor = async () => {
      try {
        const response = await api.get(`/promotores/${id}`);
        setPromotor(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do promotor. Por favor, tente novamente.');
        console.error('Erro ao buscar promotor:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPromotor();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!promotor || !window.confirm('Tem certeza que deseja excluir este promotor?')) {
      return;
    }

    try {
      await api.delete(`/promotores/${promotor.id}`);
      navigate('/promotores');
    } catch (err) {
      setError('Erro ao excluir promotor. Por favor, tente novamente.');
      console.error('Erro ao excluir promotor:', err);
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

  if (!promotor) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        Promotor não encontrado.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Detalhes do Promotor</h1>
            <div className="flex space-x-2">
              <Link
                to={`/promotores/editar/${promotor.id}`}
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
                to="/promotores"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{promotor.nome}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contato</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">E-mail</label>
                  <p className="mt-1 text-sm text-gray-900">{promotor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Telefone</label>
                  <p className="mt-1 text-sm text-gray-900">{promotor.telefone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotoresDetail;
