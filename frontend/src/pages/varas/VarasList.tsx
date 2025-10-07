import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import PaginatedTable from '../../components/PaginatedTable';

interface Vara {
  id: number;
  nome: string;
  comarca: string;
  endereco: string;
  telefone: string;
}

const ListaVaras: React.FC = () => {
  const [varas, setVaras] = useState<Vara[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>('');

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

  const handleDelete = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a vara "${nome}"?`)) {
      return;
    }

    try {
      await api.delete(`/varas/${id}`);
      setVaras(varas.filter(vara => vara.id !== id));
    } catch (err) {
      setError('Erro ao excluir vara. Por favor, tente novamente.');
      console.error('Erro ao excluir vara:', err);
    }
  };

  const varasFiltradas = varas.filter(vara => {
    const termoBusca = filtro.toLowerCase();
    return (
      (vara.nome && vara.nome.toLowerCase().includes(termoBusca)) ||
      (vara.comarca && vara.comarca.toLowerCase().includes(termoBusca)) ||
      (vara.endereco && vara.endereco.toLowerCase().includes(termoBusca))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Erro!</strong>
        <span className="block sm:inline"> {error}</span>
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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nome, comarca ou endereço..."
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {varasFiltradas.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-600">Nenhuma vara encontrada.</p>
        </div>
      ) : (
        <PaginatedTable
          data={varasFiltradas}
          columns={[
            { key: 'nome', label: 'Nome', sortable: true },
            { key: 'comarca', label: 'Comarca', sortable: true },
            { key: 'endereco', label: 'Endereço', sortable: true },
            { key: 'telefone', label: 'Telefone', sortable: true }
          ]}
          actions={[
            {
              label: 'Detalhes',
              href: '/varas/:id',
              className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )
            },
            {
              label: 'Editar',
              href: '/varas/editar/:id',
              className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )
            },
            {
              label: 'Excluir',
              onClick: (vara) => handleDelete(vara.id, vara.nome),
              className: 'bg-red-100 text-red-700 hover:bg-red-200',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )
            }
          ]}
          emptyMessage="Nenhuma vara encontrada."
        />
      )}
    </div>
  );
};

export default ListaVaras;
