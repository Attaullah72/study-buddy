
import React from 'react';

interface LoadingSpinnerProps {
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
      <div className="w-12 h-12 border-4 border-t-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-lg">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
