# NEXUS GUARD — Zero Trust Network Security System

A complete, professional-grade Zero Trust Network Security System built with React, FastAPI, and modern security practices.

## Features

- **Authentication System**: JWT authentication, password hashing, TOTP-based MFA, role-based access control
- **Zero Trust Engine**: Never Trust, Always Verify - continuous identity verification, device trust evaluation, risk scoring
- **Device Management**: Device registration, inventory, trust assessment, approval/revocation workflows
- **Network Monitoring**: Real-time network activity, IP monitoring, connection tracking, suspicious detection
- **Threat Detection**: Suspicious login detection, failed login monitoring, unusual access attempts, threat severity classification
- **Policy Management**: Dynamic policy creation, access rules, risk thresholds, evaluation history
- **Audit Logging**: Comprehensive activity logs, search/filter, export capabilities
- **Admin Dashboard**: Real-time metrics, threat analytics, access decision analytics, security status indicators

## Technology Stack

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- Lucide React for icons
- Recharts for data visualization
- Axios for API communication

### Backend
- Python 3.11+ with FastAPI
- SQLAlchemy ORM with SQLite/PostgreSQL
- Pydantic for validation
- JWT authentication with python-jose
- Password hashing with passlib/bcrypt
- TOTP MFA with pyotp
- Uvicorn ASGI server

### Testing
- Pytest for backend testing
- Frontend build verification

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and navigate
cd nexus-guard

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
python -m app.main

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Default Admin Account
- Email: admin@nexusguard.com
- Password: SecureAdmin123!
- MFA: Enable after first login

## Project Structure

```
nexus-guard/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, security, database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routers/        # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Custom middleware
│   │   ├── zero_trust/     # Zero Trust engine
│   │   ├── monitoring/     # Network monitoring
│   │   ├── detection/      # Threat detection
│   │   ├── audit/          # Audit logging
│   │   └── main.py         # Application entry point
│   ├── tests/              # Backend tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── layouts/        # Layout components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context providers
│   │   ├── assets/         # Static assets
│   │   ├── styles/         # Global styles
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   └── SECURITY.md
├── README.md
├── INSTALLATION.md
├── CONTRIBUTING.md
└── .gitignore
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Security](docs/SECURITY.md)
- [Installation Guide](INSTALLATION.md)

## Security

- All passwords hashed with bcrypt
- JWT tokens with configurable expiration
- TOTP-based MFA support
- Rate limiting on auth endpoints
- CORS configured for production
- Input validation on all endpoints
- Audit logging for all security events

## License

MIT License - see LICENSE file for details.