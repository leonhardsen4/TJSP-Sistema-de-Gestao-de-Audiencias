import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AudienciasList from './pages/audiencias/AudienciasList';
import AudienciasForm from './pages/audiencias/AudienciasForm';
import AudienciasDetail from './pages/audiencias/AudienciasDetail';
import HorariosLivres from './pages/audiencias/HorariosLivres';
import VarasList from './pages/varas/VarasList';
import VarasForm from './pages/varas/VarasForm';
import VarasDetail from './pages/varas/VarasDetail';
import JuizesList from './pages/juizes/JuizesList';
import JuizesForm from './pages/juizes/JuizesForm';
import JuizesDetail from './pages/juizes/JuizesDetail';
import PromotoresList from './pages/promotores/PromotoresList';
import PromotoresForm from './pages/promotores/PromotoresForm';
import PromotoresDetail from './pages/promotores/PromotoresDetail';
import AdvogadosList from './pages/advogados/AdvogadosList';
import AdvogadosForm from './pages/advogados/AdvogadosForm';
import AdvogadosDetail from './pages/advogados/AdvogadosDetail';
import PessoasList from './pages/pessoas/PessoasList';
import PessoasForm from './pages/pessoas/PessoasForm';
import PessoasDetail from './pages/pessoas/PessoasDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="audiencias" element={<AudienciasList />} />
              <Route path="audiencias/nova" element={<AudienciasForm />} />
              <Route path="audiencias/editar/:id" element={<AudienciasForm />} />
              <Route path="audiencias/horarios-livres" element={<HorariosLivres />} />
              <Route path="audiencias/:id" element={<AudienciasDetail />} />
              <Route path="varas" element={<VarasList />} />
              <Route path="varas/nova" element={<VarasForm />} />
              <Route path="varas/editar/:id" element={<VarasForm />} />
              <Route path="varas/:id" element={<VarasDetail />} />
              <Route path="juizes" element={<JuizesList />} />
              <Route path="juizes/novo" element={<JuizesForm />} />
              <Route path="juizes/editar/:id" element={<JuizesForm />} />
              <Route path="juizes/:id" element={<JuizesDetail />} />
              <Route path="promotores" element={<PromotoresList />} />
              <Route path="promotores/novo" element={<PromotoresForm />} />
              <Route path="promotores/editar/:id" element={<PromotoresForm />} />
              <Route path="promotores/:id" element={<PromotoresDetail />} />
              <Route path="advogados" element={<AdvogadosList />} />
              <Route path="advogados/novo" element={<AdvogadosForm />} />
              <Route path="advogados/editar/:id" element={<AdvogadosForm />} />
              <Route path="advogados/:id" element={<AdvogadosDetail />} />
              <Route path="pessoas" element={<PessoasList />} />
              <Route path="pessoas/novo" element={<PessoasForm />} />
              <Route path="pessoas/editar/:id" element={<PessoasForm />} />
              <Route path="pessoas/:id" element={<PessoasDetail />} />
            </Route>
          </Routes>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;