import React, { useState } from 'react';

export default function SchemaExplorer({ schema, loading }) {
  const [expandedTables, setExpandedTables] = useState({
    users: true,
    products: true,
    orders: true,
    employees: true
  });

  const toggleTable = (table) => {
    setExpandedTables(prev => ({
      ...prev,
      [table]: !prev[table]
    }));
  };

  const getTableIcon = (tableName) => {
    switch (tableName) {
      case 'users':
        return (
          <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'products':
        return (
          <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'orders':
        return (
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'employees':
        return (
          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  return (
    <div className="schema-explorer-panel">
      <div className="panel-header-glow">
        <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <h3>Schema Explorer</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-sm text-gray-400">Loading schema...</span>
        </div>
      ) : (
        <div className="schema-tables-list">
          {Object.keys(schema).map(tableName => {
            const columns = schema[tableName];
            const isExpanded = expandedTables[tableName];
            
            return (
              <div key={tableName} className="schema-table-card">
                <button className="schema-table-toggle-btn" onClick={() => toggleTable(tableName)}>
                  <div className="flex items-center gap-2">
                    {getTableIcon(tableName)}
                    <span className="table-name font-semibold">{tableName}</span>
                    <span className="row-indicator-badge text-xs">({columns.length} cols)</span>
                  </div>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="schema-columns-list">
                    {columns.map(col => (
                      <div key={col.name} className="schema-column-row">
                        <div className="flex items-center gap-1.5">
                          <span className="column-name font-mono text-sm">{col.name}</span>
                          {col.pk && <span className="pk-badge">PK</span>}
                          {tableName === 'orders' && col.name === 'customer_id' && <span className="fk-badge">FK</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="column-type font-mono text-xs text-gray-400">{col.type}</span>
                          {col.notnull && <span className="notnull-indicator" title="Required (Not Null)">*</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
