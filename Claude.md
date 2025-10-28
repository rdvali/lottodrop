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

### Current Stack (Updated October 2025)
- **Frontend**: React 19.1.1, TypeScript 5.9.2, Vite 7.1.5, TailwindCSS
- **Admin Portal**: React 19.1.1, TypeScript 4.9.5, Create React App 5.0.1
- **Backend**: Node.js 18+, Express 5.1.0, Socket.IO 4.8.1
- **Database**: PostgreSQL 15+ with pg 8.16.3 driver, Redis (ioredis 5.7.0)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0
- **Real-time**: WebSocket via Socket.IO with Redis adapter
- **Deployment**: Docker Compose with nginx:alpine, 5 containers
- **Domain**: lottodrop.net (configured with proper SEO)

### Project Structure
```
LottoDrop/
├── frontend/          # React 19 + Vite application (Main Platform)
│   ├── public/        # Static assets + robots.txt + PWA manifest
│   │   └── drop-icon.svg  # LottoDrop purple water drop logo
│   ├── src/
│   │   ├── components/  # Atomic design (atoms/molecules/organisms)
│   │   ├── contexts/    # React contexts (Auth, Socket, Theme)
│   │   ├── hooks/       # Custom hooks (useRoomActivity, useModal)
│   │   ├── pages/       # Route components
│   │   ├── services/    # API & Socket services
│   │   └── types/       # TypeScript definitions
│   ├── nginx-site.conf  # Production nginx config with security
│   └── Dockerfile       # Multi-stage build
├── frontend-admin/    # Admin dashboard (Port 81)
│   ├── public/
│   │   └── drop-icon.svg  # Shared purple logo
│   ├── src/
│   │   ├── components/  # Sidebar, FilterSection, Card
│   │   ├── contexts/    # AuthContext
│   │   ├── pages/       # Dashboard, Users, Rooms, Rounds, Transactions, Login
│   │   ├── styles/      # design-system.css (purple theme)
│   │   └── utils/       # API helpers
│   └── Dockerfile       # Multi-stage build with nginx
├── backend/           # Express 5 API + WebSocket
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Helpers & middleware
│   │   └── types/       # TypeScript interfaces
│   └── Dockerfile       # Node.js production image
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
   - Bundle splitting (largest: 241KB frontend, 110KB admin)
   - 60fps animations with Framer Motion
   - <100ms API response times
   - Aggressive caching strategy (1yr for assets)
5. **SEO & Accessibility**:
   - Complete robots.txt with gaming-specific rules
   - PWA manifest for mobile installation
   - WCAG 2.1 AA compliance
   - Meta tags for social sharing
6. **Admin Portal**:
   - Modern purple branding with CSS design system
   - Comprehensive user management
   - Real-time transaction monitoring
   - Game room and rounds management
   - Advanced filtering and search capabilities

## 🎨 Design System (October 2025)

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

### Admin Portal Styling Architecture
- **CSS Variables**: Comprehensive design token system in `design-system.css`
- **Consistent Theming**: All pages use purple gradients and CSS variables
- **Responsive Design**: Mobile-first with breakpoints at 640px, 768px, 1024px
- **Dark Theme**: Default dark mode optimized for extended use
- **Accessibility**: High contrast support, focus states, keyboard navigation

### Logo Assets
- **Primary Logo**: `drop-icon.svg` - Purple water drop with sparkle effect
- **Gradient**: Linear gradient from #9D4EDD → #C77DFF → #7B2CBF
- **Usage**: Shared across frontend and admin portal
- **Dimensions**: 512x512px with 96px border radius

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
7. **USE CSS VARIABLES** - Never hardcode colors in admin portal
8. **RESPECT SPECIFICITY** - Use `!important` only when necessary for overrides

## 🚀 Recent Updates

### October 26, 2025 - Critical Animation & Modal Bug Fixes 🐛

#### Game Experience Issues Resolved
After extensive debugging and 4 fix attempts, resolved critical animation issues affecting game completion experience:

1. **BUG-024: Frozen Confetti Particles Animation** ✅ FIXED
   - **Issue**: Purple confetti particles rendered but remained frozen (no animation)
   - **Root Cause**: Stale closure in Celebration component - `onComplete` callback in useEffect dependency array caused infinite re-execution loop, interrupting canvas-confetti particle physics
   - **Solution**: Implemented **ref pattern** in both files:
     - `Celebration.tsx`: Used `useRef` to store callback, removed from dependency array
     - `GameRoom.tsx`: Created stable `handleCelebrationComplete` with `useCallback` and empty deps
   - **Impact**: Confetti now animates smoothly for 2.5s with natural gravity physics
   - **Files Modified**:
     - `frontend/src/components/animations/Celebration/Celebration.tsx` (lines 1-67)
     - `frontend/src/pages/GameRoom/GameRoom.tsx` (lines 104-109, 1341)

2. **BUG-025: VRF Animation Modal Persisting After Results Dismissal** ✅ FIXED
   - **Issue**: "Selecting Winner" VRF animation modal remained visible in background after closing Winner Results Modal
   - **Root Cause**: Missing state cleanup - `animating` state not set to false when results modal closed
   - **Solution**: Added `setAnimating(false)` to Winner Results Modal's onClose handler
   - **Impact**: Clean modal dismissal, proper state reset for next round
   - **Files Modified**:
     - `frontend/src/pages/GameRoom/GameRoom.tsx` (line 1350)

#### Technical Implementation Details

**Ref Pattern for Stable Callbacks**:
```typescript
// Problem: New function created every render → useEffect restarts → animation interrupted
onComplete={() => setShowCelebration(false)}  // ❌ Unstable

// Solution: Stable callback with useCallback + ref pattern
const onCompleteRef = useRef(onComplete)
useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
const handleComplete = useCallback(() => { /* logic */ }, [])  // ✅ Stable
```

**Modal State Management**:
```typescript
// BEFORE: Only stopped celebration
onClose={() => {
  setShowCelebration(false)
  winnerResults.dismissResults()
}}

// AFTER: Properly cleans up all modal states
onClose={() => {
  setShowCelebration(false)
  setAnimating(false)  // ✅ Hides VRF animation modal
  winnerResults.dismissResults()
}}
```

#### Agent Collaboration
- **Casino Animation Specialist**: Diagnosed canvas-confetti animation freezing, identified stale closure pattern
- **React Frontend Expert**: Applied ref pattern and useCallback optimizations
- **Manual QA Tester**: Verified TypeScript compilation and build integrity

#### Deployment Stats
- Build Time: 3.08s (frontend)
- Bundle Size: 282.43 kB (no increase)
- Docker Deploy: Successful (container healthy)
- HTTP Status: 200 OK

#### Testing Verified
- ✅ Confetti particles animate smoothly (100 purple particles, 2.5s duration)
- ✅ VRF animation modal dismisses properly when results close
- ✅ No stale modals persist in background
- ✅ Clean state transitions between rounds
- ✅ TypeScript compilation: 0 errors

### October 2025 - Admin Portal Redesign 🎨

#### Major UI/UX Improvements
1. **Logo Replacement**
   - Replaced lottery ball logo with purple water drop (`drop-icon.svg`)
   - Consistent branding across login page and dashboard
   - 36px × 36px in sidebar, 80px × 80px in login

2. **Login Page Redesign**
   - Purple gradient background with glass-morphism effect
   - Fixed CSS specificity issues with input padding
   - Optimized form spacing (1rem gap, 0.5rem button margin)
   - Changed button text: "Access Admin Panel" → "Log In"
   - Updated placeholder: admin@lottodrop.com → user@example.com
   - Removed subtitle for cleaner design

3. **Purple Theme Implementation**
   - Updated `design-system.css` with comprehensive purple color system
   - Changed primary color from teal (#14B8A6) to purple (#9D4EDD)
   - Implemented gradient: `linear-gradient(135deg, #9D4EDD, #A855F7)`
   - Updated all accent colors, borders, and shadows

4. **Table Styling Consistency** ✅ COMPLETE
   - **Users Page**: Converted hardcoded colors to CSS variables
   - **Rooms Page**: Replaced all teal colors with purple
   - **Rounds Page**: Fixed CSS specificity for round-id and prize-pool colors
   - **Dashboard Page**: Updated stat cards and chart cards to purple theme
   - **Transactions Page**: Already properly styled (used as reference)

5. **CSS Architecture Improvements**
   - Migrated from hardcoded colors to CSS variables throughout
   - Fixed CSS specificity issues with `.table .cell` pattern
   - Added `!important` flags strategically for color overrides
   - Responsive design optimizations for mobile (320px-1024px)

#### Technical Details
```css
/* Key CSS Fixes Applied */
.rounds-table .round-id {
  color: #9D4EDD !important;  /* Override td default color */
}

.login-form .form-input {
  padding: 0 4.5rem !important;  /* Override design-system */
}

.nav-item-active {
  background: rgba(157, 78, 221, 0.1);  /* Purple instead of blue */
}
```

#### Deployment Stats
- Build Time: ~11-13 seconds per deployment
- CSS Bundle Size: 18.99KB (gzipped)
- Zero TypeScript errors (ESLint warnings only for unused API_URL)
- All 5 Docker containers healthy and running

### September 2025 - Foundation

#### Fixed Issues
- ✅ TypeScript errors in RoomList.tsx (removed unused state)
- ✅ TypeScript errors in TournamentCard.tsx (Framer Motion ease typing)
- ✅ TypeScript errors in useRoomActivity.ts (unused parameter)
- ✅ robots.txt serving issue (nginx configuration fixed)
- ✅ SEO optimization with proper meta tags and crawl directives

#### Infrastructure Improvements
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
- CSS variables for all theme colors

### Performance
- Lighthouse score >90
- FCP <1.5s
- TTI <3.5s
- Bundle size <500KB initial (frontend), <200KB (admin)
- 60fps animations
- Optimized Docker builds (<15s)

### Security
- All inputs sanitized
- SQL injection protected
- XSS prevention
- CORS properly configured
- Secrets in environment variables
- JWT authentication with secure cookies

### Design Consistency
- All admin pages use purple theme (#9D4EDD)
- CSS variables for maintainability
- Consistent spacing with rem units
- Responsive breakpoints standardized
- Accessible color contrasts (WCAG AA)

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
- Smooth animations (60fps)
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
3. Implement fix with proper CSS specificity
4. Verify fix doesn't break other features
5. Document in completion report

### When styling admin pages:
1. ALWAYS use CSS variables from design-system.css
2. NEVER hardcode colors (#1e293b, #334155, etc.)
3. Use `.parent .child` pattern for specificity
4. Apply `!important` only when overriding design-system
5. Test on multiple screen sizes (320px, 768px, 1024px)
6. Ensure purple branding (#9D4EDD) is consistent

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
lottodrop-admin       # Port 81  - Admin panel with nginx
```

### Container Health Status (October 2025)
```
lottodrop-admin:    Up 27 hours   (healthy) - Recently updated
lottodrop-frontend: Up 2 days     (healthy)
lottodrop-backend:  Up 2 days     (healthy)
lottodrop-postgres: Up 4 weeks    (healthy)
lottodrop-redis:    Up 3 weeks    (healthy)
```

### Key Configuration Files
- `docker-compose.yml` - Container orchestration
- `docker-compose.override.yml` - Development overrides
- `frontend/nginx-site.conf` - Production nginx with security headers
- `frontend-admin/Dockerfile` - Multi-stage build (Node 18 + Nginx Alpine)
- `frontend/public/robots.txt` - SEO crawler directives
- `.env` files - Environment variables (never commit!)

### Deployment Commands
```bash
# Build and deploy admin panel
docker-compose build frontend-admin
docker-compose up -d frontend-admin

# Build and deploy main frontend
docker-compose build frontend
docker-compose up -d frontend

# View logs
docker logs lottodrop-admin --tail 50

# Check container health
docker ps | grep lottodrop

# Access admin panel
http://localhost:81
```

### Build Performance
- Frontend Admin: 11-13 seconds
- Frontend Main: 12-15 seconds
- Backend: 8-10 seconds
- Total deployment time: <2 minutes

## 🔄 Continuous Improvement

- Regularly review code with technical agents
- Update documentation after significant changes
- Maintain test coverage above 80%
- Monitor performance metrics via Docker logs
- Track user feedback and iterate
- Run TypeScript checks before deployment
- Verify CSS consistency across admin pages
- Test responsive design on multiple devices

## 📋 Common CSS Specificity Patterns

### Problem: Generic Selector Overrides Specific Styling
```css
/* ❌ WRONG - Gets overridden */
.cell { color: #9D4EDD; }
.table td { color: #E2E8F0; }  /* This wins */

/* ✅ CORRECT - Higher specificity */
.table .cell { color: #9D4EDD !important; }
```

### Problem: Design System Variable Conflict
```css
/* ❌ WRONG - Design system wins */
.form-input { padding: 0 4.5rem; }

/* ✅ CORRECT - Parent scoping with !important */
.login-form .form-input { padding: 0 4.5rem !important; }
```

### Best Practices
1. Use `.parent .child` pattern for higher specificity
2. Add `!important` when overriding design-system.css
3. Always use CSS variables for colors
4. Test in compiled CSS, not just source files
5. Verify with `curl` or browser DevTools

## 📋 Remember

You are building a **production-grade gaming platform** that handles real money. Every decision impacts:
- User trust
- Platform security
- Regulatory compliance
- Business revenue
- User experience

**USE THE AGENTS** - They are your domain experts. Their collective expertise ensures success.

### Admin Portal Checklist
When working on admin portal:
- ✅ Use CSS variables from design-system.css
- ✅ Maintain purple branding consistency
- ✅ Test CSS specificity (check compiled output)
- ✅ Verify responsive design (mobile, tablet, desktop)
- ✅ Deploy and verify in Docker container
- ✅ Check all pages for visual consistency

---

*Configuration Version: 1.3.0*
*Last Updated: October 26, 2025*
*Project: LottoDrop - Real-time Lottery Gaming Platform*
*Production URL: https://lottodrop.net*
*Docker Status: All 5 containers healthy and running*
*Latest: Critical animation bugs fixed - confetti particles & VRF modal dismissal (Oct 26, 2025)*
