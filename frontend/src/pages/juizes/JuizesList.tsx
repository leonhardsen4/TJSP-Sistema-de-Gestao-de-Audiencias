import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { acoesPadrao } from '../../components/tableActions';

/**
 * Listagem de juízes com busca textual, ordenação, paginação e
 * personalização de colunas (ocultar/reexibir e redimensionar).
 */

interface Juiz {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
}

const JuizesList: React.FC = () => {
  const [juizes, setJuizes] = useState<Juiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJuizes = async () => {
      try {
        setLoading(true);
        const response = await api.get<Juiz[]>('/juizes');
        setJuizes(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar juízes. Por favor, tente novamente.');
        console.error('Erro ao buscar juízes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJuizes();
  }, []);

  const handleDelete = async (juiz: Juiz) => {
    if (!window.confirm(`Tem certeza que deseja excluir o juiz "${juiz.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/juizes/${juiz.id}`);
      setJuizes(atual => atual.filter(j => j.id !== juiz.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir juiz. Por favor, tente novamente.');
      console.error('Erro ao excluir juiz:', err);
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
        <h1 className="text-2xl font-bold text-gray-800">Juízes</h1>
        <Link
          to="/juizes/novo"
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Novo Juiz
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <DataTable
        data={juizes}
        searchable
        searchPlaceholder="Buscar por nome, e-mail ou telefone..."
        storageKey="juizes"
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'email', label: 'E-mail', sortable: true, render: (v) => v || '—' },
          { key: 'telefone', label: 'Telefone', sortable: true, render: (v) => v || '—' }
        ]}
        actions={acoesPadrao('/juizes', handleDelete)}
        emptyMessage="Nenhum juiz cadastrado. Clique em 'Novo Juiz' para começar."
      />
    </div>
  );
};

export default JuizesList;
