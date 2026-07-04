import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  ScaleIcon, 
  UserIcon, 
  BriefcaseIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { usuario, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Pautas', href: '/pautas', icon: QueueListIcon },
    { name: 'Audiências', href: '/audiencias', icon: ClockIcon },
    { name: 'Mandados', href: '/mandados', icon: ClipboardDocumentCheckIcon },
    { name: 'Varas', href: '/varas', icon: BuildingOfficeIcon },
    { name: 'Juízes', href: '/juizes', icon: ScaleIcon },
    { name: 'Promotores', href: '/promotores', icon: UserIcon },
    { name: 'Advogados', href: '/advogados', icon: BriefcaseIcon },
    { name: 'Pessoas', href: '/pessoas', icon: UserGroupIcon },
  ];

  const isActive = (path: string) => {
    // Para evitar seleção dupla, verificar correspondência exata primeiro
    if (location.pathname === path) {
      return true;
    }
    
    // Para rotas aninhadas, verificar se começa com o path, mas excluir casos específicos
    if (path === '/audiencias' && location.pathname.startsWith('/audiencias/')) {
      // Se estamos em uma subrota de audiências que não seja a lista principal, não marcar como ativo
      return location.pathname === '/audiencias' || 
             location.pathname.startsWith('/audiencias/nova') || 
             location.pathname.startsWith('/audiencias/editar/') ||
             /^\/audiencias\/\d+$/.test(location.pathname); // Para detalhes de audiência específica
    }
    
    // Para outras rotas, usar a lógica original
    return location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'visible' : 'invisible'}`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-tjsp-red">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fechar menu</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-shrink-0 flex items-center px-4">
            <img src="/tjsp_logo.png" alt="TJSP Logo" className="h-10 w-10 mr-3" />
            <h1 className="text-xl font-bold text-white">TJSP Audiências</h1>
          </div>
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'bg-tjsp-dark text-white'
                      : 'text-gray-300 hover:bg-tjsp-dark hover:text-white'
                  } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                >
                  <item.icon
                    className="mr-4 flex-shrink-0 h-6 w-6 text-gray-300"
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex flex-col h-0 flex-1">
            <div className={`flex items-center h-16 flex-shrink-0 px-4 bg-tjsp-red ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <img src="/tjsp_logo.png" alt="TJSP Logo" className="h-10 w-10" />
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-white ml-3">TJSP Audiências</h1>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto bg-tjsp-red">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-tjsp-dark text-white'
                        : 'text-gray-300 hover:bg-tjsp-dark hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <item.icon
                      className={`flex-shrink-0 h-6 w-6 text-gray-300 ${sidebarCollapsed ? '' : 'mr-3'}`}
                      aria-hidden="true"
                    />
                    {!sidebarCollapsed && item.name}
                  </Link>
                ))}
              </nav>
              
              {/* Botão de recolher/expandir */}
              <div className="px-2 pb-4">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full flex items-center justify-center px-2 py-2 text-gray-300 hover:bg-tjsp-dark hover:text-white rounded-md transition-colors"
                  title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {sidebarCollapsed ? (
                    <ChevronRightIcon className="h-6 w-6" />
                  ) : (
                    <>
                      <ChevronLeftIcon className="h-6 w-6 mr-3" />
                      <span className="text-sm">Recolher</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-tjsp-blue md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <h2 className="text-xl font-semibold text-gray-900 self-center">
                  Sistema de Gestão de Audiências
                </h2>
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Olá, {usuario?.nomeCompleto}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tjsp-blue"
                    title="Sair"
                  >
                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;