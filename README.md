* **Natural Language Processing**: Translates plain-English requests (e.g., *"List all users"*, *"Show me all orders placed in the last 30 days"*) into syntactically valid SQLite queries.
* **Editable SQL Editor**: Live editor component that displays the generated SQL, allows custom manual adjustments, and supports direct execution.
* **Schema Explorer Panel**: Sidebar detailing database tables, columns, types, primary keys (PK), and foreign keys (FK).
* **Interactive Results Table**: Responsive grid containing column-headers, client-side sorting, local text search/filtering, rows-per-page controls, and a **Download to CSV** button.
* **Session Query History**: Clickable log tracking executed prompts, result counts, and execution speeds, allowing users to reload previous configurations instantly.
* **Security & Mutation Blocker**: Inspects SQL queries case-insensitively and declines execution for mutations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.).
* **Friendly Database Error Catching**: Intercepts SQLite exceptions and explains mistakes (like missing columns or tables) in clear plain English.
---
## 🛠️ Technology Stack
* **Frontend**: React (v18), Vite, HTML5, Vanilla CSS (Glassmorphism & dark-mode design tokens).
* **Backend Server**: Node.js, Express.
* **Database**: Native SQLite via Node's built-in `node:sqlite` (DatabaseSync) module. 
  * *Why `node:sqlite`?* Avoids slow native npm compilation issues on Windows, works 100% offline, and loads databases instantly.
---
## 🗄️ Database Schema
The database is automatically created and seeded with **60+ rows of realistic mock data** distributed across 4 tables:
* **`users`**: Customer data (id, name, email, status, created_at).
* **`products`**: Inventory catalog (id, name, category, price, stock, created_at).
* **`orders`**: Transaction records referencing users (id, customer_id, order_total, order_date, status).
* **`employees`**: Internal corporate directory (id, name, email, department, salary, hire_date).
---
## ⚡ Setup & Running Instructions
### Prerequisites
* Node.js (v22.5.0 or higher is required to support the native `node:sqlite` module).
### Installation
1. Clone this repository to your local machine.
2. Navigate into the directory and install dependencies:
   ```bash
   npm install
   Start Backend:
   npm run server
   Start Frontend (Vite):
   npm run dev
