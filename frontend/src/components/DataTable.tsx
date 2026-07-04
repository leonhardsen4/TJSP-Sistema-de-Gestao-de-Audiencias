import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

/**
 * Definição de uma coluna do DataTable.
 *
 * A chave aceita caminho com ponto (ex.: "vara.nome") para ler valores
 * aninhados. O rótulo é exibido no cabeçalho e no menu de colunas.
 */
export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  /** Largura inicial em pixels (o usuário pode redimensionar depois). */
  width?: number;
  render?: (value: any, row: any) => React.ReactNode;
  /** Valor usado na busca/ordenação quando o render não reflete o dado cru. */
  sortValue?: (row: any) => string | number;
}

/** Botão de ação exibido na última coluna de cada linha. */
export interface ActionButton {
  label: string;
  onClick?: (row: any) => void;
  href?: string;
  className?: string;
  icon?: React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  actions?: ActionButton[];
  emptyMessage?: string;
  itemsPerPage?: number;
  /** Exibe campo de busca textual sobre todas as colunas visíveis. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Chave usada para lembrar colunas ocultas e larguras no navegador. */
  storageKey?: string;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * Lê um valor da linha aceitando caminho com ponto ("vara.nome").
 */
const getValue = (row: any, key: string): any =>
  key.split('.').reduce((atual, parte) => (atual == null ? atual : atual[parte]), row);

/**
 * Tabela padrão do sistema: ordenação em todas as colunas, paginação,
 * busca textual, ocultar/reexibir colunas e redimensionamento de largura
 * por arraste. As preferências de colunas são lembradas no navegador
 * quando um storageKey é informado.
 */
const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  actions = [],
  emptyMessage = 'Nenhum item encontrado.',
  itemsPerPage = 10,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  storageKey
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => carregarPreferencia('ocultas', []));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => carregarPreferencia('larguras', {}));
  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  /** Carrega uma preferência salva no navegador para esta tabela. */
  function carregarPreferencia<T>(sufixo: string, padrao: T): T {
    if (!storageKey) return padrao;
    try {
      const salvo = localStorage.getItem(`datatable:${storageKey}:${sufixo}`);
      return salvo ? JSON.parse(salvo) : padrao;
    } catch {
      return padrao;
    }
  }

  /** Salva uma preferência no navegador para esta tabela. */
  const salvarPreferencia = useCallback((sufixo: string, valor: unknown) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`datatable:${storageKey}:${sufixo}`, JSON.stringify(valor));
    } catch {
      // Sem localStorage disponível: apenas não persiste.
    }
  }, [storageKey]);

  // Volta à primeira página quando os dados ou a busca mudam.
  useEffect(() => {
    setCurrentPage(1);
  }, [data, search]);

  // Fecha o menu de colunas ao clicar fora dele.
  useEffect(() => {
    const aoClicarFora = (evento: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(evento.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  // Redimensionamento de coluna: acompanha o mouse enquanto o usuário arrasta.
  useEffect(() => {
    const aoMover = (evento: MouseEvent) => {
      const ativo = resizingRef.current;
      if (!ativo) return;
      const novaLargura = Math.max(60, ativo.startWidth + evento.clientX - ativo.startX);
      setColumnWidths(prev => ({ ...prev, [ativo.key]: novaLargura }));
    };
    const aoSoltar = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', aoMover);
    document.addEventListener('mouseup', aoSoltar);
    return () => {
      document.removeEventListener('mousemove', aoMover);
      document.removeEventListener('mouseup', aoSoltar);
    };
  }, []);

  // Persiste as preferências quando mudam.
  useEffect(() => { salvarPreferencia('ocultas', hiddenColumns); }, [hiddenColumns, salvarPreferencia]);
  useEffect(() => { salvarPreferencia('larguras', columnWidths); }, [columnWidths, salvarPreferencia]);

  const visibleColumns = columns.filter(c => !hiddenColumns.includes(c.key));

  const iniciarRedimensionamento = (evento: React.MouseEvent, key: string) => {
    evento.preventDefault();
    evento.stopPropagation();
    const th = (evento.target as HTMLElement).closest('th');
    resizingRef.current = {
      key,
      startX: evento.clientX,
      startWidth: columnWidths[key] || th?.offsetWidth || 150
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const alternarColuna = (key: string) => {
    setHiddenColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  /** Valor usado para ordenar/buscar em uma coluna. */
  const valorDaColuna = (row: any, column: Column): any => {
    if (column.sortValue) return column.sortValue(row);
    return getValue(row, column.key);
  };

  const filteredData = useMemo(() => {
    if (!searchable || !search.trim()) return data;
    const termo = search.trim().toLowerCase();
    return data.filter(row =>
      visibleColumns.some(column => {
        const valor = valorDaColuna(row, column);
        return valor != null && String(valor).toLowerCase().includes(termo);
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, searchable, hiddenColumns, columns]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;
    const coluna = columns.find(c => c.key === sortColumn);
    if (!coluna) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = valorDaColuna(a, coluna);
      const bValue = valorDaColuna(b, coluna);

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison: number;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Datas ISO (yyyy-MM-dd) e horários (HH:mm) ordenam corretamente como texto.
        comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true });
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, sortColumn, sortDirection, columns]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <span className="ml-1 text-gray-300">↕</span>;
    }
    return (
      <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
    );
  };

  const renderActionButton = (action: ActionButton, row: any) => {
    const conteudo = (
      <span className="flex items-center space-x-1">
        {action.icon}
        <span>{action.label}</span>
      </span>
    );
    const classe = `inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
      action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    }`;
    if (action.href) {
      return (
        <Link key={action.label} to={action.href.replace(':id', row.id)} className={classe}>
          {conteudo}
        </Link>
      );
    }
    return (
      <button key={action.label} type="button" onClick={() => action.onClick?.(row)} className={classe}>
        {conteudo}
      </button>
    );
  };

  // Números de página exibidos: primeira, última e vizinhas da atual.
  const paginasVisiveis = useMemo(() => {
    const paginas: (number | '...')[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
        paginas.push(p);
      } else if (paginas[paginas.length - 1] !== '...') {
        paginas.push('...');
      }
    }
    return paginas;
  }, [totalPages, currentPage]);

  return (
    <div>
      {/* Barra de ferramentas: busca e menu de colunas */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {searchable && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="relative ml-auto" ref={columnMenuRef}>
          <button
            type="button"
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            title="Escolher colunas visíveis"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 4v16m6-16v16M4 8h16M4 16h16" />
            </svg>
            Colunas
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 z-20 mt-1 w-56 bg-white border border-gray-300 rounded-md shadow-lg p-2">
              <p className="text-xs text-gray-500 px-2 pb-1">Colunas visíveis</p>
              {columns.map(column => (
                <label
                  key={column.key}
                  className="flex items-center px-2 py-1 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={!hiddenColumns.includes(column.key)}
                    disabled={!hiddenColumns.includes(column.key) && visibleColumns.length === 1}
                    onChange={() => alternarColuna(column.key)}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.map(column => (
                    <th
                      key={column.key}
                      style={{ width: columnWidths[column.key] || column.width || undefined }}
                      className={`relative px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                      }`}
                      onClick={() => column.sortable !== false && handleSort(column.key)}
                    >
                      <div className="flex items-center overflow-hidden">
                        <span className="truncate">{column.label}</span>
                        {column.sortable !== false && getSortIcon(column.key)}
                      </div>
                      {/* Alça de redimensionamento da coluna */}
                      <span
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300"
                        onMouseDown={(e) => iniciarRedimensionamento(e, column.key)}
                        onClick={(e) => e.stopPropagation()}
                        title="Arraste para ajustar a largura"
                      />
                    </th>
                  ))}
                  {actions.length > 0 && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: 110 + actions.length * 90 }}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-gray-50">
                    {visibleColumns.map(column => (
                      <td key={column.key} className="px-4 py-3 text-sm text-gray-900 truncate"
                          title={String(valorDaColuna(row, column) ?? '')}>
                        {column.render ? column.render(getValue(row, column.key), row) : getValue(row, column.key)}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex space-x-2">
                          {actions.map(action => renderActionButton(action, row))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + (actions.length > 0 ? 1 : 0)}
                        className="px-4 py-6 text-center text-sm text-gray-500">
                      Nenhum resultado para a busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span> a{' '}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de{' '}
                <span className="font-medium">{totalItems}</span> resultados
              </p>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                {paginasVisiveis.map((pagina, i) =>
                  pagina === '...' ? (
                    <span key={`e${i}`} className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={pagina}
                      onClick={() => setCurrentPage(pagina)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pagina === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pagina}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataTable;
