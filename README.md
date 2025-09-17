# LottoDrop - Lottery-Style Gaming Platform

## Overview

LottoDrop is a high-paced, lottery-style gaming platform where players place bets from their internal balance into a common prize pool. Winners are selected using a provably fair algorithm, and the prize pool is distributed after deducting the platform's commission.

## Features

### Core Features
- **User Registration & Authentication**: Classic email/password authentication with JWT tokens
- **Balance System**: Internal balance management with multi-currency support
- **Game Rooms**: Two types of rooms - Fast Drop (instant start) and Time Drop (scheduled)
- **Provably Fair Gaming**: Cryptographically secure random number generation for winner selection
- **Real-time Updates**: Socket.IO for live game updates and chat
- **Profile Management**: User profiles with game history and transaction tracking
- **Admin Panel**: Comprehensive admin interface for platform management

### Game Types
1. **Fast Drop**: Starts immediately when maximum players join
2. **Time Drop**: Starts at a scheduled time with minimum players

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST API
- **Socket.IO** for real-time communication
- **PostgreSQL** database
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **React** with TypeScript
- **React Router** for navigation
- **Socket.IO Client** for real-time updates
- **Axios** for API requests
- **Framer Motion** for animations
- **React Hot Toast** for notifications

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lotto_drop
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=admin@lottodrop.com
ADMIN_PASSWORD=Admin123!

# Platform
PLATFORM_COMMISSION=0.05
```

4. Run database migrations (schema already created):
```bash
psql -U postgres -d lotto_drop -f src/database/schema.sql
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend-player
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password

### Balance & Transactions
- `GET /api/balance` - Get user balance
- `GET /api/transactions` - Get transaction history
- `GET /api/games` - Get game history
- `POST /api/adjust` - Admin: Adjust user balance

### Game Rooms
- `GET /api/rooms` - Get available rooms
- `GET /api/rooms/share/:shareCode` - Get room by share code
- `POST /api/rooms` - Admin: Create new room
- `POST /api/rooms/:roomId/join` - Join a room

## Socket Events

### Client to Server
- `join-room` - Join a game room
- `leave-room` - Leave a game room
- `send-message` - Send chat message
- `start-countdown` - Start game countdown

### Server to Client
- `room-state` - Room state update
- `new-message` - New chat message
- `user-joined` - User joined room
- `user-left` - User left room
- `countdown` - Countdown update
- `game-completed` - Game result
- `game-starting` - Game is starting

## Database Schema

### Main Tables
- `users` - User accounts and balances
- `rooms` - Game rooms configuration
- `game_rounds` - Game round history
- `round_participants` - Players in each round
- `transactions` - Financial transactions
- `chat_messages` - Room chat messages
- `admin_users` - Admin access control

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Provably Fair**: CSPRNG for winner selection

## Game Flow

1. **Room Selection**: Players browse available rooms
2. **Authentication Check**: Login required to join
3. **Balance Validation**: Sufficient funds verified
4. **Bet Placement**: Funds deducted, added to prize pool
5. **Game Start**: Based on room type (Fast/Time Drop)
6. **Winner Selection**: Provably fair algorithm
7. **Prize Distribution**: Winner receives pool minus commission
8. **Transaction Recording**: All operations logged

## Development

### Running Tests
```bash
npm test
```

### Build for Production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend-player && npm run build
```

### Environment Variables
Create `.env` files in both backend and frontend directories with appropriate configurations.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@lottodrop.com or open an issue in the GitHub repository.

## Roadmap

- [ ] Mobile responsive design
- [ ] Multiple payment gateways
- [ ] Cryptocurrency support
- [ ] Tournament mode
- [ ] Leaderboards
- [ ] Achievement system
- [ ] Social features
- [ ] Multi-language support

## Acknowledgments

- DiceBear for avatar generation
- Socket.IO for real-time functionality
- PostgreSQL for robust data management