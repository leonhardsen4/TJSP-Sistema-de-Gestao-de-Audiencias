import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Vara {
  id: number;
  nome: string;
  comarca: string;
}

interface HorarioLivre {
  data: string;
  horarioInicio: string;
  horarioFim: string;
  duracao: number;
}

const HorariosLivres: React.FC = () => {
  const navigate = useNavigate();
  
  const [varas, setVaras] = useState<Vara[]>([]);
  const [filtros, setFiltros] = useState({
    varaId: 0,
    dataInicio: '',
    dataFim: '',
    duracao: 60,
    horarioInicioMinimo: '10:00',
    horarioFimMaximo: '17:00'
  });
  const [horariosLivres, setHorariosLivres] = useState<HorarioLivre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarVaras();
  }, []);

  const carregarVaras = async () => {
    try {
      const response = await api.get('/varas');
      setVaras(response.data);
    } catch (error) {
      console.error('Erro ao carregar varas:', error);
    }
  };

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: name === 'varaId' || name === 'duracao' ? Number(value) : value
    }));
  };

  const buscarHorariosLivres = async () => {
    if (!filtros.varaId || !filtros.dataInicio || !filtros.dataFim) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        varaId: filtros.varaId.toString(),
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        duracao: filtros.duracao.toString(),
        horarioInicioMinimo: filtros.horarioInicioMinimo,
        horarioFimMaximo: filtros.horarioFimMaximo
      });

      const response = await api.get(`/audiencias/buscar-horarios-livres?${params}`);
      setHorariosLivres(response.data);
    } catch (error) {
      setError('Erro ao buscar horários livres.');
    } finally {
      setLoading(false);
    }
  };

  const agendarAudiencia = (horario: HorarioLivre) => {
    // Navegar para o formulário de cadastro com os dados pré-preenchidos
    const params = new URLSearchParams({
      data: horario.data,
      hora: horario.horarioInicio,
      duracao: horario.duracao.toString(),
      varaId: filtros.varaId.toString()
    });
    
    navigate(`/audiencias/nova?${params}`);
  };

  const formatarData = (data: string) => {
    // Evita problemas de timezone ao tratar a data como local
    const [year, month, day] = data.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
  };

  const formatarDiaSemana = (data: string) => {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    // Evita problemas de timezone ao tratar a data como local
    const [year, month, day] = data.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return diasSemana[date.getDay()];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Horários Livres</h1>
        <p className="text-gray-600">Encontre horários disponíveis para agendamento de audiências</p>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros de Busca</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Vara*
            </label>
            <select
              name="varaId"
              value={filtros.varaId}
              onChange={handleFiltroChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value={0}>Selecione uma vara</option>
              {varas.map(vara => (
                <option key={vara.id} value={vara.id}>
                  {vara.nome} - {vara.comarca}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Data Início*
            </label>
            <input
              type="date"
              name="dataInicio"
              value={filtros.dataInicio}
              onChange={handleFiltroChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Data Fim*
            </label>
            <input
              type="date"
              name="dataFim"
              value={filtros.dataFim}
              onChange={handleFiltroChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Duração (minutos)
            </label>
            <input
              type="number"
              name="duracao"
              value={filtros.duracao}
              onChange={handleFiltroChange}
              min="15"
              max="480"
              step="15"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Horário Início Mínimo
            </label>
            <input
              type="time"
              name="horarioInicioMinimo"
              value={filtros.horarioInicioMinimo}
              onChange={handleFiltroChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Horário Fim Máximo
            </label>
            <input
              type="time"
              name="horarioFimMaximo"
              value={filtros.horarioFimMaximo}
              onChange={handleFiltroChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={buscarHorariosLivres}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar Horários Livres'}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Resultados */}
      {horariosLivres.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Horários Disponíveis ({horariosLivres.length} encontrados)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {horariosLivres.map((horario, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="mb-2">
                  <div className="font-semibold text-lg">
                    {formatarData(horario.data)}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {formatarDiaSemana(horario.data)}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-gray-700">
                    <strong>Horário:</strong> {horario.horarioInicio} - {horario.horarioFim}
                  </div>
                  <div className="text-gray-700">
                    <strong>Duração:</strong> {horario.duracao} minutos
                  </div>
                </div>
                
                <button
                  onClick={() => agendarAudiencia(horario)}
                  className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Agendar Audiência
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && horariosLivres.length === 0 && filtros.varaId && filtros.dataInicio && filtros.dataFim && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Nenhum horário livre encontrado para os critérios selecionados.
        </div>
      )}
    </div>
  );
};

export default HorariosLivres;