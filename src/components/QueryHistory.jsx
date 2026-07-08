import React from 'react';

export default function QueryHistory({ history, activeIndex, onSelectHistory }) {
  return (
    <div className="query-history-panel">
      <div className="panel-header-glow">
        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3>Query History</h3>
      </div>
      
      {history.length === 0 ? (
        <div className="empty-history-text p-6 text-center text-sm text-gray-500">
          No queries executed yet. Start by asking a question!
        </div>
      ) : (
        <div className="history-items-list">
          {history.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button 
                key={idx}
                className={`history-item-card ${isActive ? 'active-history-item' : ''}`}
                onClick={() => onSelectHistory(idx)}
              >
                <div className="history-nl-text text-sm font-medium">
                  {item.nlQuery}
                </div>
                <div className="history-sql-preview font-mono text-xs text-indigo-300 truncate">
                  {item.sqlQuery}
                </div>
                <div className="history-meta flex justify-between items-center text-2xs text-gray-500 mt-1">
                  <span>{item.resultsCount} rows returned</span>
                  <span>{item.executionTimeMs} ms</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
