import React, { useState } from 'react';
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

interface SortableTableProps {
  data: any[];
  columns: Column[];
  actions?: ActionButton[];
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

const SortableTable: React.FC<SortableTableProps> = ({
  data,
  columns,
  actions = [],
  emptyMessage = "Nenhum item encontrado."
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

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

    if (sortDirection === 'desc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }

    return null;
  };

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
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
          {sortedData.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {actions.map((action, actionIndex) => (
                      action.href ? (
                        <Link
                          key={actionIndex}
                          to={action.href.replace(':id', row.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </Link>
                      ) : (
                        <button
                          key={actionIndex}
                          onClick={() => action.onClick && action.onClick(row)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            action.className || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </button>
                      )
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SortableTable;