import React, { useEffect } from 'react';

/**
 * Janela modal simples: fundo escurecido, caixa centralizada com título e
 * botão de fechar. A tecla Esc também fecha.
 *
 * Usada para cadastros rápidos sem sair da tela atual (ex.: cadastrar uma
 * pessoa ou um advogado a partir do formulário de audiência).
 */
interface ModalProps {
  /** Título exibido no topo da janela. */
  titulo: string;
  /** Chamado ao fechar (botão ×, Esc ou clique no fundo). */
  onFechar: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ titulo, onFechar, children }) => {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50 px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="relative my-12 mx-auto max-w-xl bg-gray-50 rounded-lg shadow-xl" role="dialog" aria-modal="true">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
