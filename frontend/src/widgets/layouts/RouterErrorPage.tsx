import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export function RouterErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="bg-red-50 rounded-full p-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {statusCode && (
          <p className="text-5xl font-bold text-gray-200 mb-2">{statusCode}</p>
        )}

        <h1 className="text-xl font-semibold text-gray-800 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Go back
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
