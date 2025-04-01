import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface DeleteConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

const DeleteConfirmationPopup: React.FC<DeleteConfirmationPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center mb-4 text-red-500">
          <FiAlertTriangle className="w-6 h-6 mr-2" />
          <h2 className="text-xl font-semibold">Delete Confirmation</h2>
        </div>
        
        <p className="text-gray-300 mb-4">
          Are you sure you want to delete the {itemType} <span className="font-semibold text-white">"{itemName}"</span>?
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            <FiX className="mr-2" /> Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-delete"
          >
            Delete {itemType}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationPopup; 