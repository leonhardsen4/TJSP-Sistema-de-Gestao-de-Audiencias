import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { acoesPadrao } from '../../components/tableActions';

/**
 * Listagem de advogados com busca textual, ordenação, paginação e
 * personalização de colunas (ocultar/reexibir e redimensionar).
 */

interface Advogado {
  id: number;
  nome: string;
  oab: string;
  email: string | null;
  telefone: string | null;
}

const AdvogadosList: React.FC = () => {
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvogados = async () => {
      try {
        setLoading(true);
        const response = await api.get<Advogado[]>('/advogados');
        setAdvogados(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar advogados. Por favor, tente novamente.');
        console.error('Erro ao buscar advogados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvogados();
  }, []);

  const handleDelete = async (advogado: Advogado) => {
    if (!window.confirm(`Tem certeza que deseja excluir o advogado "${advogado.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/advogados/${advogado.id}`);
      setAdvogados(atual => atual.filter(a => a.id !== advogado.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir advogado. Por favor, tente novamente.');
      console.error('Erro ao excluir advogado:', err);
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
        <h1 className="text-2xl font-bold text-gray-800">Advogados</h1>
        <Link
          to="/advogados/novo"
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Novo Advogado
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <DataTable
        data={advogados}
        searchable
        searchPlaceholder="Buscar por nome, OAB, e-mail ou telefone..."
        storageKey="advogados"
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'oab', label: 'OAB', sortable: true },
          { key: 'email', label: 'E-mail', sortable: true, render: (v) => v || '—' },
          { key: 'telefone', label: 'Telefone', sortable: true, render: (v) => v || '—' }
        ]}
        actions={acoesPadrao('/advogados', handleDelete)}
        emptyMessage="Nenhum advogado cadastrado. Clique em 'Novo Advogado' para começar."
      />
    </div>
  );
};

export default AdvogadosList;
