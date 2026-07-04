import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { maskOAB, maskTelefone, toUpper } from '../../utils/masks';

/**
 * Cadastro de advogado: nome e OAB obrigatórios. O nome vai para
 * MAIÚSCULAS ao digitar e a OAB aceita apenas números (com UF opcional,
 * ex.: 123456/SP).
 */

interface AdvogadoForm {
  nome: string;
  oab: string;
  email: string;
  telefone: string;
  observacoes: string;
}

const AdvogadosForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdicao = !!id;

  const [formData, setFormData] = useState<AdvogadoForm>({
    nome: '',
    oab: '',
    email: '',
    telefone: '',
    observacoes: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvogado = async () => {
      if (!isEdicao) return;
      try {
        setLoading(true);
        const a = (await api.get(`/advogados/${id}`)).data;
        setFormData({
          nome: a.nome || '',
          oab: a.oab || '',
          email: a.email || '',
          telefone: a.telefone || '',
          observacoes: a.observacoes || ''
        });
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do advogado. Por favor, tente novamente.');
        console.error('Erro ao buscar advogado:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvogado();
  }, [id, isEdicao]);

  /** Aplica a máscara/transformação adequada a cada campo enquanto digita. */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let valor = value;
    if (name === 'oab') {
      valor = maskOAB(value);
    } else if (name === 'telefone') {
      valor = maskTelefone(value);
    } else if (name === 'nome' || name === 'observacoes') {
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
        await api.put(`/advogados/${id}`, formData);
      } else {
        await api.post('/advogados', formData);
      }

      navigate('/advogados');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar advogado. Por favor, tente novamente.');
      console.error('Erro ao salvar advogado:', err);
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
        {isEdicao ? 'Editar Advogado' : 'Novo Advogado'}
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
            placeholder="NOME COMPLETO"
            maxLength={100}
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="oab">
            Número OAB*
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="oab"
            name="oab"
            type="text"
            placeholder="123456/SP"
            maxLength={11}
            value={formData.oab}
            onChange={handleChange}
            required
          />
          <p className="text-gray-500 text-xs mt-1">Somente números; a UF ao final é opcional (ex.: 123456/SP).</p>
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
            placeholder="email@exemplo.com"
            maxLength={100}
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefone">
            Telefone
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="telefone"
            name="telefone"
            type="text"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            maxLength={15}
            value={formData.telefone}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={() => navigate('/advogados')}
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

export default AdvogadosForm;
