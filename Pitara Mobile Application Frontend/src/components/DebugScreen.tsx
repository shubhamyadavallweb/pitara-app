import React from 'react';
import { useAuth } from '../context/AuthContext';

const DebugScreen = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div className="min-h-screen bg-pitara-dark text-white p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">Debug Screen</h1>
      <div className="space-y-4 text-center">
        <div>
          <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>User:</strong> {user ? user.email : 'None'}
        </div>
        <div>
          <strong>Current URL:</strong> {window.location.pathname}
        </div>
        <div>
          <strong>Local Storage User:</strong> {localStorage.getItem('pitara_user') ? 'Exists' : 'None'}
        </div>
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-6 bg-pitara-purple text-white px-4 py-2 rounded"
      >
        Reload App
      </button>
    </div>
  );
};

export default DebugScreen; 