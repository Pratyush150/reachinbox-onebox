import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ElasticsearchStatus = ({ isDarkMode = true }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/v1/emails/search-status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        setStatus({ success: false, error: 'Failed to check status' });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isDarkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-100 text-gray-600'
      }`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-xs">Checking search...</span>
      </div>
    );
  }

  const isHealthy = status?.success && status?.data?.elasticsearch?.available;
  const searchEngine = status?.data?.configuration?.engine || 'unknown';
  const totalDocs = status?.data?.index?.totalDocuments || 0;
  const lastSearchTime = status?.data?.searchTest?.took;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
      isHealthy 
        ? isDarkMode 
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
          : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : isDarkMode 
          ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
          : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {isHealthy ? (
        <CheckCircleIcon className="w-4 h-4" />
      ) : (
        <ExclamationTriangleIcon className="w-4 h-4" />
      )}
      
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium">
          ⚡ Elasticsearch {isHealthy ? 'Active' : 'Offline'}
        </span>
        
        {isHealthy && (
          <>
            <span className="opacity-70">•</span>
            <span className="opacity-70">{totalDocs.toLocaleString()} docs</span>
            
            {lastSearchTime && (
              <>
                <span className="opacity-70">•</span>
                <span className="opacity-70">{lastSearchTime}ms</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ElasticsearchStatus;

