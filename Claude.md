# Claude AI Assistant Configuration for LottoDrop

## Project Overview

You are working on **LottoDrop**, a production-ready real-time lottery-style gaming platform deployed at **lottodrop.net**. Built with React 19/TypeScript frontend and Node.js/Express backend. This enterprise-grade application features real-time WebSocket communication, secure financial transactions, provably fair gaming mechanics, and comprehensive SEO optimization.

**Current Status**: Production-Ready | All systems operational | Docker deployment active

## Agent-Based Development System

### MANDATORY EXECUTION PROTOCOL

You have access to 9 specialized AI agents. **YOU MUST USE THESE AGENTS** for all relevant tasks:

1. **Casino Animation Specialist**
   - Domain: Animations, transitions, game effects, particle systems
   - Use for: Slot animations, winning celebrations, UI transitions, physics simulations
   - Expertise: 60fps optimization, WebGL/Canvas, Lottie, micro-interactions

2. **Casino Visual Designer**
   - Domain: UI design, visual assets, icons, logos, brand identity
   - Use for: Game icons, platform logos, visual themes, color schemes
   - Expertise: Vegas aesthetics, luxury themes, responsible gaming compliance

3. **Elite Gaming UX Designer**
   - Domain: User experience, interaction design, HUDs, onboarding flows
   - Use for: Interface design, user journeys, accessibility, conversion optimization
   - Expertise: Gaming psychology, flow state optimization, WCAG compliance

4. **Elite PM Delivery Leader**
   - Domain: Project management, risk assessment, timeline management
   - Use for: Sprint planning, resource allocation, stakeholder management
   - Expertise: Agile/Scrum, risk mitigation, 98% on-time delivery rate

5. **Elite Product Owner**
   - Domain: Product strategy, backlog management, requirements definition
   - Use for: Feature prioritization, user stories, MVP definition, roadmap planning
   - Expertise: RICE/WSJF frameworks, stakeholder alignment, OKRs

6. **Enterprise Solution Architect**
   - Domain: System architecture, cloud strategy, scalability planning
   - Use for: Architecture decisions, integration patterns, performance optimization
   - Expertise: Microservices, AWS/Azure/GCP, distributed systems, security

7. **Gaming Finance Backend**
   - Domain: Payment systems, betting engines, financial calculations
   - Use for: Transaction processing, RNG implementation, odds calculation, fraud detection
   - Expertise: PCI DSS compliance, cryptographic security, GLI-19 regulations

8. **Manual QA Tester**
   - Domain: Testing, bug detection, quality assurance
   - Use for: Test case creation, regression testing, API testing, security testing
   - Expertise: Exploratory testing, bug reporting, requirement validation

9. **React Frontend Expert**
   - Domain: React development, performance optimization, state management
   - Use for: Component architecture, React hooks, Redux/Zustand, TypeScript
   - Expertise: React 19, Next.js, testing strategies, accessibility

## MANDATORY TASK EXECUTION WORKFLOW

### For EVERY task, follow this workflow:

```
STEP 1: ANALYZE
- Identify which agents are needed
- Map task requirements to agent expertise
- Plan agent collaboration

STEP 2: ENGAGE AGENTS
- Explicitly state: "Consulting [Agent Name] for [specific aspect]..."
- Use multiple agents for cross-functional tasks
- Document each agent's contribution

STEP 3: EXECUTE
- Implement solution using combined agent expertise
- Apply best practices from each domain
- Ensure alignment with project standards

STEP 4: VERIFY
- ALWAYS run Manual QA Tester verification
- Check requirements with Elite Product Owner
- Validate technical implementation with relevant agents

STEP 5: REPORT
- Provide comprehensive completion report
- List all agents used and their contributions
- Include verification status
```

### Task Completion Report Template

```markdown
=== TASK COMPLETION REPORT ===

**Agents Used:**
- [Agent Name]: [Specific contribution]
- [Agent Name]: [Specific contribution]

**Verification Status:**
- Requirements Met: Y/N
- QA Testing: Y/N
- Technical Review: Y/N

**Confidence Level:** [High/Medium/Low]
**Issues Found:** [None/List]
**Next Steps:** [If applicable]
```

## Technical Context

### Current Stack (January 2026)
- **Frontend**: React 19.1.1, TypeScript ~5.8.3, Vite 7.1.2, TailwindCSS 4.1.13
- **Admin Portal**: React 19.1.1, TypeScript 4.9.5, Create React App 5.0.1
- **Backend**: Node.js 18+, Express 5.1.0, Socket.IO 4.8.1, TypeScript 5.9.2
- **Database**: PostgreSQL 15+ with pg 8.16.3 driver, Redis 7 (ioredis 5.7.0)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0 + HttpOnly Cookies
- **Security**: CSRF protection with Redis-backed token validation, zxcvbn 4.4.2
- **Real-time**: WebSocket via Socket.IO with Redis adapter + Cookie-based auth
- **Testing**: Jest 30.2.0, Vitest 4.0.3, Playwright 1.56.1, Supertest 7.1.4
- **Deployment**: Docker Compose with nginx:alpine, 5 containers
- **Domain**: lottodrop.net (configured with proper SEO)

### Project Structure
```
LottoDrop/
├── frontend/                   # React 19 + Vite application (Port 80/8080)
│   ├── public/                 # Static assets + SEO files + PWA manifest
│   │   ├── sitemap.xml         # XML sitemap for search engines
│   │   ├── robots.txt          # Crawler directives
│   │   ├── og-image.svg        # Open Graph social share image (1200x630)
│   │   ├── twitter-card.svg    # Twitter card image (1200x675)
│   │   └── drop-icon.svg       # LottoDrop purple water drop logo
│   ├── src/
│   │   ├── components/         # Atomic design (atoms/molecules/organisms)
│   │   │   ├── atoms/          # Button, Input, Card, Avatar, Badge, Spinner
│   │   │   ├── molecules/      # NotificationBell, RoundResultModal, PlayerCard
│   │   │   ├── organisms/      # AuthModal, Header, Footer, Modal
│   │   │   └── animations/     # Celebration, WinnerReveal, CountdownTimer
│   │   ├── contexts/           # Auth, Notification, Modal, WinnerResults
│   │   ├── hooks/              # 15+ custom hooks (useGameStateMachine, useModal)
│   │   ├── pages/              # GameRoom, RoomList, Profile, Results, HowToPlay
│   │   ├── services/           # API, Socket, Audio, Notification services
│   │   ├── utils/              # 22+ utilities (csrfManager, logoutManager, etc)
│   │   └── types/              # TypeScript definitions
│   ├── e2e/                    # Playwright E2E tests
│   │   ├── tests/              # Test specs including auth-cookie-security
│   │   └── helpers/            # Security utilities for testing
│   ├── nginx-site.conf         # Production nginx config with security headers
│   └── Dockerfile              # Multi-stage build
├── frontend-admin/             # Admin dashboard (Port 81/8081)
│   ├── public/
│   │   ├── robots.txt          # Disallow all (private admin)
│   │   └── index.html          # noindex meta tag
│   ├── src/
│   │   ├── components/         # Sidebar, FilterSection
│   │   ├── contexts/           # AuthContext
│   │   ├── pages/              # Dashboard, Users, Rooms, Rounds, Transactions, Logs
│   │   ├── styles/             # design-system.css (purple theme)
│   │   └── services/           # API client
│   ├── nginx-site.conf         # nginx config with X-Robots-Tag noindex
│   └── Dockerfile              # Multi-stage build with nginx
├── backend/                    # Express 5 API + WebSocket (Port 3001)
│   ├── src/
│   │   ├── controllers/        # 13 controllers (auth, room, balance, admin, etc)
│   │   ├── routes/             # 10 route files
│   │   ├── middleware/         # auth, csrf, rateLimiter, idempotency
│   │   ├── services/           # Redis services, RealTimeDataManager
│   │   ├── socket/             # socketManager, WebSocket handling
│   │   ├── utils/              # 15+ utilities (see below)
│   │   └── types/              # TypeScript interfaces
│   ├── __tests__/              # Unit and integration tests
│   └── Dockerfile              # Node.js production image
├── database/                   # SQL schemas and migrations
└── docker-compose.yml          # Multi-container orchestration
```

### Backend Utilities (backend/src/utils/)
```
accountLockout.ts      # Failed login tracking & lockout
auditLogger.ts         # Security audit logging
authLogger.ts          # Auth event logging
cookieManager.ts       # HttpOnly cookie management
corsOrigin.ts          # CORS origin validation
crypto.ts              # Cryptographic utilities
csrfToken.ts           # CSRF token generation & validation
errorSanitizer.ts      # Error message sanitization
fieldWhitelist.ts      # Input field validation
logger.ts              # Structured logging
passwordValidator.ts   # Password strength validation (zxcvbn)
refreshToken.ts        # Refresh token management
seedAuditLogger.ts     # VRF seed logging
socketAuth.ts          # Socket.IO authentication & re-auth
winnerProcessingQueue.ts # Async winner processing
```

### Frontend Utilities (frontend/src/utils/)
```
accessibility.ts       # A11y utilities
audioDurationAnalyzer.ts # Audio analysis
authUtils.ts           # Auth helper functions
avatarUtils.ts         # Avatar generation
csrfManager.ts         # CSRF token lifecycle
currencyUtils.ts       # Currency formatting
dateUtils.ts           # Date formatting
deviceDetection.ts     # Device info
liveRegionUtils.ts     # ARIA live regions
logger.ts              # Client-side logging
loginErrorHandler.ts   # Login error parsing
logoutManager.ts       # Manual vs auto logout tracking
passwordValidator.ts   # Password validation
performance.ts         # Performance monitoring
performanceMonitor.ts  # Performance utilities
rateLimiter.ts         # Client rate limiting
responsive.ts          # Breakpoint detection
security.ts            # Client security utils
sentry.ts              # Error tracking setup
serviceWorker.ts       # PWA service worker
```

### Key Features & Current Implementation

1. **Real-time Updates**
   - WebSocket events with Redis pub/sub
   - 30-second polling intervals
   - Idempotent event processing with UUIDs

2. **Provably Fair Gaming**
   - VRF implementation with seed persistence
   - Complete audit trail
   - Winner reveal animations

3. **Security Hardened (Week 4 Enhanced)**
   - HttpOnly Cookie Authentication (XSS-protected)
   - CSRF Protection (Redis-backed, dual-mode)
   - Cookie-based WebSocket Auth
   - Session Management with auto re-auth prompts
   - Account lockout after failed attempts
   - Password strength validation (zxcvbn)
   - Error message sanitization
   - nginx rate limiting (10 conn/IP, 100 total)
   - CORS configuration with origin validation
   - CSP headers configured for development
   - SQL injection prevention via parameterized queries
   - Container security with non-root users

4. **Performance Optimized**
   - Bundle splitting (frontend ~282KB, admin ~150KB)
   - 60fps animations with Framer Motion 12.23.12
   - <100ms API response times
   - Aggressive caching strategy (1yr for assets)
   - Code splitting with React.lazy()

5. **SEO & Accessibility (January 2026 Audit)**
   - Sitemap.xml with all 4 public pages
   - Page-specific SEO with unique titles/descriptions
   - Structured data (Organization, WebSite, BreadcrumbList, FAQPage schemas)
   - Social share images (og-image.svg, twitter-card.svg)
   - Admin portal protected from indexing (triple-layer: robots.txt, meta tag, X-Robots-Tag)
   - robots.txt with gaming-specific rules
   - PWA manifest for mobile installation
   - WCAG 2.1 AA compliance target

6. **Admin Portal**
   - Modern purple branding (#9D4EDD)
   - User management with balance adjustments
   - Real-time transaction monitoring
   - Game room and rounds management
   - System logs and audit trails
   - Advanced filtering and search

## Design System (Purple Theme)

### Purple Brand Color Palette
```css
/* Primary Purple Colors */
--purple-600: #9D4EDD;  /* Primary Brand Purple */
--purple-500: #A855F7;  /* Light Purple */
--purple-400: #C084FC;  /* Accent Purple */
--purple-800: #6A4C93;  /* Dark Purple */

/* Background Colors */
--dark-bg-primary: #1A1A2E;    /* Primary Background */
--dark-bg-secondary: #2D2D44;  /* Secondary Background */
--dark-bg-tertiary: #3a3a52;   /* Tertiary Background */

/* Border & Effects */
--dark-border: rgba(157, 78, 221, 0.2);       /* Purple border */
--dark-border-hover: rgba(157, 78, 221, 0.4); /* Purple hover border */
--shadow-glow: 0 0 20px rgba(157, 78, 221, 0.3); /* Purple glow effect */
```

### Logo Assets
- **Primary Logo**: `drop-icon.svg` - Purple water drop with sparkle effect
- **Gradient**: Linear gradient from #9D4EDD to #C77DFF to #7B2CBF
- **Dimensions**: 512x512px with 96px border radius

## Agent Collaboration Patterns

### Frontend Development
```
Primary: React Frontend Expert
Support: Elite Gaming UX Designer + Casino Visual Designer
Verification: Manual QA Tester
```

### Backend Development
```
Primary: Gaming Finance Backend
Support: Enterprise Solution Architect
Verification: Manual QA Tester
```

### Feature Development
```
Planning: Elite Product Owner + Elite PM Delivery Leader
Design: Elite Gaming UX Designer + Casino Visual Designer
Implementation: React Frontend Expert + Gaming Finance Backend
Animation: Casino Animation Specialist
Testing: Manual QA Tester
```

### Architecture Decisions
```
Primary: Enterprise Solution Architect
Support: Gaming Finance Backend + React Frontend Expert
Validation: Elite Product Owner
```

## Critical Rules

1. **NEVER skip agent consultation** - These are domain experts
2. **ALWAYS verify with QA** - Every change needs testing
3. **DOCUMENT agent usage** - Transparency in decision-making
4. **PRIORITIZE security** - Gaming platform = high security requirements
5. **MAINTAIN performance** - 60fps animations, <100ms responses
6. **ENSURE compliance** - GLI-19, PCI DSS, responsible gaming
7. **USE CSS VARIABLES** - Never hardcode colors in admin portal
8. **RESPECT SPECIFICITY** - Use `!important` only when necessary for overrides

## Docker Deployment

### Container Architecture
```bash
# 5 containers, all healthy:
lottodrop-frontend    # Port 8080  - React app with nginx
lottodrop-backend     # Port 3001  - Express API + WebSocket
lottodrop-postgres    # Port 5432  - PostgreSQL 15
lottodrop-redis       # Port 6379  - Redis 7 cache & pub/sub
lottodrop-admin       # Port 8081  - Admin panel with nginx
```

### Deployment Commands
```bash
# Build and deploy all services
docker-compose build
docker-compose up -d

# Build specific service
docker-compose build frontend
docker-compose up -d frontend

# View logs
docker logs lottodrop-backend --tail 50

# Check container health
docker ps | grep lottodrop

# Restart a service
docker-compose restart backend
```

### Environment Variables
Key environment variables (in .env files):
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL credentials
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `JWT_SECRET`, `SESSION_SECRET` - Authentication secrets
- `ALLOWED_ORIGINS` - CORS allowed origins
- `NODE_ENV` - production/development

## Testing Infrastructure

### Backend Tests
```bash
npm test                    # All tests with coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:security      # Security-focused tests
```

### Frontend Tests
```bash
npm test                   # Vitest unit tests
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # E2E with UI
npm run test:coverage      # With coverage report
```

### E2E Security Tests
Located at `frontend/e2e/tests/auth-cookie-security.spec.ts`:
- HttpOnly cookie verification
- CSRF token validation
- XSS attack prevention
- Session persistence testing
- WebSocket cookie authentication
- Token rotation verification

## Quality Standards

### Code Quality
- TypeScript strict mode
- Comprehensive error handling
- Unit test coverage >80%
- No console.logs in production
- Proper type definitions
- CSS variables for all theme colors

### Performance
- Lighthouse score >90
- FCP <1.5s
- TTI <3.5s
- Bundle size <500KB initial (frontend), <200KB (admin)
- 60fps animations
- Optimized Docker builds (<15s)

### Security Standards
- HttpOnly Cookies for JWT tokens
- CSRF Protection for state-changing requests
- Token Rotation on refresh
- Short-lived Access tokens (15 min)
- 7-day Refresh tokens
- Event-driven re-authentication
- All inputs sanitized
- SQL injection protected
- Secrets in environment variables

## Recent Updates

### January 27, 2026 - Full-Site SEO Audit & Implementation

**Sitemap & Discovery**
- Created `sitemap.xml` with all 4 public pages (/, /results, /how-to-play, /how-to-deposit)
- Configured proper changefreq and priority values
- Verified accessible at https://lottodrop.net/sitemap.xml

**Admin Portal Protection (Triple-Layer)**
- `robots.txt`: Disallow all crawlers
- `index.html`: noindex, nofollow, noarchive meta tag
- `nginx-site.conf`: X-Robots-Tag header on all responses

**Domain Consistency**
- Fixed all references from lottodrop.com to lottodrop.net
- Updated SEO.tsx, index.html, and performance hints

**Page-Specific SEO**
- RoomList (homepage): Organization + WebSite schemas, isHomePage flag
- Results: Unique title/description, BreadcrumbList schema
- HowToPlay: Article type, BreadcrumbList + FAQPage schemas (4 FAQs)
- HowToDeposit: Article type, BreadcrumbList + FAQPage schemas (4 FAQs)

**Enhanced SEO Component**
- Added `breadcrumbs` prop for BreadcrumbList structured data
- Added `faqItems` prop for FAQPage structured data
- Added `noIndex` prop for protected pages
- Added `isHomePage` prop for Organization/WebSite schemas

**Social Share Images**
- Created `og-image.svg` (1200x630) with LottoDrop branding
- Created `twitter-card.svg` (1200x675) with LottoDrop branding
- Purple gradient theme matching brand identity

**robots.txt Cleanup**
- Removed references to non-existent pages
- Added explicit Allow for public routes
- Updated sitemap reference

### October 29, 2025 - Week 4 Security Audit

**HttpOnly Cookie Authentication**
- Migrated from localStorage to HttpOnly cookies
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry with auto-rotation
- SameSite=Strict and Secure flags

**CSRF Protection**
- Redis-backed token validation
- Dual-mode: User-based and session-based
- X-CSRF-Token header for state-changing requests
- Auto-refresh before expiry (50 min)

**Session Management**
- Event-driven re-authentication prompts
- Manual logout detection
- WebSocket cookie-based auth

**Password Validation**
- zxcvbn integration for strength checking
- Frontend and backend validation
- User-friendly error messages

**Login Error Handling**
- Sanitized error messages
- Account lockout notifications
- Clear user feedback

### October 26-27, 2025 - Bug Fixes

**BUG-024: Frozen Confetti Animation** - FIXED
- Root cause: Stale closure in useEffect
- Solution: Ref pattern for stable callbacks

**BUG-025: VRF Modal Persisting** - FIXED
- Root cause: Missing state cleanup
- Solution: Added setAnimating(false) to onClose

**BUG-026: Room List State Sync** - FIXED
- Root cause: Race conditions in state updates
- Solution: Improved state management

### October 2025 - Admin Portal Redesign

- Purple branding (#9D4EDD) throughout
- CSS variables in design-system.css
- Responsive design (320px - 1024px)
- Glass-morphism login page
- Consistent table styling across all pages

## Development Guidelines

### When implementing features:
1. Start with Elite Product Owner for requirements
2. Design with Elite Gaming UX Designer
3. Architect with Enterprise Solution Architect
4. Implement with relevant technical agents
5. Add animations with Casino Animation Specialist
6. Test with Manual QA Tester
7. Deploy with Elite PM Delivery Leader oversight

### When fixing bugs:
1. Reproduce with Manual QA Tester
2. Analyze root cause with relevant technical agent
3. Implement fix with proper CSS specificity
4. Verify fix doesn't break other features
5. Document in completion report

### When styling admin pages:
1. ALWAYS use CSS variables from design-system.css
2. NEVER hardcode colors
3. Use `.parent .child` pattern for specificity
4. Apply `!important` only when overriding design-system
5. Test on multiple screen sizes (320px, 768px, 1024px)
6. Ensure purple branding (#9D4EDD) is consistent

### Security Implementation Checklist
- Use HttpOnly cookies for sensitive tokens (never localStorage)
- Implement CSRF protection for state-changing requests
- Validate SameSite=Strict and Secure flags on cookies
- Use event-driven architecture for auth state changes
- Differentiate manual logout from session expiry
- Add comprehensive E2E security tests
- Test XSS/CSRF attack vectors
- Verify CSP headers don't block legitimate requests

## Gaming-Specific Requirements

### Fairness
- All RNG must be verifiable
- Seeds must be persisted
- House edge transparent
- Audit trail complete

### Compliance
- 18+ age verification
- Responsible gaming features
- Self-exclusion options
- Transaction history accessible
- Dispute resolution process

### User Experience
- Instant game feedback
- Clear winning indicators
- Smooth animations (60fps)
- Mobile responsive
- Accessible controls

## Project Documentation

Key documentation files:
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `TESTING_GUIDE.md` - Testing procedures
- `DATABASE_STRUCTURE.md` - Schema documentation
- `GAME_ROOM_AUDIT_REPORT.md` - Game room analysis
- `WEEK4_SECURITY_SUMMARY.md` - Security implementation details
- `frontend/AUDIO_ARCHITECTURE.md` - Audio system docs

### SEO Assets
- `frontend/public/sitemap.xml` - XML sitemap for search engines
- `frontend/public/robots.txt` - Crawler directives (allows public pages)
- `frontend/public/og-image.svg` - Open Graph image for social sharing
- `frontend/public/twitter-card.svg` - Twitter card image
- `frontend-admin/nginx-site.conf` - Admin nginx config with noindex headers

## Remember

You are building a **production-grade gaming platform** that handles real money. Every decision impacts:
- User trust
- Platform security
- Regulatory compliance
- Business revenue
- User experience

**USE THE AGENTS** - They are your domain experts. Their collective expertise ensures success.

---

*Configuration Version: 1.6.0*
*Last Updated: January 27, 2026*
*Project: LottoDrop - Real-time Lottery Gaming Platform*
*Production URL: https://lottodrop.net*
*Docker Status: 5 containers configured*
*Latest: Full-site SEO audit implementation (Jan 27, 2026)*
