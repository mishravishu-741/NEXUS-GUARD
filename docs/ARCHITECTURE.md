# Architecture Documentation

## Overview

NEXUS GUARD follows a modern, layered architecture based on Zero Trust principles. The system is designed as a modular, scalable application with clear separation of concerns between frontend, backend, and infrastructure layers.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Browser   │  │   Mobile    │  │   API       │             │
│  │   (React)   │  │   (Future)  │  │   Clients   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FastAPI Application (Port 8000)             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │  │  Auth    │ │ Devices  │ │ Policies │ │ Monitoring│   │   │
│  │  │  Router  │ │  Router  │ │  Router  │ │  Router  │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Zero Trust   │ │ Threat       │ │ Monitoring   │            │
│  │ Engine       │ │ Detection    │ │ Service      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   SQLite     │ │  PostgreSQL  │ │    Redis     │            │
│  │  (Default)   │ │  (Optional)  │ │  (Caching)   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Project Structure

```
backend/
├── app/
│   ├── core/                 # Core configuration & infrastructure
│   │   ├── config.py         # Application settings
│   │   ├── database.py       # Database connection & session management
│   │   └── security.py       # Authentication, encryption, MFA
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── user.py           # User, Role models
│   │   ├── device.py         # Device, DeviceStatus, DeviceType
│   │   ├── policy.py         # Policy, PolicyEvaluation
│   │   ├── security_event.py # SecurityEvent, EventType, Severity
│   │   ├── threat_alert.py   # ThreatAlert, ThreatType, Severity
│   │   ├── audit_log.py      # AuditLog, AuditAction, ResourceType
│   │   ├── session.py        # LoginSession, SessionStatus
│   │   ├── access_decision.py# AccessDecision, DecisionType
│   │   ├── mfa.py            # MFAConfig, MFAMethod
│   │   └── network_connection.py
│   ├── schemas/              # Pydantic validation schemas
│   │   ├── user.py
│   │   ├── device.py
│   │   ├── policy.py
│   │   ├── security_event.py
│   │   ├── threat_alert.py
│   │   ├── audit_log.py
│   │   ├── access_decision.py
│   │   └── dashboard.py
│   ├── routers/              # API route handlers (Controllers)
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── users.py          # User management
│   │   ├── devices.py        # Device management
│   │   ├── policies.py       # Policy management
│   │   ├── security_events.py
│   │   ├── threat_alerts.py
│   │   ├── audit_logs.py
│   │   ├── access_decisions.py
│   │   ├── dashboard.py      # Dashboard analytics
│   │   └── monitoring.py     # System monitoring
│   ├── services/             # Business logic layer
│   │   ├── zero_trust.py     # Zero Trust Engine
│   │   ├── threat_detection.py
│   │   └── monitoring.py
│   └── main.py               # Application entry point
├── tests/                    # Test suite
└── requirements.txt
```

### Design Patterns Used

1. **Repository Pattern** - Data access abstracted through SQLAlchemy ORM
2. **Dependency Injection** - FastAPI's `Depends()` for database sessions, auth
3. **Layered Architecture** - Clear separation: Routers → Services → Models
4. **Zero Trust Engine** - Policy-based access control with continuous verification
5. **Event-Driven Audit Logging** - All security-relevant actions logged automatically

## Zero Trust Engine

The core security component implementing "Never Trust, Always Verify":

### Components

1. **Identity Verification** (`verify_identity()`)
   - User authentication status
   - Failed login attempts
   - Account lockout status
   - Device trust level
   - IP reputation
   - Geographic anomaly detection

2. **Device Trust Evaluation** (`calculate_device_trust_score()`)
   - Device approval status (Trusted/Pending/Untrusted/Revoked)
   - Device age and history
   - Fingerprint completeness
   - Recent activity
   - Associated security events
   - IP/location consistency

3. **Policy Evaluation** (`evaluate_policies()`)
   - Priority-based policy matching
   - Risk/trust score thresholds
   - Role-based applicability
   - Device/network scope
   - Custom conditions (JSON)

4. **Access Decision** (`make_access_decision()`)
   - Combines identity, device, policy results
   - Decision types: Allow, Deny, Challenge, Monitor
   - MFA challenge integration
   - Comprehensive audit trail

### Decision Flow

```
Request Received
      │
      ▼
┌─────────────┐
│  Extract    │
│  Context    │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Verify     │────▶│  Evaluate   │
│  Identity   │     │  Device     │
└──────┬──────┘     │  Trust      │
       │            └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────┐
│      Evaluate Policies      │
│  (Priority Ordered)         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Make Decision          │
│  Allow / Deny / Challenge   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Log Access Decision        │
│  Create Security Event      │
│  Run Threat Detection       │
└─────────────────────────────┘
```

## Data Models

### Core Entities

1. **User** - Authentication, authorization, profile
2. **Device** - Registered endpoints with trust scores
3. **Policy** - Access control rules with conditions
4. **SecurityEvent** - Immutable audit trail of all events
5. **ThreatAlert** - Detected threats with severity/status
6. **AuditLog** - Administrative action trail
7. **LoginSession** - Active session tracking
8. **AccessDecision** - Zero Trust decision records
9. **MFAConfig** - Multi-factor authentication settings

### Relationships

```
User 1──◄──* Device (owner)
User 1──◄──* LoginSession
User 1──◄──* SecurityEvent
User 1──◄──* AccessDecision
User 1──◄──* ThreatAlert
User 1──◄──* AuditLog
User 1──◄──1 MFAConfig

Device 1──◄──* SecurityEvent
Device 1──◄──* AccessDecision

Policy 1──◄──* PolicyEvaluation
```

## Frontend Architecture

### Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base components (Button, Input, Card, etc.)
│   │   ├── charts/          # Chart components
│   │   └── layout/          # Layout components
│   ├── pages/               # Page components (route-level)
│   │   ├── DashboardPage.jsx
│   │   ├── DevicesPage.jsx
│   │   ├── ThreatsPage.jsx
│   │   ├── PoliciesPage.jsx
│   │   ├── AccessDecisionsPage.jsx
│   │   ├── AuditLogsPage.jsx
│   │   ├── SecurityEventsPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── NetworkPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── SettingsPage.jsx
│   ├── layouts/             # Layout wrappers
│   │   └── MainLayout.jsx
│   ├── services/            # API service layer
│   │   └── api.js           # Axios instance with interceptors
│   ├── context/             # React Context providers
│   │   └── AuthContext.jsx
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   │   └── helpers.js
│   ├── styles/              # Global styles
│   │   └── index.css
│   ├── App.jsx              # Root component with routing
│   └── main.jsx             # Entry point
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### State Management

- **Authentication State**: React Context (`AuthContext`)
- **Server State**: Direct API calls with React Query patterns (manual)
- **UI State**: Local component state (`useState`)
- **Form State**: React Hook Form

### Component Design Principles

1. **Composition over Inheritance** - Small, composable components
2. **Separation of Concerns** - UI components separate from data fetching
3. **Consistent Styling** - Tailwind CSS with custom design system
4. **Accessibility** - Semantic HTML, ARIA labels, keyboard navigation
5. **Responsive Design** - Mobile-first approach

## API Design

### RESTful Conventions

| Resource | Methods |
|----------|---------|
| `/auth/*` | POST (login, register, mfa) |
| `/users` | GET, POST |
| `/users/{id}` | GET, PATCH, DELETE |
| `/devices` | GET, POST |
| `/devices/{id}` | GET, PATCH |
| `/devices/{id}/approve` | POST |
| `/devices/{id}/revoke` | POST |
| `/policies` | GET, POST |
| `/policies/{id}` | GET, PATCH, DELETE |
| `/policies/evaluate` | POST |
| `/security-events` | GET |
| `/threat-alerts` | GET, PATCH |
| `/audit-logs` | GET |
| `/access-decisions` | GET, POST |
| `/dashboard/*` | GET |

### Response Format

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Error Format

```json
{
  "detail": "Error message",
  "code": "ERROR_CODE",
  "fields": {}
}
```

## Security Architecture

### Authentication Flow

1. User submits credentials
2. Server verifies password hash (bcrypt)
3. Checks account status (active, locked)
4. If MFA enabled, requires TOTP
5. Creates session record
6. Issues JWT access token (30 min) + refresh token (7 days)
7. Logs security event

### Authorization

- **Role-Based Access Control (RBAC)**: Admin vs User roles
- **Resource-Level Permissions**: Users access own resources
- **Admin Endpoints**: Protected by `get_current_admin_user` dependency

### Data Protection

- Passwords: bcrypt with configurable rounds
- JWT: HS256 with rotating secrets
- MFA Secrets: Encrypted at rest
- Backup Codes: Hashed storage
- HTTPS: Enforced in production

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers (session in DB)
- Database connection pooling
- Redis for caching (future)
- Load balancer ready

### Performance Optimizations

- Database indexes on query fields
- Pagination on all list endpoints
- Eager loading for relationships
- Async database operations
- Background task processing (future)

## Future Extensibility

### Plugin Architecture (Planned)

- Custom threat detection rules
- External SIEM integration
- Custom policy evaluators
- Notification handlers

### Microservice Migration Path

- Auth Service
- Device Management Service
- Policy Engine Service
- Monitoring Service
- Threat Detection Service
- Notification Service

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Backend Framework | FastAPI | 0.109+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | SQLite / PostgreSQL | 3.45+ / 15+ |
| Authentication | python-jose, passlib, pyotp | Latest |
| Validation | Pydantic | 2.5+ |
| Frontend Framework | React | 18.2+ |
| Build Tool | Vite | 5.0+ |
| Styling | Tailwind CSS | 3.3+ |
| Charts | Recharts | 2.10+ |
| Icons | Lucide React | 0.294+ |
| State | React Context + Hooks | Built-in |
| Testing | Pytest | 7.4+ |