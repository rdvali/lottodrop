# 🎰 LottoDrop Frontend

A modern, real-time lottery gaming platform built with React 19, TypeScript, and Vite. Features responsive design, accessibility compliance (WCAG 2.1 AA), and production-ready security configurations.

## 🚀 Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS
- **Real-time Gaming**: WebSocket integration for live game updates
- **Accessibility First**: WCAG 2.1 AA compliant with comprehensive keyboard navigation
- **Responsive Design**: Mobile-first approach with touch-friendly interactions
- **Performance Optimized**: Lazy loading, code splitting, and performance monitoring
- **Security Hardened**: CSP headers, XSS protection, input sanitization
- **Error Tracking**: Sentry integration with comprehensive error boundaries
- **Production Ready**: Docker containerization with Nginx and CI/CD pipeline

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **Docker**: 20.x or higher (for containerization)

## 🛠️ Installation

### Development Setup

```bash
# Clone the repository
git clone https://github.com/lottodrop/frontend.git
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Sentry Configuration (optional)
VITE_SENTRY_DSN=your-sentry-dsn-here

# Application Version
VITE_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── atoms/          # Basic UI elements (Button, Input, etc.)
│   ├── molecules/      # Composite components (PlayerCard, StatCard)
│   ├── organisms/      # Complex components (Header, Modal, etc.)
│   └── templates/      # Page layouts
├── pages/              # Page components
│   ├── GameRoom/       # Game room interface
│   ├── Profile/        # User profile page
│   └── RoomList/       # Game rooms listing
├── hooks/              # Custom React hooks
│   ├── useResponsive.ts    # Responsive design utilities
│   ├── useAccessibility.ts # Accessibility helpers
│   └── useSecurity.ts      # Security utilities
├── utils/              # Utility functions
│   ├── accessibility.ts   # Accessibility utilities
│   ├── responsive.ts     # Responsive breakpoints
│   ├── security.ts       # Security helpers
│   └── sentry.ts         # Error tracking
├── services/           # API and external services
│   ├── api/           # API client configurations
│   └── socket/        # WebSocket management
├── contexts/           # React contexts
├── styles/            # Global styles and themes
└── types/             # TypeScript type definitions
```

## 🎮 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Testing
- `npm run test` - Run unit tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npm run test:integration` - Run integration tests
- `npm run test:all` - Run all tests

### Code Quality
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Performance
- `npm run lighthouse` - Run Lighthouse audit
- `npm run bundle-analyze` - Analyze bundle size

## 🎨 Design System

### Breakpoints
```typescript
const breakpoints = {
  xs: '320px',    // Extra small devices (phones)
  sm: '480px',    // Small devices (phones)
  md: '768px',    // Medium devices (tablets)
  lg: '1024px',   // Large devices (laptops)
  xl: '1280px',   // Extra large devices (desktops)
  '2xl': '1536px' // 2X large devices (large desktops)
};
```

### Components

#### Atoms
- **Button**: Primary, secondary, and gaming-themed buttons
- **Input**: Form inputs with validation and accessibility
- **Card**: Container component with gaming aesthetics
- **Avatar**: User profile images with status indicators
- **Badge**: Status and notification indicators

#### Molecules
- **PlayerCard**: Player information display
- **StatCard**: Game statistics display

#### Organisms
- **Header**: Main navigation with user controls
- **Modal**: Accessible modal dialogs
- **AuthModal**: Authentication forms
- **TournamentCard**: Tournament information display

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance
- Screen reader support with ARIA labels and roles
- Keyboard navigation for all interactive elements
- Focus management and visual indicators
- Color contrast ratios meeting AA standards
- Alternative text for images and icons

### Gaming Accessibility
- Game state announcements for screen readers
- Reduced motion preferences support
- Touch-friendly interactive elements (44px minimum)
- High contrast mode support

### Usage Example
```tsx
import { useAccessibility, LiveRegion } from '@/hooks/useAccessibility';

function GameComponent() {
  const { announce } = useScreenReader();
  
  const handleWin = (amount: number) => {
    announce(`Congratulations! You won $${amount}!`, 'assertive');
  };
  
  return (
    <div>
      <LiveRegion priority="assertive" />
      {/* Game content */}
    </div>
  );
}
```

## 🔒 Security Features

### Content Security Policy
- Strict CSP headers to prevent XSS attacks
- Whitelisted domains for external resources
- Inline script restrictions

### Input Sanitization
- XSS prevention for all user inputs
- SQL injection pattern detection
- Bet amount validation and sanitization

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Usage Example
```tsx
import { useInputSanitization, useRateLimit } from '@/hooks/useSecurity';

function BetForm() {
  const { sanitizeBetAmount } = useInputSanitization();
  const rateLimit = useRateLimit('bet-submission', 10, 60000);
  
  const handleSubmit = (amount: number) => {
    if (!rateLimit.isAllowed()) return;
    
    const sanitizedAmount = sanitizeBetAmount(amount);
    // Process bet...
  };
}
```

## 📱 Responsive Design

### Mobile-First Approach
- Optimized for mobile devices with touch-friendly interfaces
- Progressive enhancement for larger screens
- Fluid typography and spacing scales

### Usage Example
```tsx
import { useResponsiveValue, useIsMobile } from '@/hooks/useResponsive';

function ResponsiveComponent() {
  const columns = useResponsiveValue({
    base: 1,
    md: 2,
    lg: 3
  });
  
  const isMobile = useIsMobile();
  
  return (
    <div style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {/* Content */}
    </div>
  );
}
```

## 🐛 Error Tracking

### Sentry Integration
- Automatic error capture and reporting
- Performance monitoring
- User session replay
- Gaming-specific error contexts

### Error Boundaries
- Graceful error handling with fallback UI
- Isolated error boundaries for components
- Gaming-specific error messages

### Usage Example
```tsx
import { ErrorBoundary, GameErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <GameErrorBoundary>
        <GameComponent />
      </GameErrorBoundary>
    </ErrorBoundary>
  );
}
```

## 🐳 Docker Deployment

### Building the Image
```bash
# Build production image
docker build -t lottodrop-frontend:latest .

# With build arguments
docker build \
  --build-arg VITE_API_URL=https://api.lottodrop.com \
  --build-arg VITE_SENTRY_DSN=your-dsn \
  -t lottodrop-frontend:latest .
```

### Running with Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Environment Configuration
Set the following environment variables in your deployment:

```env
VITE_API_URL=https://api.lottodrop.com
VITE_WS_URL=wss://api.lottodrop.com
VITE_SENTRY_DSN=your-sentry-dsn-here
VITE_APP_VERSION=1.0.0
FRONTEND_PORT=8080
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
- **Quality Checks**: Linting, type checking, testing
- **Security Audit**: Vulnerability scanning, dependency audits
- **Performance Tests**: Lighthouse CI integration
- **Docker Build**: Multi-platform image building
- **Automated Deployment**: Staging and production deployments
- **Rollback Support**: Automatic rollback on deployment failures

### Deployment Environments
- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment with monitoring

## 📊 Performance

### Optimization Features
- Code splitting with lazy loading
- Tree shaking for smaller bundles
- Image optimization and lazy loading
- Service worker for offline support
- Gzip compression in production

### Performance Budgets
- Initial bundle size: < 500KB
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse score: > 90

## 🧪 Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Hook testing with custom test utilities
- Utility function testing

### Integration Tests
- API integration testing
- WebSocket connection testing
- User flow testing

### E2E Tests
- Critical user journeys
- Cross-browser compatibility
- Accessibility testing

## 🔧 Development Guidelines

### Code Style
- ESLint with TypeScript support
- Prettier for code formatting
- Consistent naming conventions
- Component composition patterns

### Git Workflow
- Feature branch development
- Pull request reviews
- Conventional commit messages
- Automated testing on PRs

### Performance Best Practices
- Lazy load non-critical components
- Optimize images and assets
- Minimize bundle size
- Use React.memo for expensive components

## 📚 API Integration

### WebSocket Connection
```tsx
import { useSocket } from '@/services/socket';

function GameRoom() {
  const socket = useSocket();
  
  useEffect(() => {
    socket.on('game:update', handleGameUpdate);
    socket.on('player:join', handlePlayerJoin);
    
    return () => {
      socket.off('game:update');
      socket.off('player:join');
    };
  }, []);
}
```

### REST API Calls
```tsx
import { authService, roomService } from '@/services/api';

// Authentication
const user = await authService.login(credentials);

// Game rooms
const rooms = await roomService.getActiveRooms();
```

## 🔍 Monitoring and Observability

### Sentry Configuration
- Error tracking with source maps
- Performance monitoring
- User session replay
- Custom tags for gaming events

### Logging
- Structured logging for debugging
- Security event logging
- Performance metrics logging

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Standards
- Follow TypeScript best practices
- Maintain test coverage above 80%
- Follow accessibility guidelines
- Document new components and utilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Documentation**: [docs.lottodrop.com](https://docs.lottodrop.com)
- **Issues**: [GitHub Issues](https://github.com/lottodrop/frontend/issues)
- **Email**: support@lottodrop.com

## 🏆 Acknowledgments

- React team for the amazing framework
- Vite team for the fast build tool
- Tailwind CSS for the utility-first CSS framework
- Sentry for error tracking and monitoring
- All contributors who have helped improve this project