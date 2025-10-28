# Claude AI Assistant Configuration for LottoDrop

## 🎰 Project Overview

You are working on **LottoDrop**, a real-time lottery-style gaming platform built with React/TypeScript frontend and Node.js/Express backend. This is a production-grade application featuring real-time WebSocket communication, secure financial transactions, and provably fair gaming mechanics.

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

### Current Stack
- **Frontend**: React 19.1.1, TypeScript, Socket.IO Client, CSS Modules
- **Backend**: Node.js 18+, Express 5.1.0, Socket.IO, PostgreSQL
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket via Socket.IO
- **Database**: PostgreSQL 15+ with native pg driver

### Project Structure
```
LottoDrop/
├── frontend/          # React application
├── backend/           # Express API + WebSocket
├── admin-panel/       # Admin dashboard
├── shared/           # Shared types/utilities
└── database/         # SQL schemas and migrations
```

### Key Features to Maintain
1. **Real-time Updates**: All game events via WebSocket
2. **Provably Fair**: VRF implementation for random number generation
3. **Security First**: JWT auth, bcrypt hashing, SQL injection prevention
4. **Performance**: <100ms API response, 60fps animations
5. **Accessibility**: WCAG 2.1 AA compliance

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

## 🔄 Continuous Improvement

- Regularly review code with technical agents
- Update documentation after significant changes
- Maintain test coverage above 80%
- Monitor performance metrics
- Track user feedback and iterate

## 📋 Remember

You are building a **production-grade gaming platform** that handles real money. Every decision impacts:
- User trust
- Platform security
- Regulatory compliance
- Business revenue
- User experience

**USE THE AGENTS** - They are your domain experts. Their collective expertise ensures success.

## 🚀 Recent Updates

### October 26, 2025 - Critical Animation & Modal Bug Fixes 🐛

#### BUG-024: Frozen Confetti Particles Animation ✅ FIXED
- **Issue**: Purple confetti particles rendered but remained frozen (no animation)
- **Root Cause**: Stale closure in Celebration component - `onComplete` callback in useEffect dependency array caused infinite re-execution loop, interrupting canvas-confetti particle physics
- **Solution**:
  - Implemented ref pattern in `Celebration.tsx` (lines 1-67)
  - Created stable callback with `useCallback` in `GameRoom.tsx` (lines 104-109, 1341)
- **Files Modified**:
  - `src/components/animations/Celebration/Celebration.tsx`
  - `src/pages/GameRoom/GameRoom.tsx`

#### BUG-025: VRF Animation Modal Persisting ✅ FIXED
- **Issue**: "Selecting Winner" VRF animation modal remained visible after closing Winner Results Modal
- **Root Cause**: Missing `setAnimating(false)` in modal's onClose handler
- **Solution**: Added proper state cleanup to Winner Results Modal's onClose (line 1350)
- **Files Modified**:
  - `src/pages/GameRoom/GameRoom.tsx`

#### Technical Implementation
```typescript
// Ref Pattern for Stable Callbacks
const onCompleteRef = useRef(onComplete)
useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
const handleComplete = useCallback(() => { /* logic */ }, [])

// Modal State Cleanup
onClose={() => {
  setShowCelebration(false)
  setAnimating(false)  // ✅ Hides VRF animation modal
  winnerResults.dismissResults()
}}
```

#### Agents Used
- **Casino Animation Specialist**: Diagnosed canvas-confetti freezing, identified stale closure
- **React Frontend Expert**: Applied ref pattern and useCallback optimizations
- **Manual QA Tester**: Verified TypeScript compilation and build integrity

#### Deployment Stats
- Build Time: 3.08s
- Bundle Size: 282.43 kB (no increase)
- TypeScript: 0 errors
- Docker: Healthy and running

---

*Configuration Version: 1.1.0*
*Last Updated: October 26, 2025*
*Project: LottoDrop - Real-time Lottery Gaming Platform*
*Latest: Critical animation bugs fixed (Oct 26, 2025)*