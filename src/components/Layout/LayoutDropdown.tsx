import React from 'react';
import { LayoutType } from '../../types';

interface LayoutDropdownProps {
  showLayoutDropdown: boolean;
  currentLayout: LayoutType;
  setShowLayoutDropdown: (show: boolean) => void;
  setCurrentLayout: (layout: LayoutType) => void;
}

const LayoutDropdown: React.FC<LayoutDropdownProps> = ({
  showLayoutDropdown,
  currentLayout,
  setShowLayoutDropdown,
  setCurrentLayout,
}) => {
  if (!showLayoutDropdown) return null;

  return (
    <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 z-10 w-40">
      <button
        onClick={() => {
          setCurrentLayout(LayoutType.SINGLE);
          setShowLayoutDropdown(false);
        }}
        className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.SINGLE ? 'bg-blue-600' : ''}`}
      >
        Single View
      </button>
      <button
        onClick={() => {
          setCurrentLayout(LayoutType.DOUBLE);
          setShowLayoutDropdown(false);
        }}
        className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.DOUBLE ? 'bg-blue-600' : ''}`}
      >
        Double View
      </button>
      <button
        onClick={() => {
          setCurrentLayout(LayoutType.TRIPLE);
          setShowLayoutDropdown(false);
        }}
        className={`w-full text-left p-2 rounded-lg hover:bg-gray-700 ${currentLayout === LayoutType.TRIPLE ? 'bg-blue-600' : ''}`}
      >
        Triple View
      </button>
    </div>
  );
};

export default LayoutDropdown; 