import React from 'react';

export default function GateControl({ gate, isOpen, onOpen, onClose, loading }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {gate === 'entry' ? '🚪 Entry Gate Control' : '🚪 Exit Gate Control'}
      </h3>
      
      {/* Gate Status Indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
          isOpen 
            ? 'bg-green-500 shadow-lg shadow-green-300 animate-pulse' 
            : 'bg-red-500 shadow-lg shadow-red-300'
        }`}>
          <div className="text-center text-white">
            <div className="text-4xl mb-2">
              {isOpen ? '✓' : '✕'}
            </div>
            <div className="text-sm font-bold uppercase">
              {isOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onOpen}
          disabled={loading || isOpen}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
            isOpen
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? 'Opening...' : 'Open Gate'}
        </button>
        <button
          onClick={onClose}
          disabled={loading || !isOpen}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
            !isOpen
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Closing...' : 'Close Gate'}
        </button>
      </div>

      {/* Status Text */}
      <p className="text-center text-sm text-gray-600 mt-4">
        Gate is currently <span className={`font-bold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </p>
    </div>
  );
}
