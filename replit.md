# Appointment Scheduling Platform

## Overview

This is a comprehensive appointment scheduling and management platform designed for service providers. The application provides complete business operations management including appointment creation, client tracking, financial management, Google Calendar integration, and analytics. Built with modern TypeScript architecture, it features a React frontend with Express.js backend, PostgreSQL database, and multiple external service integrations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with Hot Module Replacement (HMR)
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/ui + Radix UI component library
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack Query v5 for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js with middleware-based architecture
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless hosting
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **API Design**: RESTful endpoints with comprehensive error handling

### Database Schema
- **Primary Tables**: appointments, users, providers, sessions
- **ORM**: Drizzle with type-safe queries and migrations
- **Connection**: Neon serverless PostgreSQL with WebSocket support
- **Validation**: Zod schemas for type-safe data validation
- **New Fields**: 
  - `reschedule_occurrences`: Tracks the number of times an appointment has been rescheduled

## Key Components

### Authentication System
- Session-based authentication with PostgreSQL session storage
- Password hashing using bcrypt with configurable salt rounds
- Protected routes middleware for secure access control
- User registration, login, and logout handlers

### Appointment Management
- Complete appointment lifecycle management (Schedule → Reschedule → Complete/Cancel)
- Client information tracking with contact details and preferences
- Financial tracking including deposits, revenue, expenses, and collections
- Status-based appointment processing with automated notifications

### External Service Integrations
- **Google Calendar API**: Dual-calendar system (active/archive) with OAuth2 authentication
- **Email Notifications**: Nodemailer/SendGrid integration for appointment notifications
- **File Upload**: Multer-based file handling for data imports

### Service Layer Architecture
- `calendarService.ts`: Google Calendar integration with event lifecycle management
- `emailService.ts`: Email notification system with template support
- `notificationService.ts`: Orchestrates multiple notification channels
- `importService.ts`: Data import/validation with transformation logic
- `revenueService.ts`: Financial calculations and revenue tracking

## Data Flow

### Appointment Lifecycle
1. **Creation**: New appointment → Database insertion → Calendar event creation → Email notification
2. **Updates**: Status changes → Revenue calculations → Calendar event updates → Status notifications
3. **Completion**: Final status → Archive calendar move → Financial reconciliation

### Authentication Flow
1. User registration/login → Password validation → Session creation → Protected route access
2. Session persistence → PostgreSQL session store → Automatic session management

### Notification Pipeline
1. Appointment event trigger → Service orchestration → Parallel execution:
   - Email notification dispatch
   - Google Calendar API calls
   - Database updates with event tracking

## External Dependencies

### Core Dependencies
- **Google APIs**: OAuth2 client for Calendar API integration
- **Email Services**: Nodemailer for SMTP or SendGrid for cloud email
- **Database**: Neon PostgreSQL serverless with WebSocket connections
- **Authentication**: bcrypt for password security, express-session for session management

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **Type Safety**: TypeScript with strict configuration
- **Validation**: Zod for runtime type validation and schema definition
- **Testing**: Built-in service testing endpoints for integration validation

### Environment Variables Required
- `DATABASE_URL`: Neon PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`: Google Calendar API credentials
- `GOOGLE_CALENDAR_ID`, `GOOGLE_ARCHIVE_CALENDAR_ID`: Calendar identifiers
- Email service credentials (Gmail or SendGrid)

## Deployment Strategy

### Production Build Process
1. **Frontend**: Vite builds React app to `dist/public` with optimized assets
2. **Backend**: esbuild compiles TypeScript server to `dist/index.js`
3. **Database**: Drizzle migrations ensure schema consistency
4. **Static Assets**: Express serves built frontend from `dist/public`

### Hosting Configuration
- **Platform**: Replit with autoscale deployment target
- **Runtime**: Node.js 20 with PostgreSQL 16 module
- **Port Configuration**: Internal 5000 → External 80 mapping
- **Build Commands**: `npm run build` → `npm run start`

### Environment Setup
- Development: `npm run dev` with tsx hot reloading
- Production: Compiled JavaScript execution with optimized assets
- Database: Automatic schema push with `npm run db:push`

## Changelog

Changelog:
- June 25, 2025: Initial setup
- January 11, 2025: Updated email service to use production URL for deposit confirmation links
- January 11, 2025: Added status-based emojis to calendar appointment titles (✅ for Complete, ❌ for Cancel, 🔄 for Reschedule, 📅 for Scheduled)
- January 11, 2025: Fixed calendar emoji update bug - now properly updates title emoji when moving events to archive calendar for Complete/Cancel status
- January 11, 2025: Enhanced Google Calendar integration to support multiple reschedules:
  - Updated date/time selection logic to properly use reschedule dates
  - Improved calendar event search to check both active and archive calendars
  - Fixed issue where multiple reschedules would fail to update the calendar event
  - Ensured rescheduled appointments always stay in the active calendar
  - Updated event descriptions to show "CURRENT SCHEDULE" for better clarity
- January 11, 2025: Fixed critical bug preventing multiple reschedules from updating Google Calendar:
  - Modified notification service to detect date/time changes for appointments already in "Reschedule" status
  - Updated routes to trigger notifications for reschedule date changes, not just status changes
  - Appointments can now be rescheduled infinitely until marked Complete or Canceled
  - Created documentation file: reschedule-morethanonce.md
- January 11, 2025: Added reschedule occurrences tracking:
  - Added `reschedule_occurrences` column to appointments table
  - Automatically increments counter each time an appointment is rescheduled
  - Tracks total number of reschedules for business metrics and analytics

## User Preferences

Preferred communication style: Simple, everyday language.