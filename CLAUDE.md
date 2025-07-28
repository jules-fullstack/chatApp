# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack real-time chat application with a React frontend and Node.js/Express backend:

- **client/**: React + TypeScript frontend using Vite
- **server/**: Node.js + TypeScript backend with Express

## Major Features

### 1. [Authentication System](./AUTHENTICATION.md)
Complete user authentication with email verification, OTP, password hashing, and role-based access control.

### 2. [Real-Time Messaging](./REAL_TIME_MESSAGING.md)
WebSocket-based messaging system supporting direct messages, group chats, typing indicators, and read receipts.

### 3. [Group Management](./GROUP_MANAGEMENT.md)
Comprehensive group chat management with admin controls, member management, and group event tracking.

### 4. [User Blocking](./USER_BLOCKING.md)
Bidirectional user blocking system preventing communication between blocked users with real-time updates.

### 5. [Media Management](./MEDIA_MANAGEMENT.md)
File upload system with AWS S3 integration, image processing, and support for avatars and message attachments.

### 6. [Admin Panel](./ADMIN_PANEL.md)
Administrative interface for user management, account control, and platform oversight with role-based access.

### 7. [User Search](./USER_SEARCH.md)
Real-time user search and discovery system with blocking integration and conversation initiation.

### 8. [Invitation System](./INVITATION_SYSTEM.md)
Token-based invitation system for inviting new users to the platform and group conversations.

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

## Collaboration Guidelines

- **Challenge and question**: Don't immediately agree or proceed with requests that seem suboptimal, unclear, or potentially problematic
- **Push back constructively**: If a proposed approach has issues, suggest better alternatives with clear reasoning
- **Think critically**: Consider edge cases, performance implications, maintainability, and best practices before implementing
- **Seek clarification**: Ask follow-up questions when requirements are ambiguous or could be interpreted multiple ways
- **Propose improvements**: Suggest better patterns, more robust solutions, or cleaner implementations when appropriate
- **Be a thoughtful collaborator**: Act as a good teammate who helps improve the overall quality and direction of the project

---

## AI Development Team Configuration
*Updated by team-configurator on 2025-07-28*

Your project stack: React 19 + TypeScript + Node.js + Express + MongoDB + WebSocket

### Specialist Assignments

#### Frontend Development
- **React Components & UI** → @react-component-architect
  - Mantine + TailwindCSS integration, component optimization
  - Advanced React patterns, hooks, context management
  - Real-time UI updates, WebSocket integration

- **State Management** → @react-state-manager  
  - Zustand store optimization, persistence patterns
  - Chat state, user auth, conversation management
  - WebSocket connection lifecycle in stores

- **Styling & Design** → @tailwind-css-expert
  - TailwindCSS + Mantine integration
  - Responsive design, dark mode, custom themes
  - Component styling optimization

#### Backend Development
- **API Architecture** → @api-architect
  - RESTful endpoints, WebSocket integration
  - Authentication flows, session management
  - Real-time messaging architecture

- **Backend Logic** → @backend-developer
  - Node.js + Express + TypeScript patterns
  - MongoDB + Mongoose optimization
  - Service layer architecture, middleware design

#### Core Development Support
- **Code Quality** → @code-reviewer
  - TypeScript best practices, code consistency
  - Security reviews, performance analysis
  - Architecture pattern validation

- **Performance** → @performance-optimizer
  - WebSocket optimization, real-time performance
  - Database query optimization, caching strategies
  - Frontend bundle optimization, lazy loading

- **Documentation** → @documentation-specialist
  - API documentation, code comments
  - Feature documentation updates
  - Architecture decision records

### Task-Based Routing

#### Authentication & Security
```
"Implement OAuth integration" → @api-architect
"Add role-based permissions" → @backend-developer  
"Secure WebSocket connections" → @code-reviewer
```

#### Real-Time Features
```
"Optimize message delivery" → @performance-optimizer
"Add typing indicators" → @react-component-architect
"Implement presence system" → @backend-developer
```

#### UI/UX Development
```
"Create chat interface" → @react-component-architect
"Design mobile layout" → @tailwind-css-expert
"Add dark mode support" → @react-state-manager
```

#### Data & Storage
```
"Optimize message queries" → @backend-developer
"Implement media uploads" → @api-architect
"Add conversation search" → @performance-optimizer
```

#### Code Quality & Testing
```
"Review WebSocket implementation" → @code-reviewer
"Optimize bundle size" → @performance-optimizer
"Document API endpoints" → @documentation-specialist
```

### Usage Examples

- **Feature Development**: "Build a group video calling feature"
- **Performance Issues**: "The chat is lagging with many users online" 
- **UI Improvements**: "Redesign the message input component"
- **Code Review**: "Review my authentication middleware changes"
- **Documentation**: "Document the WebSocket message protocol"

### Team Strengths

- **Real-time Expertise**: Specialists understand WebSocket, state synchronization
- **Modern Stack Focus**: React 19, TypeScript, modern Node.js patterns
- **Performance Oriented**: Optimization for chat applications, real-time systems
- **Security Aware**: Authentication, session management, input validation
- **UI/UX Focused**: Mantine + TailwindCSS, responsive design

Your specialized AI development team is ready to handle any aspect of your chat application!
