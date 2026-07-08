import React, { useState, useEffect } from 'react';
import SchemaExplorer from './components/SchemaExplorer.jsx';
import QueryHistory from './components/QueryHistory.jsx';
import ResultsTable from './components/ResultsTable.jsx';

export default function App() {
  const [nlInput, setNlInput] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [editedSql, setEditedSql] = useState('');
  const [explanation, setExplanation] = useState('');
  
  // Query execution results
  const [results, setResults] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  // App statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(true);

  // History state
  const [history, setHistory] = useState([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1);

  // Cache configuration
  const [bypassCache, setBypassCache] = useState(false);

  const sampleQueries = [
    "List all users",
    "Show me all orders placed in the last 30 days",
    "How many products are out of stock?",
    "Find the top 5 customers by total spend",
    "Show all employees in the Engineering department hired after 2022"
  ];

  // Load schema on start
  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    setSchemaLoading(true);
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch database schema from backend: ' + err.message);
    } finally {
      setSchemaLoading(false);
    }
  };

  // 1. Translate NL input to SQL
  const handleTranslate = async (e) => {
    if (e) e.preventDefault();
    if (!nlInput || nlInput.trim().length === 0) {
      setError('Submission blocked: Please describe the data you need.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlInput })
      });
      const data = await res.json();

      if (data.success) {
        setGeneratedSql(data.sql);
        setEditedSql(data.sql);
        setExplanation(data.explanation);
      } else {
        setError(data.error);
        setGeneratedSql('');
        setEditedSql('');
        setExplanation('');
      }
    } catch (err) {
      setError('Translation server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Execute SQL Query against SQLite
  const handleExecute = async (bypass = bypassCache) => {
    const queryToRun = editedSql || generatedSql;
    if (!queryToRun || queryToRun.trim().length === 0) {
      setError('No query to execute. Enter a prompt or select a sample query.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun, bypassCache: bypass })
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setColumns(data.columns);
        setRowCount(data.rowCount);
        setExecutionTimeMs(data.executionTimeMs);
        setFromCache(data.fromCache);

        // Add to history
        const newHistoryItem = {
          nlQuery: nlInput || 'Direct SQL Query',
          sqlQuery: queryToRun,
          resultsCount: data.rowCount,
          executionTimeMs: data.executionTimeMs,
          results: data.results,
          columns: data.columns,
          explanation: explanation || 'Manually entered/edited SQL execution.'
        };

        setHistory(prev => {
          const updated = [newHistoryItem, ...prev];
          setActiveHistoryIndex(0);
          return updated;
        });
      } else {
        setError(data.error);
        setResults(null);
      }
    } catch (err) {
      setError('Server execution error: ' + err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // 3. Translate AND Execute in one click
  const handleTranslateAndExecute = async (queryText) => {
    const targetQuery = queryText || nlInput;
    if (!targetQuery || targetQuery.trim().length === 0) {
      setError('Submission blocked: Please describe the data you need.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Step 1: Translate
      const transRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery })
      });
      const transData = await transRes.json();

      if (!transData.success) {
        setError(transData.error);
        setGeneratedSql('');
        setEditedSql('');
        setExplanation('');
        setLoading(false);
        return;
      }

      setGeneratedSql(transData.sql);
      setEditedSql(transData.sql);
      setExplanation(transData.explanation);

      // Step 2: Execute SQL
      const queryRes = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: transData.sql, bypassCache })
      });
      const queryData = await queryRes.json();

      if (queryData.success) {
        setResults(queryData.results);
        setColumns(queryData.columns);
        setRowCount(queryData.rowCount);
        setExecutionTimeMs(queryData.executionTimeMs);
        setFromCache(queryData.fromCache);

        // Add to history
        const newHistoryItem = {
          nlQuery: targetQuery,
          sqlQuery: transData.sql,
          resultsCount: queryData.rowCount,
          executionTimeMs: queryData.executionTimeMs,
          results: queryData.results,
          columns: queryData.columns,
          explanation: transData.explanation
        };

        setHistory(prev => {
          const updated = [newHistoryItem, ...prev];
          setActiveHistoryIndex(0);
          return updated;
        });
      } else {
        setError(queryData.error);
      }
    } catch (err) {
      setError('Server transaction error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Click handler for sample queries
  const handleSelectSample = (sample) => {
    setNlInput(sample);
    handleTranslateAndExecute(sample);
  };

  // Reload history item
  const handleSelectHistory = (index) => {
    const item = history[index];
    if (!item) return;

    setNlInput(item.nlQuery);
    setGeneratedSql(item.sqlQuery);
    setEditedSql(item.sqlQuery);
    setExplanation(item.explanation);
    setResults(item.results);
    setColumns(item.columns);
    setRowCount(item.resultsCount);
    setExecutionTimeMs(item.executionTimeMs);
    setFromCache(false);
    setActiveHistoryIndex(index);
    setError(null);
  };

  // Clear query cache on server
  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Section */}
      <aside className="sidebar glass-panel">
        <div className="brand-header">
          <div className="brand-logo">
            <svg className="w-6 h-6 text-indigo-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795m0 0L17 5l-8.982 11.795" />
            </svg>
            <h2>InsightSQL</h2>
          </div>
          <span className="brand-subtitle">Natural Language Insights</span>
        </div>

        <div className="sidebar-sections flex flex-col gap-6">
          <SchemaExplorer schema={schema} loading={schemaLoading} />
          <QueryHistory 
            history={history} 
            activeIndex={activeHistoryIndex} 
            onSelectHistory={handleSelectHistory} 
          />
        </div>
      </aside>

      {/* Main Workspace Section */}
      <main className="workspace">
        <header className="workspace-header">
          <div className="welcome-banner">
            <h1>Database Query Center</h1>
            <p>Type a plain English request below to extract insights from your local database.</p>
          </div>
          <div className="db-badge flex items-center gap-1.5">
            <span className="online-indicator"></span>
            <span>SQLite Connected</span>
          </div>
        </header>

        {/* Input Panel */}
        <section className="input-section glass-card">
          <form onSubmit={(e) => handleTranslateAndExecute()} className="nl-form">
            <div className="nl-input-wrapper">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder="e.g. List all users or Show top 5 customers by total spend..."
                className="nl-input-field"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || !nlInput.trim()}
              >
                {loading ? 'Processing...' : 'Run Query'}
              </button>
            </div>
          </form>

          {/* Sample Prompts */}
          <div className="samples-container">
            <span className="samples-label text-xs font-semibold text-gray-500">Suggested:</span>
            <div className="samples-tags flex flex-wrap gap-2">
              {sampleQueries.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(sample)}
                  className="sample-tag-btn"
                  disabled={loading}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* SQL Generation Panel */}
        {(generatedSql || editedSql) && (
          <section className="sql-editor-section glass-card animate-fadeIn">
            <div className="sql-editor-header flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3>Generated SQL Query</h3>
                <span className="editor-badge text-2xs uppercase tracking-wider font-semibold">Editable</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(editedSql || generatedSql);
                    alert('SQL copied to clipboard!');
                  }}
                  className="icon-btn" 
                  title="Copy SQL to Clipboard"
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleExecute()} 
                  className="btn btn-indigo flex items-center gap-1"
                  disabled={loading}
                >
                  <span>Re-Run SQL</span>
                </button>
              </div>
            </div>

            <div className="sql-textarea-wrapper">
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                className="sql-textarea font-mono"
                rows={Math.max(3, (editedSql || '').split('\n').length)}
                spellCheck="false"
                disabled={loading}
              />
            </div>
            
            {explanation && (
              <div className="sql-explanation flex gap-2 items-start text-xs text-indigo-300 mt-2 p-2 rounded">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Interpretation:</strong> {explanation}</span>
              </div>
            )}
          </section>
        )}

        {/* Error Alert Display */}
        {error && (
          <div className="error-alert flex gap-3 items-start animate-shake">
            <svg className="w-6 h-6 text-rose-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-rose-200">Execution Error</h4>
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results !== null && !error && (
          <section className="results-section animate-fadeIn">
            <ResultsTable 
              results={results}
              columns={columns}
              rowCount={rowCount}
              executionTimeMs={executionTimeMs}
              fromCache={fromCache}
            />
          </section>
        )}

        {/* Speed / Caching Explanation Section */}
        <section className="performance-explanation-card glass-card mt-8">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h0a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3>Query Speed and Caching Strategy</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">
            To improve the speed of repeated or similar queries, a multi-layer caching and indexing mechanism should be implemented.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="text-xs bg-black/30 p-3 rounded border border-white/5">
              <strong className="text-indigo-400">1. Query Result Caching (Application Layer)</strong>
              <p className="text-gray-400 mt-1">
                Store serialized SELECT query strings as hash keys in an in-memory database like Redis or a memory cache (e.g. Map). If a query matches exactly, results are served instantly (0ms) from cache instead of querying SQLite.
              </p>
            </div>
            <div className="text-xs bg-black/30 p-3 rounded border border-white/5">
              <strong className="text-indigo-400">2. Database Indexing (Database Layer)</strong>
              <p className="text-gray-400 mt-1">
                Add indexes on foreign keys (`orders.customer_id`) and search filters (`employees.department`, `orders.order_date`). This reduces retrieval complexity from \(O(N)\) full-table scans to \(O(\log N)\) binary tree lookups.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bypassCache} 
                  onChange={(e) => setBypassCache(e.target.checked)}
                  className="rounded bg-black/50 border-white/10" 
                />
                <span>Bypass Cache (Force Database execution)</span>
              </label>
              <span>Current Cache TTL: 10s</span>
            </div>
            <button 
              onClick={handleClearCache}
              className="btn btn-secondary text-2xs py-1"
            >
              Clear Server Cache
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
