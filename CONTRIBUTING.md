# Contributing to NEXUS GUARD

Thank you for your interest in contributing to NEXUS GUARD! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive criticism
- Accept feedback gracefully

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/nexus-guard.git
   cd nexus-guard
   ```

3. Set up backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env for development
   ```

4. Set up frontend:
   ```bash
   cd frontend
   npm install
   ```

5. Run tests to verify setup:
   ```bash
   # Backend
   cd backend
   pytest -v

   # Frontend
   cd frontend
   npm run build
   ```

## Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions

### Commit Messages
Follow conventional commits:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(auth): add MFA backup code regeneration

Allow users to regenerate backup codes from settings page

Closes #123
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Run the full test suite
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback
7. Merge after approval

### Testing Requirements

All contributions must include tests:
- Backend: Pytest unit/integration tests
- Frontend: Component tests (when test framework added)
- Minimum 80% coverage for new code

## Coding Standards

### Python (Backend)

Follow PEP 8 with these tools:
- **Formatter**: Black (line length 100)
- **Import Sorting**: isort
- **Linting**: Flake8 + Bandit (security)
- **Type Checking**: mypy (strict mode)

```bash
# Format code
black app/
isort app/

# Check
flake8 app/
bandit -r app/
mypy app/
```

### JavaScript/React (Frontend)

Follow Airbnb style guide:
- **Formatter**: Prettier
- **Linting**: ESLint with React hooks rules
- **Type Checking**: TypeScript (future)

```bash
# Format
npm run format

# Lint
npm run lint

# Build check
npm run build
```

### Database Migrations

For schema changes:
1. Create migration: `alembic revision --autogenerate -m "description"`
2. Review generated migration
3. Test upgrade/downgrade
4. Include in PR

## Project Structure Guidelines

### Backend

```
app/
├── core/           # Configuration, security, database
├── models/         # SQLAlchemy models (one per file)
├── schemas/        # Pydantic schemas (match models)
├── routers/        # API endpoints (one per resource)
├── services/       # Business logic (zero_trust, detection, etc.)
└── main.py         # Application factory
```

Rules:
- One model per file in `models/`
- Schemas match model fields
- Routers thin, delegate to services
- Services contain business logic
- No direct DB access in routers

### Frontend

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level components
├── layouts/        # Layout wrappers
├── services/       # API client
├── context/        # React context providers
├── hooks/          # Custom hooks
├── utils/          # Helper functions
└── styles/         # Global styles
```

Rules:
- Pages in `pages/`, components in `components/`
- Use React Hook Form for forms
- Use Tailwind for styling
- Custom hooks for reusable logic

## API Design Guidelines

### RESTful Principles
- Use nouns for resources: `/devices`, `/policies`
- Use HTTP verbs correctly: GET, POST, PATCH, DELETE
- Plural resource names
- Nested for relationships: `/devices/{id}/approve`

### Request/Response
- Use Pydantic models for validation
- Consistent pagination: `page`, `page_size`, `total`
- Standard error format with `detail` field
- Include correlation IDs for tracing

### Versioning
- API version in URL: `/api/v1/`
- Backward compatible changes only
- Deprecation notices 1 version ahead

## Security Guidelines

### Never Commit
- Passwords, API keys, secrets
- Real user data
- Production database credentials
- Private keys/certificates

### Security Review Required For
- Authentication/authorization changes
- New API endpoints
- Data model modifications
- Dependency updates

## Documentation

### Required Updates
- README.md for new features
- ARCHITECTURE.md for structural changes
- SECURITY.md for security-relevant changes
- API docs via FastAPI auto-generation
- Inline code comments for complex logic

### Documentation Style
- Clear, concise language
- Code examples for APIs
- Diagrams for architecture
- Step-by-step for setup

## Release Process

1. Update version in `pyproject.toml` / `package.json`
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Build frontend: `npm run build`
6. Create GitHub release
7. Deploy to staging
8. Deploy to production

## Getting Help

- Check existing issues and PRs
- Read documentation in `docs/`
- Ask questions in discussions
- Join community chat (if available)

## Recognition

Contributors are recognized in:
- CHANGELOG.md
- GitHub contributors page
- Release notes

Thank you for contributing to NEXUS GUARD!