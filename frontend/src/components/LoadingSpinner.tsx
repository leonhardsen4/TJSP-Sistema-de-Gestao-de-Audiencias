import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = 'Carregando...' 
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col justify-center items-center h-64">
      <div 
        className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-900 ${sizeClasses[size]}`}
      ></div>
      {message && (
        <p className="mt-4 text-gray-600 text-sm">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;