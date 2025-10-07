import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ActionButton {
  label: string;
  onClick?: (row: any) => void;
  href?: string;
  className?: string;
  icon?: React.ReactNode;
}

interface PaginatedTableProps {
  data: any[];
  columns: Column[];
  actions?: ActionButton[];
  emptyMessage?: string;
  itemsPerPage?: number;
}

type SortDirection = 'asc' | 'desc' | null;

const PaginatedTable: React.FC<PaginatedTableProps> = ({
  data,
  columns,
  actions = [],
  emptyMessage = "Nenhum item encontrado.",
  itemsPerPage = 10
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Tratamento especial para datas
      if (sortColumn === 'dataAudiencia' && typeof aValue === 'string' && typeof bValue === 'string') {
        // Tentar diferentes formatos de data
        let dateA, dateB;
        
        // Formato YYYY-MM-DD (do backend)
        if (aValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateA = new Date(aValue);
          dateB = new Date(bValue);
        }
        // Formato DD/MM/YYYY (formatado para exibição)
        else if (aValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [dayA, monthA, yearA] = aValue.split('/');
          const [dayB, monthB, yearB] = bValue.split('/');
          dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
          dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
        }
        // Fallback: tentar parsing direto
        else {
          dateA = new Date(aValue);
          dateB = new Date(bValue);
        }
        
        if (dateA < dateB) return sortDirection === 'asc' ? -1 : 1;
        if (dateA > dateB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const renderActionButton = (action: ActionButton, row: any) => {
    const buttonContent = (
      <span className="flex items-center space-x-1">
        {action.icon}
        <span>{action.label}</span>
      </span>
    );

    if (action.href) {
      const href = action.href.replace(':id', row.id);
      return (
        <Link
          key={action.label}
          to={href}
          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
        >
          {buttonContent}
        </Link>
      );
    }

    return (
      <button
        key={action.label}
        onClick={() => action.onClick?.(row)}
        className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
      >
        {buttonContent}
      </button>
    );
  };

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {actions.map((action) => renderActionButton(action, row))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={previousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">{Math.min(endIndex, totalItems)}</span> de{' '}
                <span className="font-medium">{totalItems}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={previousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Anterior</span>
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => goToPage(pageNumber)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNumber === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Próxima</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaginatedTable;