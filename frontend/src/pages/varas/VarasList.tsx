import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { acoesPadrao } from '../../components/tableActions';

/**
 * Listagem de varas com busca textual, ordenação, paginação e
 * personalização de colunas (ocultar/reexibir e redimensionar).
 */

interface Vara {
  id: number;
  nome: string;
  comarca: string;
  endereco: string;
  telefone: string;
  email: string;
  cor: string | null;
}

const ListaVaras: React.FC = () => {
  const [varas, setVaras] = useState<Vara[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaras = async () => {
      try {
        setLoading(true);
        const response = await api.get<Vara[]>('/varas');
        setVaras(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar varas. Por favor, tente novamente.');
        console.error('Erro ao buscar varas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVaras();
  }, []);

  const handleDelete = async (vara: Vara) => {
    if (!window.confirm(`Tem certeza que deseja excluir a vara "${vara.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/varas/${vara.id}`);
      setVaras(atual => atual.filter(v => v.id !== vara.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir vara. Por favor, tente novamente.');
      console.error('Erro ao excluir vara:', err);
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
        <h1 className="text-2xl font-bold text-gray-800">Varas</h1>
        <Link
          to="/varas/nova"
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Nova Vara
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <DataTable
        data={varas}
        searchable
        searchPlaceholder="Buscar por nome, comarca, endereço, telefone ou e-mail..."
        storageKey="varas"
        columns={[
          {
            key: 'cor',
            label: 'Cor',
            sortable: false,
            width: 70,
            render: (value) => (
              <span
                className="inline-block w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: value || '#4F46E5' }}
                title="Cor das pautas desta vara no calendário"
              />
            )
          },
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'comarca', label: 'Comarca', sortable: true },
          { key: 'endereco', label: 'Endereço', sortable: true },
          { key: 'telefone', label: 'Telefone', sortable: true },
          { key: 'email', label: 'E-mail', sortable: true }
        ]}
        actions={acoesPadrao('/varas', handleDelete)}
        emptyMessage="Nenhuma vara cadastrada. Clique em 'Nova Vara' para começar."
      />
    </div>
  );
};

export default ListaVaras;
