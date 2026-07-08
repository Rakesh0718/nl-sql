import express from 'express';
import cors from 'cors';
import { initializeDatabase, queryDatabase, getDBSchema } from './db.js';
import { translateNLToSQL } from './translator.js';
import { performance } from 'perf_hooks';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Very simple in-memory query cache for speed optimization (Bonus feature demonstration)
const queryCache = new Map();
const CACHE_TTL_MS = 10000; // 10 seconds cache time-to-live

// Clear cache endpoint if needed
app.post('/api/cache/clear', (req, res) => {
  queryCache.clear();
  res.json({ success: true, message: 'Query cache cleared successfully.' });
});

// 1. Schema Explorer Endpoint
app.get('/api/schema', async (req, res) => {
  try {
    const schema = await getDBSchema();
    res.json({ success: true, schema });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve database schema: ' + error.message });
  }
});

// 2. Natural Language Translation Endpoint
app.post('/api/translate', (req, res) => {
  const { query } = req.body;
  
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Submission blocked: Please describe the data you need.' 
    });
  }

  try {
    const translation = translateNLToSQL(query);
    res.json({ success: true, ...translation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Query Execution Endpoint (with caching, mutation blocks, and friendly error messages)
app.post('/api/query', async (req, res) => {
  const { sql, bypassCache = false } = req.body;

  if (!sql || sql.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'No SQL query provided for execution.' });
  }

  const cleanSql = sql.trim();

  // Safety Check: Reject Mutations (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.)
  const mutationRegex = /\b(insert|update|delete|drop|create|alter|replace|truncate|rename|grant|revoke)\b/i;
  if (mutationRegex.test(cleanSql)) {
    return res.status(403).json({
      success: false,
      error: 'Security Notice: Database modifications are disabled. Only read queries (SELECT) are permitted.'
    });
  }

  // Caching mechanism: Check if query exists in cache and hasn't expired
  const now = performance.now();
  if (!bypassCache && queryCache.has(cleanSql)) {
    const cached = queryCache.get(cleanSql);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        results: cached.results,
        columns: cached.columns,
        rowCount: cached.results.length,
        executionTimeMs: 0.1, // Near-instant from cache
        fromCache: true
      });
    }
  }

  const startTime = performance.now();

  try {
    const results = await queryDatabase(cleanSql);
    const endTime = performance.now();
    const executionTimeMs = parseFloat((endTime - startTime).toFixed(2));

    // Derive columns from keys of the first row (if any results returned)
    const columns = results.length > 0 ? Object.keys(results[0]) : [];

    // Cache the result
    queryCache.set(cleanSql, {
      results,
      columns,
      timestamp: now
    });

    res.json({
      success: true,
      results,
      columns,
      rowCount: results.length,
      executionTimeMs,
      fromCache: false
    });
  } catch (err) {
    // Transform raw database exceptions into friendly human-readable errors
    let friendlyError = 'An error occurred while executing the query. Please verify your SQL syntax.';
    const msg = err.message || '';

    if (msg.includes('no such table')) {
      const match = msg.match(/no such table: (\w+)/);
      const tableName = match ? match[1] : 'requested';
      friendlyError = `Table "${tableName}" does not exist. Please check the Schema Explorer in the sidebar for available tables.`;
    } else if (msg.includes('no such column')) {
      const match = msg.match(/no such column: ([\w.]+)/);
      const columnName = match ? match[1] : 'requested';
      friendlyError = `Column "${columnName}" does not exist on the table. Verify the columns in the Schema Explorer.`;
    } else if (msg.includes('syntax error')) {
      friendlyError = 'SQL Syntax Error: The query is malformed. Double-check your commas, parenthesis, and keyword spelling.';
    } else if (msg.includes('ambiguous column name')) {
      friendlyError = 'Ambiguous Column Error: The column name exists in multiple joined tables. Please qualify it (e.g. users.name instead of name).';
    } else {
      friendlyError = `Database Error: ${msg}`;
    }

    res.status(400).json({ success: false, error: friendlyError });
  }
});

// Initialize database then start listening
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
