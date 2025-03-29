import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true);
  
  // Auto dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5" />;
      case 'error':
        return <FiAlertCircle className="w-5 h-5" />;
      case 'info':
        return <FiInfo className="w-5 h-5" />;
    }
  };
  
  // Background color based on type
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'info':
        return 'bg-blue-600';
    }
  };
  
  return (
    <div 
      className={`fixed bottom-4 right-4 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3 transition-opacity duration-300 ${getBgColor()} ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {getIcon()}
      <span className="flex-1">{message}</span>
      <button 
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-white hover:text-gray-200 focus:outline-none"
      >
        <FiX className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast; 