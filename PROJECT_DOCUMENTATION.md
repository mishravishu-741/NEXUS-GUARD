# NEXUS GUARD - Complete Project Documentation

## Executive Summary

**NEXUS GUARD** is a production-ready, enterprise-grade **Zero Trust Network Security System** built with modern technologies following security-first principles. The system implements the "Never Trust, Always Verify" philosophy with continuous authentication, device trust evaluation, policy-based access control, real-time threat detection, and comprehensive audit logging.

---

## Technology Stack Overview

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | FastAPI | 0.109.0 | Modern, fast Python web framework with automatic OpenAPI docs |
| **ASGI Server** | Uvicorn | 0.27.0 | High-performance async server for FastAPI |
| **Language** | Python | 3.11+ | Primary backend programming language |
| **ORM** | SQLAlchemy | 2.0.25 | Async ORM with 2.0 style queries |
| **Database (Dev)** | SQLite + aiosqlite | 3.45+ / 0.19.0 | Lightweight embedded database for development |
| **Database (Prod)** | PostgreSQL + asyncpg | 15+ / 0.29.0 | Production-grade relational database |
| **Migrations** | Alembic | 1.13.1 | Database schema version control |
| **Validation** | Pydantic | 2.5.3 | Data validation and settings management |
| **Settings** | Pydantic Settings | 2.1.0 | Environment-based configuration |
| **Auth - JWT** | python-jose[cryptography] | 3.3.0 | JWT token creation and validation |
| **Auth - Passwords** | passlib[bcrypt] | 1.7.4 | Secure password hashing with bcrypt |
| **Auth - MFA** | pyotp | 2.9.0 | TOTP (Time-based One-Time Password) implementation |
| **Auth - QR Codes** | qrcode[pil] | 7.4.2 | QR code generation for MFA enrollment |
| **Cryptography** | cryptography | 41.0.7 | Low-level cryptographic primitives |
| **Email Validation** | email-validator | 2.1.0.post1 | RFC-compliant email validation |
| **HTTP Client** | httpx | 0.26.0 | Async HTTP client for testing and external APIs |
| **Date Utilities** | python-dateutil | 2.8.2 | Advanced date/time parsing and manipulation |
| **Caching** | redis | 5.0.1 | Redis client for future caching layer |
| **Testing** | pytest | 7.4.4 | Test framework with async support |
| **Async Testing** | pytest-asyncio | 0.23.3 | Async test support for pytest |
| **Coverage** | pytest-cov | 4.1.0 | Test coverage reporting |
| **Type Hints** | typing-extensions | 4.9.0 | Extended type hints for Python 3.11+ |
| **Environment** | python-dotenv | 1.0.0 | .env file loading |

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 18.2.0 | Modern UI library with hooks and concurrent features |
| **Build Tool** | Vite | 5.0.0 | Fast build tool with HMR |
| **Language** | JavaScript (ESM) | ES2022+ | Modern JavaScript with modules |
| **Routing** | React Router DOM | 6.20.0 | Client-side routing with nested routes |
| **HTTP Client** | Axios | 1.6.2 | Promise-based HTTP client with interceptors |
| **Charts** | Recharts | 2.10.3 | Composable charting library built on D3 |
| **Icons** | Lucide React | 0.294.0 | Clean, consistent SVG icon set |
| **Styling** | Tailwind CSS | 3.3.5 | Utility-first CSS framework |
| **CSS Processing** | PostCSS + Autoprefixer | 8.4.31 / 10.4.16 | CSS transformation and vendor prefixing |
| **Class Utilities** | clsx | 2.0.0 | Conditional className composition |
| **Tailwind Merge** | tailwind-merge | 2.1.0 | Merge Tailwind classes without conflicts |
| **Date Formatting** | date-fns | 2.30.0 | Modern date utility library |
| **Notifications** | react-hot-toast | 2.4.1 | Lightweight toast notifications |
| **State Management** | Zustand | 4.4.7 | Minimal, scalable state management |
| **Forms** | React Hook Form | (via forms) | Performant form validation |
| **Linting** | ESLint | 8.53.0 | Code quality and consistency |
| **React Plugins** | eslint-plugin-react* | Latest | React-specific linting rules |

### Development & Operations

| Category | Technology | Purpose |
|----------|------------|---------|
| **Version Control** | Git | Source code management |
| **Package Manager (Python)** | pip | Python dependency management |
| **Package Manager (Node)** | npm | JavaScript dependency management |
| **Virtual Environment** | venv | Python isolation |
| **Process Manager** | uvicorn (dev) / systemd (prod) | Application process management |
| **Reverse Proxy** | nginx (recommended) | Production load balancing and SSL termination |
| **Containerization** | Docker (optional) | Container deployment |
| **CI/CD** | GitHub Actions (ready) | Automated testing and deployment |

---

## Project Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Web Browser   │  │   Mobile App    │  │   API Clients   │             │
│  │   (React SPA)   │  │   (Future)      │  │   (CLI/SDK)     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                    ┌───────────────────────┐                                │
│                    │      HTTPS/TLS        │                                │
│                    │      Port 5173        │                                │
│                    └───────────┬───────────┘                                │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Application (Port 8000)                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Auth    │ │ Devices  │ │ Policies │ │Monitoring│ │ Dashboard│  │   │
│  │  │  Router  │ │  Router  │ │  Router  │ │  Router  │ │  Router  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Security │ │ Threat   │ │ Audit    │ │ Access   │ │  Users   │  │   │
│  │  │ Events   │ │ Alerts   │ │  Logs    │ │Decisions │ │  Router  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ Zero Trust       │  │ Threat Detection │  │ Monitoring       │         │
│  │ Engine           │  │ Service          │  │ Service          │         │
│  │                  │  │                  │  │                  │         │
│  │ • Identity Verify│  │ • Brute Force    │  │ • System Metrics │         │
│  │ • Device Trust   │  │ • Cred Stuffing  │  │ • Network Conns  │         │
│  │ • Policy Eval    │  │ • Suspicious     │  │ • Process List   │         │
│  │ • Access Decision│  │ • Impossible     │  │ • Port Scanning  │         │
│  │ • Risk Scoring   │  │ • Device Risks   │  │ • Interface Stats│         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │   SQLite     │  │ PostgreSQL   │  │   Redis      │                     │
│  │ (Development)│  │ (Production) │  │ (Caching)    │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Module Structure

```
backend/
├── app/
│   ├── core/                    # Core infrastructure
│   │   ├── config.py           # Application settings (Pydantic Settings)
│   │   ├── database.py         # Async database engine, sessions, initialization
│   │   └── security.py         # Auth utilities: JWT, bcrypt, TOTP, QR codes
│   ├── models/                 # SQLAlchemy ORM Models (12 models)
│   │   ├── __init__.py         # Model exports
│   │   ├── user.py             # User, Role - Authentication & authorization
│   │   ├── device.py           # Device - Device inventory with trust scoring
│   │   ├── policy.py           # Policy, PolicyEvaluation - Access control rules
│   │   ├── security_event.py   # SecurityEvent - Immutable security event log
│   │   ├── threat_alert.py     # ThreatAlert - Threat detection with severity
│   │   ├── audit_log.py        # AuditLog - Administrative action trail
│   │   ├── session.py          # LoginSession - Active session tracking
│   │   ├── access_decision.py  # AccessDecision - Zero Trust decision records
│   │   ├── mfa.py              # MFAConfig - TOTP/Backup code configuration
│   │   └── network_connection.py # NetworkConnection - Connection monitoring
│   ├── schemas/                # Pydantic Validation Schemas (9 modules)
│   │   ├── __init__.py         # Schema exports
│   │   ├── user.py             # User CRUD, auth, MFA, registration schemas
│   │   ├── device.py           # Device CRUD, trust assessment schemas
│   │   ├── policy.py           # Policy CRUD, evaluation request/response
│   │   ├── security_event.py   # Event listing, filtering, statistics
│   │   ├── threat_alert.py     # Alert listing, updates, filtering, stats
│   │   ├── audit_log.py        # Log listing, filtering, export schemas
│   │   ├── access_decision.py  # Decision request/response, listing
│   │   └── dashboard.py        # Dashboard stats, charts, analytics schemas
│   ├── routers/                # API Route Handlers (10 routers)
│   │   ├── __init__.py         # Router exports
│   │   ├── auth.py             # Authentication endpoints (8 endpoints)
│   │   ├── users.py            # User management (7 endpoints)
│   │   ├── devices.py          # Device management (7 endpoints)
│   │   ├── policies.py         # Policy management (6 endpoints)
│   │   ├── security_events.py  # Security events (4 endpoints)
│   │   ├── threat_alerts.py    # Threat alerts (4 endpoints)
│   │   ├── audit_logs.py       # Audit logs (3 endpoints)
│   │   ├── access_decisions.py # Access decisions (3 endpoints)
│   │   ├── dashboard.py        # Dashboard analytics (7 endpoints)
│   │   └── monitoring.py       # System monitoring (5 endpoints)
│   ├── services/               # Business Logic Layer (3 services)
│   │   ├── __init__.py         # Service exports
│   │   ├── zero_trust.py       # Zero Trust Engine (core security logic)
│   │   ├── threat_detection.py # Automated threat detection rules
│   │   └── monitoring.py       # System/network monitoring
│   └── main.py                 # FastAPI application factory
├── tests/                      # Test Suite (5 test modules + fixtures)
│   ├── conftest.py             # Shared fixtures (db, client, auth headers)
│   ├── test_auth.py            # Authentication tests (10 tests)
│   ├── test_devices.py         # Device management tests (8 tests)
│   ├── test_policies.py        # Policy management tests (6 tests)
│   ├── test_zero_trust.py      # Zero Trust engine tests (6 tests)
│   ├── test_threat_detection.py # Threat detection tests (7 tests)
│   └── pytest.ini              # Pytest configuration
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
└── pytest.ini                  # Test configuration
```

### Frontend Module Structure

```
frontend/
├── public/
│   └── favicon.svg             # Application favicon
├── src/
│   ├── components/             # Reusable UI Components
│   │   └── ui/                 # Base UI component library
│   │       ├── index.js        # Barrel exports
│   │       ├── Button.jsx      # 5 variants, 3 sizes, loading state
│   │       ├── Input.jsx       # Form input with error state
│   │       ├── Card.jsx        # Card, Header, Content, Footer
│   │       ├── Badge.jsx       # 6 variants (primary, success, warning, danger, info)
│   │       └── Table.jsx       # Table container, header, body, row, head, cell
│   ├── pages/                  # Route-Level Page Components (11 pages)
│   │   ├── LoginPage.jsx       # Professional login with MFA flow
│   │   ├── RegisterPage.jsx    # Registration with password strength meter
│   │   ├── DashboardPage.jsx   # 6 stat cards, 6 interactive charts, activity feed
│   │   ├── DevicesPage.jsx     # Device table with trust/risk bars, modals
│   │   ├── NetworkPage.jsx     # 5-tab monitoring (overview, connections, processes, ports, interfaces)
│   │   ├── ThreatsPage.jsx     # Threat table with severity/status filters, evidence modal
│   │   ├── PoliciesPage.jsx    # Policy CRUD with JSON conditions, toggle activation
│   │   ├── AccessDecisionsPage.jsx # Decision log with MFA status, risk/trust scores
│   │   ├── AuditLogsPage.jsx   # Audit trail with export, old/new values diff
│   │   ├── SecurityEventsPage.jsx # Security event log with resolve actions
│   │   ├── UsersPage.jsx       # Admin-only user management with activate/deactivate
│   │   └── SettingsPage.jsx    # 5-tab settings (profile, security, MFA, notifications, appearance)
│   ├── layouts/                # Layout Wrappers
│   │   └── MainLayout.jsx      # Collapsible sidebar, top bar, notifications, user menu
│   ├── services/               # API Service Layer
│   │   └── api.js              # Axios instance with JWT interceptors, auto-refresh
│   ├── context/                # React Context Providers
│   │   └── AuthContext.jsx     # Authentication state, login/logout, MFA, user profile
│   ├── utils/                  # Utility Functions
│   │   └── helpers.js          # 25+ helpers (formatting, colors, validation, JWT parsing)
│   ├── styles/                 # Global Styles
│   │   └── index.css           # Tailwind + custom CSS (animations, scrollbars, Recharts theme)
│   ├── App.jsx                 # Routing with ProtectedRoute/PublicRoute
│   └── main.jsx                # React entry point with providers
├── index.html                  # HTML template with font preloading
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration with API proxy
├── tailwind.config.js          # Tailwind theme (colors, fonts, animations)
└── postcss.config.js           # PostCSS plugins
```

---

## Detailed Feature Documentation

### 1. Authentication System

**Backend Implementation:** `backend/app/routers/auth.py`, `backend/app/core/security.py`

| Feature | Implementation Details |
|---------|------------------------|
| **User Registration** | POST `/api/auth/register` - Email, username, password with complexity validation, auto-verified |
| **User Login** | POST `/api/auth/login` - Email/password, JWT + refresh tokens, MFA challenge support |
| **Token Refresh** | POST `/api/auth/refresh` - Refresh token rotation, session validation |
| **Logout** | POST `/api/auth/logout` - Session revocation, audit logging |
| **JWT Tokens** | HS256 algorithm, 30min access / 7day refresh, user_id, role, session_id claims |
| **Password Security** | bcrypt with 12 rounds, complexity requirements (upper, lower, digit, special) |
| **MFA - TOTP** | RFC 6238 compliant, base32 secrets, ±1 window, QR code enrollment |
| **MFA - Backup Codes** | 10 single-use codes, bcrypt hashed, regeneration support |
| **Session Management** | Database-backed, device association, expiry tracking, concurrent sessions |
| **Rate Limiting** | Configured for auth endpoints (10 req/min per IP) |
| **Account Lockout** | 5 failed attempts → 15min lockout |

**Frontend Implementation:** `frontend/src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `SettingsPage.jsx` (MFA tab)

### 2. Zero Trust Engine

**Backend Implementation:** `backend/app/services/zero_trust.py`

The core security engine implementing "Never Trust, Always Verify":

| Component | Description |
|-----------|-------------|
| **Identity Verification** | `verify_identity()` - Checks user status, failed attempts, lockout, device trust, IP reputation, geo-anomalies |
| **Device Trust Evaluation** | `calculate_device_trust_score()` - 6-factor scoring: status, age, fingerprint, activity, security events, IP consistency |
| **Policy Evaluation** | `evaluate_policies()` - Priority-ordered policy matching with conditions, risk/trust thresholds, scope |
| **Access Decision** | `make_access_decision()` - Combines identity, device, policy results → Allow/Deny/Challenge/Monitor |
| **Continuous Verification** | Every API request evaluated, not just initial authentication |

**Decision Flow:**
```
Request → Extract Context → Verify Identity → Evaluate Device Trust 
  → Evaluate Policies (priority order) → Make Decision (Allow/Deny/Challenge/Monitor)
  → Log Decision → Run Threat Detection → Return Response
```

**Risk/Trust Scoring:**
- **Trust Score (0-100):** Higher = more trusted device/user
- **Risk Score (0-100):** Higher = more suspicious activity
- **Decision Thresholds:** ≥80 risk = Deny, ≥60 risk = Challenge, ≥40 risk + <50 trust = Challenge

### 3. Device Management

**Backend:** `backend/app/routers/devices.py`, `backend/app/models/device.py`
**Frontend:** `frontend/src/pages/DevicesPage.jsx`

| Feature | Details |
|---------|---------|
| **Registration** | Device fingerprint (device_id), user agent, screen, timezone, OS/browser detection |
| **Statuses** | `pending` → `trusted` / `untrusted` / `revoked` |
| **Trust Scoring** | Real-time calculation (0-100) with visual progress bars |
| **Risk Scoring** | Real-time calculation (0-100) with visual progress bars |
| **Approval Workflow** | Admin approve/reject with reason, audit logging |
| **Revocation** | Immediate session termination, device marked revoked |
| **Trust Assessment** | Detailed factor breakdown with recommendations |
| **Device Types** | desktop, laptop, mobile, tablet, server, iot, unknown |

### 4. Network Monitoring

**Backend:** `backend/app/routers/monitoring.py`, `backend/app/services/monitoring.py`
**Frontend:** `frontend/src/pages/NetworkPage.jsx` (5 tabs)

| Tab | Data Source | Features |
|-----|-------------|----------|
| **Overview** | `psutil` + `/monitoring/metrics` | CPU, Memory, Disk, Connections with progress bars + Area chart |
| **Connections** | `/monitoring/connections` | Active TCP/UDP connections, process mapping, suspicious port detection |
| **Processes** | `/monitoring/processes` | Network-active processes with CPU/memory % |
| **Ports** | `/monitoring/ports` | Listening ports with risk classification (22, 3389, 4444, etc.) |
| **Interfaces** | `/monitoring/stats` | Per-interface traffic (sent/recv MB, packets, errors) |

**Security Integration:** Automatic threat alerts for connections to known malicious IPs, suspicious ports

### 5. Threat Detection

**Backend:** `backend/app/services/threat_detection.py`, `backend/app/routers/threat_alerts.py`
**Frontend:** `frontend/src/pages/ThreatsPage.jsx`

| Detection Rule | Trigger | Severity |
|----------------|---------|----------|
| **Brute Force (User)** | 5+ failed logins/user/15min | Medium → High (10+) |
| **Brute Force (IP)** | 10+ failed logins/IP/15min | High |
| **Credential Stuffing** | 5+ unique users/IP/hour | Medium → High (10+) |
| **Suspicious Login - New Device** | Login from pending device | Medium |
| **Suspicious Login - Untrusted** | Login from untrusted device | High |
| **Suspicious Login - High Risk** | Device risk score >70 | High |
| **Suspicious Login - VPN/Proxy/Tor** | IP reputation check | Medium/High |
| **Impossible Travel** | Different IP <1 hour apart | High |
| **Access Anomalies** | 5+ denials/user/30min | Medium |
| **High-Risk Access** | Risk score >70 on access attempt | High/Critical |
| **Periodic Device Scan** | Trusted device risk >80 | High |

**Alert Management:** Status workflow (open → investigating → mitigated/false_positive/closed), assignment, evidence/IOC storage

### 6. Policy Management

**Backend:** `backend/app/routers/policies.py`, `backend/app/models/policy.py`
**Frontend:** `frontend/src/pages/PoliciesPage.jsx`

| Feature | Details |
|---------|---------|
| **Policy Types** | access, device, network, threat, authentication |
| **Actions** | allow, deny, challenge, monitor |
| **Priority** | 1-1000 (lower = higher priority) |
| **Conditions** | JSON-based: resource_type, action, custom fields |
| **Risk/Trust Thresholds** | Min/max risk score, min/max trust score |
| **Scope** | Roles, device IDs, network CIDRs |
| **Evaluation History** | PolicyEvaluation records with matched conditions |
| **Toggle** | Activate/deactivate without deletion |

### 7. Audit Logging

**Backend:** `backend/app/routers/audit_logs.py`, `backend/app/models/audit_log.py`
**Frontend:** `frontend/src/pages/AuditLogsPage.jsx`

| Logged Actions | Resource Types |
|----------------|----------------|
| create, read, update, delete | user, device, policy, security_event, threat_alert, audit_log, session, mfa, config, report |
| login, logout, export, import | |
| approve, revoke, enable, disable | |

**Features:** Structured JSON old/new values, changed fields array, correlation IDs, success/failure tracking, CSV export

### 8. Admin Dashboard

**Backend:** `backend/app/routers/dashboard.py`
**Frontend:** `frontend/src/pages/DashboardPage.jsx`

| Widget | Chart Type | Data |
|--------|------------|------|
| **Stat Cards (6)** | Numbers with trends | Users, Devices, Events 24h, Alerts, Decisions 24h, Pending Devices |
| **Events by Severity** | Pie Chart | Security event distribution |
| **Alerts by Severity** | Pie Chart | Threat alert distribution |
| **Access Decisions** | Horizontal Bar | Allow/Deny/Challenge/Monitor counts |
| **Device Trust Distribution** | Horizontal Bar | 5 trust score ranges (0-20, 21-40, etc.) |
| **Login Trends (7d)** | Area Chart | Daily successful logins |
| **Threat Trends (7d)** | Line Chart | Daily threat detections |
| **Recent Activity** | Table | Latest 10 security events |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌──────────────────┐
│    users    │       │   devices   │       │   login_sessions │
├─────────────┤       ├─────────────┤       ├──────────────────┤
│ id (PK)     │◄──────│ owner_id    │       │ id (PK)          │
│ email       │       │ id (PK)     │──────►│ session_token    │
│ username    │       │ device_id   │       │ refresh_token_   │
│ password    │       │ status      │       │ user_id (FK)     │
│ role        │       │ trust_score │       │ device_id (FK)   │
│ is_active   │       │ risk_score  │       │ status           │
│ failed_     │       │ os/browser  │       │ ip, user_agent   │
│ locked_until│       │ ip, location│       │ mfa_verified     │
└─────────────┘       └──────┬──────┘       └──────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │security_   │ │  threat_   │ │ access_    │
       │ events     │ │  alerts    │ │ decisions  │
       ├────────────┤ ├────────────┤ ├────────────┤
       │ id (PK)    │ │ id (PK)    │ │ id (PK)    │
       │ user_id    │ │ user_id    │ │ user_id    │
       │ device_id  │ │ device_id  │ │ device_id  │
       │ event_type │ │ threat_type│ │ decision   │
       │ severity   │ │ severity   │ │ risk_score │
       │ is_resolved│ │ status     │ │ trust_score│
       └────────────┘ └────────────┘ └────────────┘
              ▲              ▲              ▲
              │              │              │
       ┌──────┴──────┐ ┌─────┴──────┐ ┌────┴─────┐
       │   audit_    │ │  policies  │ │  mfa_    │
       │   logs      │ │            │ │  configs │
       ├────────────┤ ├────────────┤ ├──────────┤
       │ id (PK)    │ │ id (PK)    │ │ id (PK)  │
       │ user_id    │ │ conditions │ │ user_id  │
       │ action     │ │ priority   │ │ totp_sec │
       │ resource   │ │ action     │ │ backup_  │
       │ old/new    │ │ risk/trust │ │  enabled │
       └────────────┘ └────────────┘ └──────────┘
```

### Tables Summary (12 Tables)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | Authentication & authorization | email, username, email+active |
| `roles` | Role definitions | name |
| `devices` | Device inventory | device_id, owner+status, status+trust, last_seen |
| `policies` | Access control rules | type+active, priority |
| `policy_evaluations` | Evaluation history | policy+created, decision |
| `security_events` | Immutable event log | type+severity, user+created, device+created, resolved |
| `threat_alerts` | Threat detection | type+severity, status, user+status, detected |
| `audit_logs` | Admin action trail | action+resource, user+created, resource, correlation |
| `login_sessions` | Session tracking | user+status, expires, token |
| `access_decisions` | Zero Trust decisions | user+created, device+created, decision, correlation |
| `mfa_configs` | MFA settings | user_id |
| `network_connections` | Connection monitoring | local, remote, status, pid, created |

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login with email/password/MFA | Public |
| POST | `/refresh` | Refresh access token | Refresh Token |
| POST | `/logout` | Logout current session | Bearer |
| POST | `/mfa/setup` | Initiate MFA setup | Bearer |
| POST | `/mfa/verify` | Verify TOTP token | Bearer |
| GET | `/mfa/status` | Get MFA status | Bearer |
| POST | `/mfa/disable` | Disable MFA | Bearer |
| GET | `/me` | Get current user profile | Bearer |

### Users (`/api/users`) - Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users (paginated, filtered) |
| GET | `/{id}` | Get user details |
| POST | `/` | Create user |
| PATCH | `/{id}` | Update user |
| DELETE | `/{id}` | Delete user |
| POST | `/{id}/activate` | Activate user |
| POST | `/{id}/deactivate` | Deactivate user |

### Devices (`/api/devices`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List devices (paginated, filtered) | User+ |
| GET | `/{id}` | Get device details | Owner/Admin |
| POST | `/` | Register device | User |
| PATCH | `/{id}` | Update device | Owner/Admin |
| POST | `/{id}/approve` | Approve/reject device | Admin |
| POST | `/{id}/revoke` | Revoke device | Admin |
| GET | `/{id}/trust-assessment` | Get trust assessment | Owner/Admin |

### Policies (`/api/policies`) - Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List policies |
| GET | `/{id}` | Get policy |
| POST | `/` | Create policy |
| PATCH | `/{id}` | Update policy |
| DELETE | `/{id}` | Delete policy |
| POST | `/evaluate` | Evaluate policies for context |

### Security Events (`/api/security-events`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List events (filtered) |
| GET | `/{id}` | Get event |
| GET | `/stats/summary` | Event statistics |
| POST | `/{id}/resolve` | Resolve event |

### Threat Alerts (`/api/threat-alerts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List alerts (filtered) |
| GET | `/{id}` | Get alert |
| PATCH | `/{id}` | Update alert status/assignment |
| GET | `/stats/summary` | Alert statistics |

### Audit Logs (`/api/audit-logs`) - Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List logs (filtered) |
| GET | `/{id}` | Get log |
| GET | `/stats/summary` | Log statistics |

### Access Decisions (`/api/access-decisions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List decisions (filtered) |
| GET | `/{id}` | Get decision |
| POST | `/evaluate` | Make access decision |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Key metrics |
| GET | `/charts` | Chart data |
| GET | `/recent-activity` | Recent events |
| GET | `/threat-analytics` | Threat analysis |
| GET | `/access-decision-analytics` | Decision analysis |
| GET | `/device-analytics` | Device analysis |

### Monitoring (`/api/monitoring`) - Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics` | System metrics (CPU, memory, disk) |
| GET | `/connections` | Active network connections |
| GET | `/stats` | Network interface statistics |
| GET | `/processes` | Network-active processes |
| GET | `/ports` | Listening ports with risk |

---

## Security Implementation Details

### Password Security
```python
# backend/app/core/security.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)  # bcrypt with 12 rounds

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

### JWT Token Structure
```json
{
  "sub": "user@example.com",
  "user_id": 1,
  "role": "admin",
  "session_id": 5,
  "type": "access",
  "exp": 1700000000,
  "iat": 1699998200
}
```

### MFA Implementation
- **TOTP:** RFC 6238, SHA-1, 30-second steps, 6 digits
- **Secret:** 160-bit base32 encoded
- **QR Code:** otpauth:// URI with issuer "NEXUS GUARD"
- **Backup Codes:** 10 × 8-char hex, bcrypt hashed individually

### Zero Trust Decision Process
```python
# Simplified flow in zero_trust.py
async def make_access_decision(context, db):
    # 1. Verify identity
    identity = await verify_identity(user_id, device_id, ip, user_agent)
    
    # 2. Evaluate device trust
    device_trust = await calculate_device_trust_score(device, db)
    
    # 3. Evaluate policies (priority order)
    policy_result = await evaluate_policies(context, db)
    
    # 4. Combine scores and make decision
    combined_risk = max(context.risk_score, identity.risk_score)
    combined_trust = device_trust.trust_score if device else context.trust_score
    
    if combined_risk >= 80: decision = DENY
    elif combined_risk >= 60: decision = CHALLENGE (MFA required)
    elif combined_risk >= 40 and combined_trust < 50: decision = CHALLENGE
    else: decision = policy_result.decision or ALLOW
    
    # 5. Log decision and run threat detection
    await log_access_decision(decision, context, db)
    await run_threat_detection(decision, db)
    
    return decision
```

### Threat Detection Rules
```python
# Key detection thresholds in threat_detection.py
BRUTE_FORCE_USER_THRESHOLD = 5      # per 15 min
BRUTE_FORCE_IP_THRESHOLD = 10       # per 15 min
CREDENTIAL_STUFFING_THRESHOLD = 5   # unique users per IP per hour
IMPOSSIBLE_TRAVEL_WINDOW = 1        # hour
HIGH_RISK_DEVICE_THRESHOLD = 80     # risk score
HIGH_RISK_ACCESS_THRESHOLD = 70     # risk score
MULTIPLE_DENIALS_THRESHOLD = 5      # per 30 min
```

---

## Configuration Reference

### Environment Variables (`.env`)

```bash
# Application
APP_NAME="NEXUS GUARD"
APP_VERSION="1.0.0"
DEBUG=true
ENVIRONMENT=development

# Server
HOST=0.0.0.0
PORT=8000

# Database
# Development:
DATABASE_URL=sqlite+aiosqlite:///./nexus_guard.db
# Production:
# DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# Security (CHANGE IN PRODUCTION!)
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# MFA
MFA_ISSUER=NEXUS GUARD

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Admin (CHANGE IN PRODUCTION!)
ADMIN_EMAIL=admin@nexusguard.com
ADMIN_PASSWORD=SecureAdmin123!
ADMIN_USERNAME=admin
```

### Frontend Configuration

**vite.config.js:**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

**tailwind.config.js:** Custom theme with:
- Primary color palette (slate/blue)
- Dark mode as default
- Custom animations (fade-in, slide-in, pulse-soft)
- Font families: Inter (sans), JetBrains Mono (mono)

---

## Installation & Deployment

### Development Setup

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- Git

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed
python -m app.main
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Production Deployment

**Backend (systemd example):**
```ini
# /etc/systemd/system/nexus-guard.service
[Unit]
Description=NEXUS GUARD API
After=network.target

[Service]
Type=exec
User=nexusguard
WorkingDirectory=/opt/nexus-guard/backend
Environment=PATH=/opt/nexus-guard/backend/venv/bin
EnvironmentFile=/opt/nexus-guard/backend/.env
ExecStart=/opt/nexus-guard/backend/venv/bin/python -m app.main
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        root /opt/nexus-guard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Docker (Optional):**
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["python", "-m", "app.main"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

---

## Testing

### Running Tests

```bash
# Backend tests
cd backend
pytest -v                    # All tests with verbose output
pytest -v --cov=app         # With coverage
pytest tests/test_auth.py   # Specific test file
pytest -k "test_login"      # Filter by name

# Frontend build verification
cd frontend
npm run build               # Production build test
npm run lint                # ESLint check
```

### Test Coverage Areas

| Module | Tests | Coverage Focus |
|--------|-------|----------------|
| `test_auth.py` | 10 | Registration, login, JWT, MFA, refresh, logout |
| `test_devices.py` | 8 | CRUD, approval, revocation, trust assessment, authorization |
| `test_policies.py` | 6 | CRUD, evaluation, priority, admin enforcement |
| `test_zero_trust.py` | 6 | Trust scoring, identity verification, decisions, policy priority |
| `test_threat_detection.py` | 7 | Brute force, credential stuffing, suspicious login, impossible travel, periodic scan |

### Test Fixtures (`conftest.py`)
- In-memory SQLite database
- Async HTTP client with dependency overrides
- Pre-created users (regular + admin)
- Pre-created devices, policies
- Auth headers for both user types

---

## Key Design Decisions

### 1. Async-First Architecture
- FastAPI + SQLAlchemy 2.0 async for high concurrency
- All database operations non-blocking
- Proper connection pooling

### 2. Zero Trust as Core Service
- Not bolted on; every request evaluated
- `ZeroTrustEngine` class encapsulates all logic
- Extensible for custom policies

### 3. Comprehensive Audit Trail
- Every security-relevant action logged automatically
- Immutable logs with correlation IDs
- Structured JSON for SIEM integration

### 4. Device-Centric Security
- Devices are first-class citizens
- Trust scores drive access decisions
- Visual trust/risk indicators in UI

### 5. Modern Frontend Patterns
- React 18 with hooks (no class components)
- Component composition over inheritance
- Tailwind for consistent design system
- Recharts for declarative visualizations

### 6. Type Safety
- Pydantic v2 for runtime validation
- SQLAlchemy 2.0 with proper typing
- TypeScript-ready frontend structure

---

## Extensibility Points

### Adding New Threat Detection Rules
```python
# In threat_detection.py
async def _detect_new_threat_type(self, context):
    # Implementation
    return [ThreatAlert(...)]
# Register in analyze_login_attempt() or run_periodic_detection()
```

### Adding New Policy Conditions
```python
# In zero_trust.py _policy_applies()
if "custom_field" in conditions:
    if context.custom_field != conditions["custom_field"]:
        return False
```

### Adding New Dashboard Widgets
```python
# In dashboard.py router
@router.get("/custom-analytics")
async def get_custom_analytics(...):
    # Return structured data
```

### Adding New Device Types
```python
# In device.py model
class DeviceType(str, enum.Enum):
    # ... existing ...
    CONTAINER = "container"
    VM = "vm"
```

---

## Security Checklist for Production

- [ ] Change `SECRET_KEY` to 32+ character random string
- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Set `DEBUG=false`
- [ ] Configure PostgreSQL with TLS
- [ ] Set `CORS_ORIGINS` to production domain only
- [ ] Enable HTTPS/TLS 1.3
- [ ] Set up log aggregation (ELK, Loki, etc.)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring/alerting (Prometheus + Grafana)
- [ ] Schedule dependency updates (Dependabot)
- [ ] Document incident response procedures
- [ ] Conduct penetration testing
- [ ] Review and harden OS/firewall

---

## File Count Summary

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| **Backend Python** | 35 | 8,500+ |
| **Frontend React/JS** | 28 | 6,500+ |
| **Tests** | 6 | 1,200+ |
| **Documentation** | 6 | 3,500+ |
| **Configuration** | 8 | 500+ |
| **Total** | **83** | **~20,000+** |

---

## License & Credits

**NEXUS GUARD** - Zero Trust Network Security System

Built with:
- **FastAPI** by Sebastián Ramírez
- **React** by Meta
- **Tailwind CSS** by Tailwind Labs
- **Recharts** by Recharts contributors
- **Lucide** by Lucide contributors
- **SQLAlchemy** by Mike Bayer
- **Pydantic** by Samuel Colvin
- **pyotp** by PyOTP contributors

---

*This documentation covers the complete NEXUS GUARD implementation as of the current version. For API-specific documentation, visit `/docs` when the server is running.*