# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack real-time chat application with a React frontend and Node.js/Express backend:

- **client/**: React + TypeScript frontend using Vite
- **server/**: Node.js + TypeScript backend with Express

## Development Commands

### Client (Frontend)
```bash
cd client
npm run dev        # Start development server (Vite)
npm run build      # Build for production (TypeScript + Vite)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Server (Backend)
```bash
cd server
npm run dev        # Start development server with nodemon + tsx
npm run build      # Compile TypeScript
npm run start      # Start production server
npm run lint       # Run ESLint on TypeScript files
```

## Architecture Overview

### Frontend Architecture
- **State Management**: Zustand with persist middleware for user auth state
- **Routing**: TanStack Router with route-based authentication guards
- **UI Framework**: Mantine components with TailwindCSS
- **WebSocket**: Real-time chat connection managed in chatStore
- **Forms**: React Hook Form with Zod validation

Key stores:
- `userStore`: Authentication state with localStorage persistence
- `chatStore`: Chat state, WebSocket connection, messages, conversations
- `userSearchStore`: User search functionality

### Backend Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with local strategy and express-session
- **WebSocket**: express-ws for real-time messaging
- **Email**: Nodemailer for OTP verification

Key models:
- `User`: User accounts with roles (user/superAdmin)
- `Message`: Chat messages with sender/recipient
- `Conversation`: Conversation metadata and unread counts

### Real-time Features
- WebSocket connection established after authentication
- Typing indicators between users
- Live message delivery
- Message read status tracking
- Online user status

### Authentication Flow
1. User registers → OTP sent via email
2. OTP verification → Account activated
3. Login → Session-based auth with MongoDB store
4. Role-based routing (user → /dashboard, superAdmin → /adminDashboard)

## Key Configuration

### Environment Variables (Server)
- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Express session secret
- Email service configuration for OTP verification

### API Endpoints
- Base URL: `http://localhost:3000/api`
- WebSocket: `ws://localhost:3000/api/chat`
- Frontend dev server: `http://localhost:5173`

### Database Models
All models use Mongoose with TypeScript interfaces. The application supports:
- User management with role-based access
- Real-time messaging with conversation threads
- Message read status and typing indicators

## Development Notes

### TypeScript Configuration
- Client uses separate tsconfig files for app and node
- Server uses single tsconfig.json
- Both use strict TypeScript settings

### WebSocket Implementation
- Authentication required before WebSocket connection
- Message types: new_message, user_typing, message_read
- Connection management in WebSocketManager class

### State Management Patterns
- Zustand stores follow consistent patterns
- Chat store handles WebSocket connection lifecycle
- User store persists authentication state across sessions