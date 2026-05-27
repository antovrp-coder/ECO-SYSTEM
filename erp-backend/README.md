# ERP System Backend

A Go Gin backend for the ERP system with PostgreSQL database integration.

## Prerequisites

- Go 1.19+
- PostgreSQL 12+

## Setup

### 1. Initialize PostgreSQL Database

Connect to PostgreSQL and run the initialization script:

```bash
psql -U postgres -f init.sql
```

Or manually:
```bash
psql -U postgres
postgres=# \i 'C:/path/to/init.sql'
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` with your database connection details:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=erp_system
SERVER_PORT=:8080
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

If the frontend is served from a different origin, add that exact origin to `WEBAUTHN_RP_ORIGINS`. For example, if Angular runs on port 4300, use `http://localhost:4300`. If you use a custom hostname, set `WEBAUTHN_RP_ID` to that hostname and include its full origin in `WEBAUTHN_RP_ORIGINS`.

### 3. Install Dependencies

```bash
go mod download
```

### 4. Run the Server

```bash
go run .
```

The server will start on `http://localhost:8080`

## API Endpoints

### Modules
- `GET /api/modules` - Get all modules
- `POST /api/modules` - Create a new module

### Menu Items
- `GET /api/modules/:id/menus` - Get menu items for a module
- `POST /api/menus` - Create a new menu item

### Health Check
- `GET /health` - Server health status

## Example Requests

### Get All Modules
```bash
curl http://localhost:8080/api/modules
```

### Get Menu Items for Module 1
```bash
curl http://localhost:8080/api/modules/1/menus
```

### Create a New Module
```bash
curl -X POST http://localhost:8080/api/modules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance",
    "icon": "attach_money",
    "order": 4
  }'
```

### Create a New Menu Item
```bash
curl -X POST http://localhost:8080/api/menus \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": 1,
    "name": "Quotes",
    "route": "/sales/quotes",
    "order": 4
  }'
```

## Database Structure

### modules table
- `id`: Primary key
- `name`: Module name
- `icon`: Material icon name
- `order`: Display order
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

### menu_items table
- `id`: Primary key
- `module_id`: Foreign key to modules
- `name`: Menu item name
- `route`: Route/path for the menu item
- `order`: Display order
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

### users table
- `id`: Primary key
- `username`: Unique login name
- `email`: Unique email address
- `full_name`: Display name
- `password_hash`: Bcrypt hashed password
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp
