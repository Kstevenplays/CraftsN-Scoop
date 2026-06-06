# Crafts N Scoop

A Shopee-style ecommerce MVP for a small business selling handmade crafts and scoop goods.

## Stack

- Frontend: Angular 17 (standalone components, Angular Router, Signals)
- Backend: PHP 8.2 + Slim Framework 4 (REST API)
- Database: SQLite (PDO)
- Auth: JWT (customer + admin role)
- Cart state: Angular Signals + localStorage
- Shipping fee: flat fixed rate (configurable in backend `.env`)

## Monorepo Structure

- `frontend/` Angular app
- `backend/` Slim API

## Features

- Customer register/login with JWT auth
- Product browsing and product details
- Cart with local persistence
- Checkout with fixed shipping fee
- Customer order history
- Admin dashboard:
  - Product create/update/delete
  - Product image upload
  - Order listing + status update

## Local Setup

### 1) Backend (Slim API)

From repo root:

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Install Composer dependencies:

```powershell
# If composer is globally installed
composer install

# Or with XAMPP PHP + local composer.phar
C:\xampp\php\php.exe composer.phar install
```

Run API:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8080 -t public
```

Health check:

- `http://127.0.0.1:8080/health`

Default seeded admin from `.env`:

- email: `admin@craftsnscoop.local`
- password: `admin12345`

### 2) Frontend (Angular)

In a new terminal:

```powershell
Set-Location frontend
npm install
npm start
```

App URL:

- `http://127.0.0.1:4200`

Angular dev server proxies `/api` to `http://127.0.0.1:8080` via `frontend/proxy.conf.json`.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me` (auth)
- `GET /api/products`
- `GET /api/products/{id}`
- `POST /api/orders` (auth)
- `GET /api/orders/me` (auth)
- `POST /api/admin/products` (admin)
- `POST /api/admin/upload-image` (admin, multipart/form-data with `image`)
- `PUT /api/admin/products/{id}` (admin)
- `DELETE /api/admin/products/{id}` (admin)
- `GET /api/admin/orders` (admin)
- `PATCH /api/admin/orders/{id}/status` (admin)

## Deployment

Vercel does not natively host PHP APIs directly in this architecture.
Deploy as split services:

1. Frontend to Vercel
2. Backend API to Railway

### Frontend to Vercel

1. Import the repository in Vercel.
2. Set Root Directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist/frontend/browser`
5. `frontend/vercel.json` is included for SPA routing fallback.

### Backend to Railway

1. In Railway, create a new project from this repository.
2. Set Root Directory to `backend`.
3. Ensure environment variables are set:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=<your railway app url>`
   - `FRONTEND_URL=<your vercel domain>`
   - `JWT_SECRET=<long-random-secret>`
   - `JWT_TTL=86400`
   - `DB_PATH=storage/database.sqlite`
   - `ADMIN_EMAIL=<admin email>`
   - `ADMIN_PASSWORD=<admin password>`
   - `SHIPPING_FEE=80`
4. Railway uses `backend/Procfile` to start PHP.

After deploying backend, update frontend API target for production:

- Option A: Add an API gateway/proxy in front of Railway and keep `/api` relative.
- Option B: Replace `API_BASE` in `frontend/src/app/core/api.ts` with your Railway API URL and rebuild.

## Notes

- SQLite storage is file-based (`backend/storage/database.sqlite`).
- First run auto-creates schema and sample products.
- CORS allows localhost + configured frontend URL.
- Uploaded images are served from `backend/public/uploads/`.
