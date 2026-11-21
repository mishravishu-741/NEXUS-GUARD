# Security Documentation

## Security Overview

NEXUS GUARD is built with security as a foundational principle, implementing Zero Trust architecture and following industry best practices for authentication, authorization, data protection, and threat detection.

## Authentication Security

### Password Security
- **Hashing Algorithm**: bcrypt with configurable cost factor (default 12 rounds)
- **Minimum Requirements**: 8 characters, uppercase, lowercase, number, special character
- **Storage**: Only salted hashes stored, never plaintext
- **Validation**: Server-side validation on registration and change

### JWT Token Security
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Access Token Lifetime**: 30 minutes (configurable)
- **Refresh Token Lifetime**: 7 days (configurable)
- **Token Contents**: User ID, email, role, session ID, token type, expiration
- **Secret Key**: 32+ character random string, rotated periodically
- **Storage**: HttpOnly, Secure, SameSite=Strict cookies recommended for production

### Multi-Factor Authentication (MFA)
- **Method**: TOTP (Time-based One-Time Password) per RFC 6238
- **Secret Generation**: Cryptographically secure random base32 (160 bits)
- **QR Code**: Generated for easy authenticator app enrollment
- **Backup Codes**: 10 single-use codes, hashed with bcrypt
- **Verification Window**: ±1 time step (30 seconds)
- **Enforcement**: Optional per-user, mandatory for admins recommended

### Session Management
- **Session Tracking**: Database-backed with device association
- **Concurrent Sessions**: Multiple allowed per user
- **Session Expiry**: Configurable (default 7 days refresh)
- **Revocation**: Immediate on logout, password change, admin action
- **Device Binding**: Sessions linked to registered devices

## Authorization Security

### Role-Based Access Control (RBAC)
- **Roles**: Admin (full access), User (self-service only)
- **Admin Endpoints**: Protected by `admin_only` dependency
- **Resource Ownership**: Users can only access their own resources
- **Policy Enforcement**: Zero Trust engine evaluates every request

### Zero Trust Principles
1. **Never Trust, Always Verify** - Every request authenticated and authorized
2. **Least Privilege** - Minimal permissions by default
3. **Continuous Verification** - Trust evaluated per-request
4. **Micro-Segmentation** - Policies apply to specific resources/actions
5. **Assume Breach** - Monitoring and detection always active

## Data Protection

### Encryption at Rest
- **Passwords**: bcrypt (irreversible)
- **MFA Secrets**: Stored encrypted (AES-256 via Fernet)
- **Backup Codes**: bcrypt hashed
- **Refresh Tokens**: bcrypt hashed
- **Database**: SQLite (file permissions) / PostgreSQL (TLS)

### Encryption in Transit
- **Development**: HTTP localhost (acceptable for dev)
- **Production**: HTTPS/TLS 1.3 mandatory
- **API Communication**: TLS between frontend/backend
- **Database Connections**: TLS for PostgreSQL

### Data Minimization
- Only necessary data collected
- No sensitive PII beyond email/username
- IP addresses logged for security only
- Automatic log retention policies recommended

## Network Security

### CORS Configuration
- **Allowed Origins**: Explicitly configured list
- **Credentials**: Allowed for authenticated requests
- **Methods**: Restricted to required HTTP verbs
- **Headers**: Limited to necessary headers

### Rate Limiting
- **Auth Endpoints**: 10 requests/minute per IP
- **API Endpoints**: 100 requests/minute per user
- **Configuration**: Via `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW`

### Input Validation
- **Pydantic Schemas**: All request bodies validated
- **SQL Injection**: Prevented by SQLAlchemy ORM
- **XSS Prevention**: React auto-escapes, API returns JSON
- **Path Traversal**: Not applicable (no file uploads)

## Threat Detection

### Built-in Detection Rules

1. **Brute Force Detection**
   - 5+ failed logins/user/15min → Medium alert
   - 10+ failed logins/user/15min → High alert
   - 10+ failed logins/IP/15min → High alert

2. **Credential Stuffing**
   - 5+ unique users/IP/hour → Medium alert
   - 10+ unique users/IP/hour → High alert

3. **Suspicious Login**
   - New/unapproved device → Medium alert
   - Untrusted device → High alert
   - High-risk device (score >70) → High alert
   - VPN/Proxy/Tor IP → Medium/High alert

4. **Impossible Travel**
   - Different IP <1 hour → High alert

5. **Access Anomalies**
   - 5+ denials/user/30min → Medium alert
   - High-risk access (score >70) → High alert
   - High-risk access (score >85) → Critical alert

6. **Device Risks**
   - Risk score >80 on trusted device → High alert

### Alert Severity Levels
- **Critical** (90-100): Immediate action required
- **High** (70-89): Urgent investigation needed
- **Medium** (40-69): Review within 24 hours
- **Low** (1-39): Informational, periodic review

## Audit Logging

### Logged Events
All security-relevant actions are logged:
- Authentication: Login, logout, MFA, password changes
- Authorization: Access decisions (allow/deny/challenge)
- Administration: User/device/policy CRUD operations
- Security: Threat alerts, event resolution
- System: Configuration changes

### Log Integrity
- **Immutable**: Audit logs never modified after creation
- **Correlation IDs**: Trace requests across services
- **Structured JSON**: Machine-parseable for SIEM
- **Tamper Evidence**: Hash chaining (future enhancement)

## Secure Development Practices

### Code Security
- **Dependency Scanning**: Regular `pip-audit` / `npm audit`
- **Static Analysis**: Bandit (Python), ESLint security rules
- **Secrets Management**: Environment variables, never hardcoded
- **Code Review**: Required for all changes

### Configuration Security
```env
# Production Requirements
DEBUG=false
SECRET_KEY=<32+ char random string>
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
CORS_ORIGINS=https://yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong unique password>
```

### Deployment Security
- Run as non-root user
- Read-only filesystem where possible
- Minimal container base images
- Regular security updates
- WAF/CDN for production

## Incident Response

### Security Event Classification
1. **P0 - Critical**: Active breach, data exfiltration
2. **P1 - High**: Confirmed compromise, privilege escalation
3. **P2 - Medium**: Suspicious activity, policy violations
4. **P3 - Low**: Informational, failed attempts

### Response Procedures
1. **Containment**: Revoke sessions, block IPs, disable accounts
2. **Investigation**: Review audit logs, threat alerts, access decisions
3. **Eradication**: Remove threats, patch vulnerabilities
4. **Recovery**: Restore services, verify integrity
5. **Lessons Learned**: Update detection rules, improve defenses

## Compliance Considerations

### Data Privacy
- **GDPR**: Right to access, rectify, delete personal data
- **CCPA**: Consumer privacy rights
- **Data Retention**: Configurable policies per log type

### Audit Requirements
- **SOX**: Financial system access logging
- **HIPAA**: Healthcare data access (if applicable)
- **PCI DSS**: Payment system access (if applicable)

## Vulnerability Reporting

Report security vulnerabilities to: security@nexusguard.local

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Checklist for Deployment

- [ ] Change default admin credentials
- [ ] Generate strong SECRET_KEY
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domain
- [ ] Use PostgreSQL with TLS
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Enable firewall rules
- [ ] Set up monitoring/alerting
- [ ] Schedule dependency updates
- [ ] Document incident response plan
- [ ] Conduct penetration testing