# Claude AI Assistant Configuration for LottoDrop

## 🎰 Project Overview

You are working on **LottoDrop**, a production-ready real-time lottery-style gaming platform deployed at **lottodrop.net**. Built with React 19/TypeScript frontend and Node.js/Express backend. This enterprise-grade application features real-time WebSocket communication, secure financial transactions, provably fair gaming mechanics, and comprehensive SEO optimization.

**Current Status**: ✅ Production-Ready | All systems operational | Docker deployment active

## 🤖 Agent-Based Development System

### MANDATORY EXECUTION PROTOCOL

You have access to 9 specialized AI agents. **YOU MUST USE THESE AGENTS** for all relevant tasks:

1. **🎬 Casino Animation Specialist**
   - Domain: Animations, transitions, game effects, particle systems
   - Use for: Slot animations, winning celebrations, UI transitions, physics simulations
   - Expertise: 60fps optimization, WebGL/Canvas, Lottie, micro-interactions

2. **🎨 Casino Visual Designer**
   - Domain: UI design, visual assets, icons, logos, brand identity
   - Use for: Game icons, platform logos, visual themes, color schemes
   - Expertise: Vegas aesthetics, luxury themes, responsible gaming compliance

3. **🎮 Elite Gaming UX Designer**
   - Domain: User experience, interaction design, HUDs, onboarding flows
   - Use for: Interface design, user journeys, accessibility, conversion optimization
   - Expertise: Gaming psychology, flow state optimization, WCAG compliance

4. **📊 Elite PM Delivery Leader**
   - Domain: Project management, risk assessment, timeline management
   - Use for: Sprint planning, resource allocation, stakeholder management
   - Expertise: Agile/Scrum, risk mitigation, 98% on-time delivery rate

5. **🎯 Elite Product Owner**
   - Domain: Product strategy, backlog management, requirements definition
   - Use for: Feature prioritization, user stories, MVP definition, roadmap planning
   - Expertise: RICE/WSJF frameworks, stakeholder alignment, OKRs

6. **🏗️ Enterprise Solution Architect**
   - Domain: System architecture, cloud strategy, scalability planning
   - Use for: Architecture decisions, integration patterns, performance optimization
   - Expertise: Microservices, AWS/Azure/GCP, distributed systems, security

7. **💰 Gaming Finance Backend**
   - Domain: Payment systems, betting engines, financial calculations
   - Use for: Transaction processing, RNG implementation, odds calculation, fraud detection
   - Expertise: PCI DSS compliance, cryptographic security, GLI-19 regulations

8. **🔍 Manual QA Tester**
   - Domain: Testing, bug detection, quality assurance
   - Use for: Test case creation, regression testing, API testing, security testing
   - Expertise: Exploratory testing, bug reporting, requirement validation

9. **⚛️ React Frontend Expert**
   - Domain: React development, performance optimization, state management
   - Use for: Component architecture, React hooks, Redux/Zustand, TypeScript
   - Expertise: React 19, Next.js, testing strategies, accessibility

## 📋 MANDATORY TASK EXECUTION WORKFLOW

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
- Requirements Met: ✓/✗
- QA Testing: ✓/✗
- Technical Review: ✓/✗

**Confidence Level:** [High/Medium/Low]
**Issues Found:** [None/List]
**Next Steps:** [If applicable]
```

## 🏗️ Technical Context

### Current Stack (Verified Sept 2025)
- **Frontend**: React 19.1.1, TypeScript 5.9.2, Vite 7.1.5, TailwindCSS
- **Backend**: Node.js 18+, Express 5.1.0, Socket.IO 4.8.1
- **Database**: PostgreSQL 15+ with pg 8.16.3 driver, Redis (ioredis 5.7.0)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0
- **Real-time**: WebSocket via Socket.IO with Redis adapter
- **Deployment**: Docker Compose with nginx:alpine, 5 containers
- **Domain**: lottodrop.net (configured with proper SEO)

### Project Structure
```
LottoDrop/
├── frontend/          # React 19 + Vite application
│   ├── public/        # Static assets + robots.txt + PWA manifest
│   ├── src/
│   │   ├── components/  # Atomic design (atoms/molecules/organisms)
│   │   ├── contexts/    # React contexts (Auth, Socket, Theme)
│   │   ├── hooks/       # Custom hooks (useRoomActivity, useModal)
│   │   ├── pages/       # Route components
│   │   ├── services/    # API & Socket services
│   │   └── types/       # TypeScript definitions
│   ├── nginx-site.conf  # Production nginx config with security
│   └── Dockerfile       # Multi-stage build
├── backend/           # Express 5 API + WebSocket
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Helpers & middleware
│   │   └── types/       # TypeScript interfaces
│   └── Dockerfile       # Node.js production image
├── admin-panel/       # Admin dashboard (frontend-admin)
├── shared/           # Shared types/utilities
├── database/         # SQL schemas and migrations
└── docker-compose.yml # Multi-container orchestration
```

### Key Features & Current Implementation
1. **Real-time Updates**: WebSocket events with Redis pub/sub, 30-second polling intervals
2. **Provably Fair**: VRF implementation with seed persistence and audit trail
3. **Security Hardened**:
   - nginx rate limiting (10 conn/IP, 100 total)
   - CORS configuration with origin validation
   - XSS/CSRF protection headers
   - SQL injection prevention via parameterized queries
   - Container security with non-root users
4. **Performance Optimized**:
   - Bundle splitting (largest: 241KB)
   - 60fps animations with Framer Motion
   - <100ms API response times
   - Aggressive caching strategy (1yr for assets)
5. **SEO & Accessibility**:
   - Complete robots.txt with gaming-specific rules
   - PWA manifest for mobile installation
   - WCAG 2.1 AA compliance
   - Meta tags for social sharing

## 🎯 Agent Collaboration Patterns

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

## 🚨 Critical Rules

1. **NEVER skip agent consultation** - These are domain experts
2. **ALWAYS verify with QA** - Every change needs testing
3. **DOCUMENT agent usage** - Transparency in decision-making
4. **PRIORITIZE security** - Gaming platform = high security requirements
5. **MAINTAIN performance** - 60fps animations, <100ms responses
6. **ENSURE compliance** - GLI-19, PCI DSS, responsible gaming

## 🚀 Recent Updates (Sept 26, 2025)

### Fixed Issues
- ✅ TypeScript errors in RoomList.tsx (removed unused state)
- ✅ TypeScript errors in TournamentCard.tsx (Framer Motion ease typing)
- ✅ TypeScript errors in useRoomActivity.ts (unused parameter)
- ✅ robots.txt serving issue (nginx configuration fixed)
- ✅ SEO optimization with proper meta tags and crawl directives

### Infrastructure Improvements
- Enhanced nginx security configuration
- Optimized Docker multi-stage builds
- Improved caching strategies
- Added health check endpoints
- Configured proper CORS headers

## 📊 Quality Standards

### Code Quality
- TypeScript strict mode
- Comprehensive error handling
- Unit test coverage >80%
- No console.logs in production
- Proper type definitions

### Performance
- Lighthouse score >90
- FCP <1.5s
- TTI <3.5s
- Bundle size <500KB initial
- 60fps animations

### Security
- All inputs sanitized
- SQL injection protected
- XSS prevention
- CORS properly configured
- Secrets in environment variables

## 🎮 Gaming-Specific Requirements

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
- Smooth animations
- Mobile responsive
- Accessible controls

## 📝 Development Guidelines

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
3. Implement fix
4. Verify fix doesn't break other features
5. Document in completion report

### When optimizing performance:
1. Profile with React Frontend Expert or Gaming Finance Backend
2. Identify bottlenecks with Enterprise Solution Architect
3. Implement optimizations
4. Measure improvements
5. Verify no functionality regression

## 🐳 Deployment & Infrastructure

### Docker Container Architecture
```bash
# Current containers (all healthy):
lottodrop-frontend    # Port 80  - React app with nginx
lottodrop-backend     # Port 3001 - Express API + WebSocket
lottodrop-postgres    # Port 5432 - PostgreSQL 15
lottodrop-redis       # Port 6379 - Redis cache & pub/sub
lottodrop-admin       # Port 81  - Admin panel
```

### Key Configuration Files
- `docker-compose.yml` - Container orchestration
- `docker-compose.override.yml` - Development overrides
- `frontend/nginx-site.conf` - Production nginx with security headers
- `frontend/public/robots.txt` - SEO crawler directives
- `.env` files - Environment variables (never commit!)

### Deployment Commands
```bash
# Build and deploy frontend
docker-compose build frontend
docker-compose up -d frontend

# View logs
docker logs lottodrop-frontend --tail 50

# Check container health
docker ps | grep lottodrop
```

## 🔄 Continuous Improvement

- Regularly review code with technical agents
- Update documentation after significant changes
- Maintain test coverage above 80%
- Monitor performance metrics via Docker logs
- Track user feedback and iterate
- Run TypeScript checks before deployment

## 📋 Remember

You are building a **production-grade gaming platform** that handles real money. Every decision impacts:
- User trust
- Platform security
- Regulatory compliance
- Business revenue
- User experience

**USE THE AGENTS** - They are your domain experts. Their collective expertise ensures success.

---

*Configuration Version: 1.1.0*
*Last Updated: September 26, 2025*
*Project: LottoDrop - Real-time Lottery Gaming Platform*
*Production URL: https://lottodrop.net*
*Docker Status: All 5 containers healthy and running*