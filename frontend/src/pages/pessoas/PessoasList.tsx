import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { acoesPadrao } from '../../components/tableActions';

/**
 * Listagem de pessoas (partes dos processos) com busca textual,
 * ordenação, paginação e personalização de colunas.
 */

interface Pessoa {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
}

const PessoasList: React.FC = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPessoas = async () => {
      try {
        setLoading(true);
        const response = await api.get<Pessoa[]>('/pessoas');
        setPessoas(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar pessoas. Por favor, tente novamente.');
        console.error('Erro ao buscar pessoas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPessoas();
  }, []);

  const handleDelete = async (pessoa: Pessoa) => {
    if (!window.confirm(`Tem certeza que deseja excluir a pessoa "${pessoa.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/pessoas/${pessoa.id}`);
      setPessoas(atual => atual.filter(p => p.id !== pessoa.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir pessoa. Por favor, tente novamente.');
      console.error('Erro ao excluir pessoa:', err);
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
        <h1 className="text-2xl font-bold text-gray-800">Pessoas</h1>
        <Link
          to="/pessoas/novo"
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Nova Pessoa
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <DataTable
        data={pessoas}
        searchable
        searchPlaceholder="Buscar por nome, CPF, e-mail ou telefone..."
        storageKey="pessoas"
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'cpf', label: 'CPF', sortable: true, render: (v) => v || '—' },
          { key: 'email', label: 'E-mail', sortable: true, render: (v) => v || '—' },
          { key: 'telefone', label: 'Telefone', sortable: true, render: (v) => v || '—' }
        ]}
        actions={acoesPadrao('/pessoas', handleDelete)}
        emptyMessage="Nenhuma pessoa cadastrada. Clique em 'Nova Pessoa' para começar."
      />
    </div>
  );
};

export default PessoasList;
