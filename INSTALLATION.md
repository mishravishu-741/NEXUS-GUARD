# Installation Guide

This guide will walk you through setting up NEXUS GUARD on your local machine.

## Prerequisites

### Backend Requirements
- Python 3.11 or higher
- pip (Python package manager)
- SQLite (included with Python) or PostgreSQL 14+

### Frontend Requirements
- Node.js 18 or higher
- npm 9 or higher

### System Requirements
- 2GB RAM minimum (4GB recommended)
- 2GB free disk space
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nexus-guard
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Edit .env with your settings
# Important: Change SECRET_KEY and ADMIN_PASSWORD in production!
nano .env  # or use your preferred editor

# Initialize database and start server
python -m app.main
```

The backend will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: http://localhost:5173

### 4. Access the Application

1. Open http://localhost:5173 in your browser
2. Login with default admin credentials:
   - Email: admin@nexusguard.local
   - Password: SecureAdmin123!
3. Set up MFA (recommended) after first login

## Configuration

### Environment Variables (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | NEXUS GUARD |
| `DEBUG` | Enable debug mode | true |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8000 |
| `DATABASE_URL` | Database connection string | sqlite+aiosqlite:///./nexus_guard.db |
| `SECRET_KEY` | JWT secret key (CHANGE IN PRODUCTION!) | Auto-generated |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | 7 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:5173,http://localhost:3000 |
| `ADMIN_EMAIL` | Default admin email | admin@nexusguard.local |
| `ADMIN_PASSWORD` | Default admin password (CHANGE!) | SecureAdmin123! |

### Database Configuration

#### SQLite (Default - Development)
```env
DATABASE_URL=sqlite+aiosqlite:///./nexus_guard.db
```

#### PostgreSQL (Production)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/nexus_guard
```

Run migrations after changing database:
```bash
alembic upgrade head
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
pytest -v

# Frontend build test
cd frontend
npm run build
```

### Code Quality

```bash
# Backend formatting
cd backend
black app/
isort app/

# Frontend linting
cd frontend
npm run lint
```

## Production Deployment

### Backend
1. Set `DEBUG=false` in .env
2. Generate a strong `SECRET_KEY`
3. Change `ADMIN_PASSWORD`
4. Use PostgreSQL database
5. Set up reverse proxy (nginx)
6. Use process manager (systemd, supervisor, or PM2)
7. Enable HTTPS with SSL certificates

### Frontend
1. Build production bundle: `npm run build`
2. Serve `dist/` folder with nginx or similar
3. Configure API proxy to backend

### Docker Deployment (Optional)
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "-m", "app.main"]

# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version: `python --version`
- Ensure virtual environment is activated
- Check port 8000 is available
- Verify .env file exists and has valid values

**Frontend won't start:**
- Check Node.js version: `node --version`
- Delete `node_modules` and run `npm install` again
- Check port 5173 is available

**Database errors:**
- Delete `nexus_guard.db` and restart backend to recreate
- Check DATABASE_URL format
- For PostgreSQL, ensure database exists and user has permissions

**CORS errors:**
- Add your frontend URL to `CORS_ORIGINS` in .env
- Restart backend after changes

**MFA not working:**
- Ensure system time is synchronized
- Check QR code scans correctly in authenticator app
- Try backup codes if TOTP fails

### Logs

Backend logs are printed to console. For production, configure logging to file:
```python
# In .env or config
LOG_LEVEL=INFO
LOG_FILE=/var/log/nexus-guard/app.log
```

## Support

For issues and questions:
- Check the [API Documentation](http://localhost:8000/docs)
- Review [Architecture Documentation](docs/ARCHITECTURE.md)
- Check [Security Documentation](docs/SECURITY.md)