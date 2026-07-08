import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database.db');

// Ensure db directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Always start fresh for local testing & consistent seeded dates
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (err) {
    console.warn("Could not delete database file, attempting to drop and recreate tables instead.", err);
  }
}

// Instantiate native SQLite sync connection
let db;
try {
  db = new DatabaseSync(dbPath);
  console.log('Connected to the SQLite database via native node:sqlite.');
} catch (err) {
  console.error('Database connection error:', err.message);
  throw err;
}

export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create tables using exec
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_total REAL NOT NULL,
        order_date TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        FOREIGN KEY(customer_id) REFERENCES users(id)
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        salary REAL NOT NULL,
        hire_date TEXT NOT NULL
      )`);

      console.log('Database tables created successfully.');

      // 2. Check if seeded
      const countStmt = db.prepare("SELECT COUNT(*) as count FROM users");
      const countResult = countStmt.all();
      
      if (countResult[0] && countResult[0].count > 0) {
        console.log('Database already seeded.');
        return resolve();
      }

      seedData();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

function seedData() {
  console.log('Seeding SQLite database...');
  db.exec('BEGIN TRANSACTION');

  const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Olivia', 'James', 'Sophia', 'Robert', 'Isabella', 'William', 'Mia', 'Joseph', 'Charlotte', 'Thomas', 'Amelia', 'Charles', 'Harper', 'Daniel', 'Evelyn'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Harris'];

  const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports'];
  const productNames = {
    'Electronics': ['Smartphone Neo', 'Laptop Pro 15', 'Wireless Earbuds', 'Smart Watch Gen 3', '4K Ultra Projector', 'Bluetooth Speaker Mini', 'Noise-Cancelling Headphones', 'Tablet Air 10', 'Charging Pad Duo', 'Mechanical Keyboard'],
    'Clothing': ['Classic Denim Jacket', 'Slim-Fit Chinos', 'Cotton Crewneck Tee', 'Wool Knit Sweater', 'Running Shoes Pro', 'Leather Belt', 'Fleece Zip Hoodie', 'Active Shorts', 'Silk Necktie', 'Waterproof Parka'],
    'Home & Kitchen': ['Stainless Steel Skillet', 'Coffee Maker Deluxe', 'Air Fryer Touch', 'Memory Foam Pillow', 'Chef Knife 8-inch', 'Electric Kettle', 'Ceramic Dinnerware Set', 'Robot Vacuum Cleaner', 'Blender Professional', 'Scented Candle Set'],
    'Books': ['Lessons of History', 'The Code of Life', 'Mystery of the Red Room', 'Sci-Fi Chronicles', 'Cooking Made Simple', 'Mindset for Success', 'Financial Freedom Guide', 'The Art of Writing', 'Travel Log Diaries', 'Astrophysics Intro'],
    'Sports': ['Yoga Mat Premium', 'Adjustable Dumbbells', 'Water Bottle Insulated', 'Backpack 30L', 'Tennis Racket Graphite', 'Resistance Bands Set', 'Sleeping Bag Thermal', 'Camping Tent 4-Person', 'Cycling Helmet', 'Golf Balls Pack']
  };

  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];

  // Seed Users
  const userStmt = db.prepare(`INSERT INTO users (name, email, status, created_at) VALUES (?, ?, ?, ?)`);
  const userList = [];
  for (let i = 1; i <= 65; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@example.com`;
    const status = Math.random() > 0.15 ? 'active' : 'inactive';
    
    const daysAgo = Math.floor(Math.random() * 730);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const created_at = date.toISOString().split('T')[0];

    userStmt.run(name, email, status, created_at);
    userList.push({ id: i, name, email });
  }

  // Seed Products
  const prodStmt = db.prepare(`INSERT INTO products (name, category, price, stock, created_at) VALUES (?, ?, ?, ?, ?)`);
  let prodIndex = 1;
  const productList = [];
  categories.forEach(cat => {
    productNames[cat].forEach((pname, index) => {
      const price = parseFloat((Math.random() * 150 + 10).toFixed(2));
      // Force exactly 6 products to be out of stock (stock = 0)
      const stock = (prodIndex % 10 === 0) ? 0 : Math.floor(Math.random() * 100) + 1;
      
      const daysAgo = Math.floor(Math.random() * 365);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const created_at = date.toISOString().split('T')[0];

      prodStmt.run(pname, cat, price, stock, created_at);
      productList.push({ id: prodIndex++, name: pname, category: cat, price, stock });
    });
  });

  // Seed Orders
  const orderStmt = db.prepare(`INSERT INTO orders (customer_id, order_total, order_date, status) VALUES (?, ?, ?, ?)`);
  const statuses = ['completed', 'completed', 'completed', 'shipped', 'pending', 'cancelled'];
  for (let i = 1; i <= 90; i++) {
    const customer = userList[Math.floor(Math.random() * userList.length)];
    const total = parseFloat((Math.random() * 450 + 20).toFixed(2));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Seed dates so that ~45-50 orders are in the last 30 days
    const isInLast30 = i <= 50;
    const daysAgo = isInLast30 ? Math.floor(Math.random() * 29) : Math.floor(Math.random() * 60) + 31;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const order_date = date.toISOString().split('T')[0];

    orderStmt.run(customer.id, total, order_date, status);
  }

  // Seed Employees
  const empStmt = db.prepare(`INSERT INTO employees (name, email, department, salary, hire_date) VALUES (?, ?, ?, ?, ?)`);
  for (let i = 1; i <= 60; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.emp.${i}@corp.com`;
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const salary = Math.floor(Math.random() * 70000) + 50000;
    
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const year = years[Math.floor(Math.random() * years.length)];
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const hire_date = `${year}-${month}-${day}`;

    empStmt.run(name, email, dept, salary, hire_date);
  }

  db.exec('COMMIT');
  console.log('SQLite database seeded successfully.');
}

export const queryDatabase = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDBSchema = () => {
  return new Promise((resolve, reject) => {
    try {
      const schema = {};
      const tables = ['users', 'products', 'orders', 'employees'];

      tables.forEach(table => {
        const stmt = db.prepare(`PRAGMA table_info(${table})`);
        const columns = stmt.all();
        
        schema[table] = columns.map(col => ({
          name: col.name,
          type: col.type,
          pk: col.pk === 1,
          notnull: col.notnull === 1
        }));
      });

      resolve(schema);
    } catch (err) {
      reject(err);
    }
  });
};

export default db;
