import React, { useState, useMemo, useEffect } from 'react';

export default function ResultsTable({ results, columns, rowCount, executionTimeMs, fromCache }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');

  // Reset page when results change
  useEffect(() => {
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
    setFilterText('');
  }, [results]);

  // Handle column header clicks for client-side sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter results by local search term
  const filteredResults = useMemo(() => {
    if (!filterText) return results;
    return results.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(filterText.toLowerCase())
      );
    });
  }, [results, filterText]);

  // Sort the filtered results
  const sortedResults = useMemo(() => {
    const sortableItems = [...filteredResults];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
          return sortConfig.direction === 'asc' 
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredResults, sortConfig]);

  // Paginate sorted results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedResults.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedResults, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedResults.length / rowsPerPage) || 1;

  // Export to CSV Functionality
  const exportToCSV = () => {
    if (results.length === 0) return;
    
    // Create header row
    const headers = columns.join(',');
    
    // Create data rows, escaping commas and quotes
    const rows = results.map(row => 
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const strVal = String(val);
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="results-container glass-card">
      <div className="results-toolbar">
        <div className="flex items-center gap-3">
          <div className="row-count-badge">
            Showing {filteredResults.length !== results.length ? `${filteredResults.length} of ` : ''}{rowCount} results
          </div>
          <div className="exec-time-badge flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{executionTimeMs} ms</span>
            {fromCache && <span className="cached-indicator">(cached)</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Local Filter Input */}
          <div className="relative search-results-container">
            <input 
              type="text"
              placeholder="Search table..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="search-results-input"
            />
            {filterText && (
              <button className="clear-search-btn" onClick={() => setFilterText('')}>&times;</button>
            )}
          </div>

          {/* Export to CSV Button */}
          <button 
            onClick={exportToCSV}
            disabled={results.length === 0}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Export results to CSV"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty-results-state">
          <svg className="w-12 h-12 text-gray-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V9.75M3.75 7.5a2.25 2.25 0 012.25-2.25h12a2.25 2.25 0 012.25 2.25m-18 0l.084-1.007A2.25 2.25 0 015.005 4.5h13.99a2.25 2.25 0 012.164 1.743L20.25 7.5" />
          </svg>
          <h4>Query Executed Successfully</h4>
          <p>The query ran without errors, but returned 0 rows matching the conditions.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  {columns.map(col => {
                    const isSorted = sortConfig.key === col;
                    return (
                      <th key={col} onClick={() => requestSort(col)} className="cursor-pointer select-none">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-mono text-xs font-semibold tracking-wider text-indigo-200 uppercase">{col}</span>
                          <span className="sort-icon-indicator">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? '▲' : '▼'
                            ) : '↕'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map(col => {
                      const val = row[col];
                      return (
                        <td key={col} className="font-mono text-sm">
                          {val === null || val === undefined ? (
                            <span className="null-value">NULL</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="results-pagination">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Rows per page:</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rows-select"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &larr; Prev
              </button>
              
              <span className="text-xs font-semibold text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
