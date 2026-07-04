import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { acoesPadrao } from '../../components/tableActions';

/**
 * Listagem de promotores com busca textual, ordenação, paginação e
 * personalização de colunas (ocultar/reexibir e redimensionar).
 */

interface Promotor {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
}

const PromotoresList: React.FC = () => {
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotores = async () => {
      try {
        setLoading(true);
        const response = await api.get<Promotor[]>('/promotores');
        setPromotores(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar promotores. Por favor, tente novamente.');
        console.error('Erro ao buscar promotores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotores();
  }, []);

  const handleDelete = async (promotor: Promotor) => {
    if (!window.confirm(`Tem certeza que deseja excluir o promotor "${promotor.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/promotores/${promotor.id}`);
      setPromotores(atual => atual.filter(p => p.id !== promotor.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir promotor. Por favor, tente novamente.');
      console.error('Erro ao excluir promotor:', err);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Promotores</h1>
        <Link
          to="/promotores/novo"
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Novo Promotor
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <DataTable
        data={promotores}
        searchable
        searchPlaceholder="Buscar por nome, e-mail ou telefone..."
        storageKey="promotores"
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'email', label: 'E-mail', sortable: true, render: (v) => v || '—' },
          { key: 'telefone', label: 'Telefone', sortable: true, render: (v) => v || '—' }
        ]}
        actions={acoesPadrao('/promotores', handleDelete)}
        emptyMessage="Nenhum promotor cadastrado. Clique em 'Novo Promotor' para começar."
      />
    </div>
  );
};

export default PromotoresList;
