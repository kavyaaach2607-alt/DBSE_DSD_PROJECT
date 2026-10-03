# Inventory and Warehouse Management with AI

A backend system for managing products, warehouses, suppliers, and stock
transactions, with an AI microservice that forecasts demand and recommends
reorder quantities.

## Architecture

```
Frontend (React.js)  --->  Backend API (Node.js + Express.js)  --->  MySQL
                                        |
                                        v
                          ML Microservice (Python + Flask
                          + Pandas + Scikit-learn)
```

- **Backend (`/backend`)** — Express REST API. Handles auth, CRUD for
  products/warehouses/suppliers, stock transactions, reporting, and proxies
  forecast requests to the ML service.
- **Database (`/backend/db`)** — MySQL schema with tables, views, triggers
  (auto-updates `inventory` and raises `stock_alerts` on every transaction),
  and a stored procedure (`sp_add_transaction`) for safe transaction inserts.
- **ML Service (`/ml-service`)** — Flask API that fits a linear-regression
  demand model (falls back to a moving average with sparse data) per
  product, flags stock-out risk, and computes a recommended reorder
  quantity using lead-time + safety-stock logic. Also includes a standalone
  `train_and_evaluate.py` script for the project report (MAE/RMSE metrics).
- **Postman (`/postman`)** — Ready-to-import collection covering every
  endpoint.

## Database Schema Highlights

| Table | Purpose |
|---|---|
| `products`, `categories`, `suppliers`, `warehouses` | Master data |
| `inventory` | Live stock per product per warehouse |
| `transactions` | IN / OUT / TRANSFER / ADJUSTMENT stock movements |
| `purchase_orders` | Supplier restocking workflow |
| `stock_alerts` | Auto-generated low-stock / out-of-stock alerts |
| `sales_history` | Historical sales feeding the AI forecasting model |

Views: `vw_current_stock`, `vw_low_stock`, `vw_warehouse_valuation`.
Triggers: `trg_after_transaction_insert`, `trg_after_inventory_update`.
Procedure: `sp_add_transaction`.

## Setup

### 1. Database
```bash
mysql -u root -p < backend/db/schema.sql
mysql -u root -p < backend/db/seed.sql
```
(Or run both files in MySQL Workbench.)

### 2. Backend API
```bash
cd backend
cp .env.example .env      # fill in DB credentials and JWT_SECRET
npm install
npm run dev               # http://localhost:5000
```

### 3. ML Microservice
```bash
cd ml-service
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py              # http://localhost:8000
```

### 4. Test with Postman
Import `postman/Inventory_Warehouse_API.postman_collection.json`, register a
user, log in, copy the returned `token` into the collection's `token`
variable, then exercise the endpoints.

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| GET/POST/PUT/DELETE | `/api/products` | Product CRUD |
| GET/POST/PUT/DELETE | `/api/warehouses` | Warehouse CRUD |
| GET/POST/PUT/DELETE | `/api/suppliers` | Supplier CRUD |
| GET | `/api/inventory` | Current stock (filter by `warehouse_id`/`product_id`) |
| GET | `/api/inventory/low-stock` | Low-stock items |
| GET | `/api/inventory/alerts` | Active stock alerts |
| POST | `/api/transactions` | Record IN / OUT / TRANSFER / ADJUSTMENT |
| GET | `/api/reports/warehouse-valuation` | Stock value per warehouse |
| GET | `/api/reports/stock-summary` | Stock totals per product |
| GET | `/api/forecast/reorder/:productId` | AI-driven reorder recommendation |

## Deployment (Render)

1. Push this repo to GitHub.
2. Create a **MySQL** instance (e.g. Render's managed MySQL/PlanetScale/Railway)
   and run `schema.sql` + `seed.sql` against it.
3. Create a Render **Web Service** for `/backend` — build `npm install`,
   start `npm start`; set env vars from `.env.example` (point `DB_HOST` etc.
   at the managed MySQL instance, and `ML_SERVICE_URL` at step 4's URL).
4. Create a second Render **Web Service** for `/ml-service` — build
   `pip install -r requirements.txt`, start `gunicorn app:app`.
5. Point the React frontend's API base URL at the backend's Render URL.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, React.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL (schema, views, triggers, stored procedures)
- **AI/ML**: Python, Pandas, Scikit-learn (Flask microservice)
- **Testing**: Postman
- **Tooling**: VS Code, Git/GitHub, MySQL Workbench, Render
