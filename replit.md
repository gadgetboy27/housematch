# Overview

This is a property discovery and evaluation platform designed as a modern, mobile-first web application. The system enables users to swipe through property listings (similar to dating apps), manage their preferences, and purchase property reports through an intuitive interface. Built with React/TypeScript frontend and Express.js backend, it focuses on delivering a seamless property browsing experience with AI-powered recommendations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite for fast development and build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI components
- **Routing**: wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and API data fetching
- **Animation**: Framer Motion for smooth swipe animations and transitions
- **Design Pattern**: Mobile-first responsive design with component-based architecture

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Data Layer**: Drizzle ORM for type-safe database operations
- **Storage**: In-memory storage implementation with interface for future database integration
- **API Design**: RESTful APIs with consistent error handling and logging middleware
- **Development**: Hot module replacement with Vite integration for seamless full-stack development

## Database Schema Design
- **Properties**: Comprehensive property data including location, pricing, specifications, and metrics
- **Users**: User management with authentication capabilities
- **User Swipes**: Tracking user interactions (like, dislike, super_like) for preference learning
- **User Preferences**: AI-analyzed user preferences and recommendations
- **Purchase Orders**: Property report ordering system with status tracking
- **Data Types**: PostgreSQL-ready schema with proper relationships and constraints

## User Interface Patterns
- **Swipe Interface**: TikTok-style card swiping for property discovery
- **Bottom Navigation**: Mobile app-style navigation with distinct sections
- **Modal System**: Layered modals for property details, AI insights, and purchase flows
- **Progressive Enhancement**: Touch-first interactions with desktop fallbacks

## AI Integration Architecture
- **Service Layer**: OpenAI GPT-5 integration for preference analysis and recommendations
- **Features**: User behavior analysis, property matching, and market insights generation
- **Data Flow**: Swipe data → preference analysis → personalized recommendations
- **Smart Triggers**: AI brain popup after user engagement threshold

# External Dependencies

## Core Technologies
- **Database**: Neon Database (PostgreSQL) with connection pooling
- **ORM**: Drizzle ORM with PostgreSQL dialect and schema migrations
- **Authentication**: Session-based with connect-pg-simple for PostgreSQL session storage
- **Validation**: Zod for runtime type validation and schema parsing

## UI and Styling
- **Component Library**: shadcn/ui built on Radix UI primitives
- **Icons**: Font Awesome for comprehensive icon coverage
- **Typography**: Google Fonts (DM Sans, Fira Code, Geist Mono) for modern typography
- **Animation**: Framer Motion for performant animations and gesture handling

## Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Development**: tsx for TypeScript execution and esbuild for production builds
- **Replit Integration**: Replit-specific plugins for development environment optimization
- **Code Quality**: TypeScript strict mode with comprehensive type checking

## Third-Party Services
- **AI Services**: OpenAI API for intelligent property recommendations and user insights
- **Image Hosting**: Unsplash for high-quality property placeholder images
- **Fonts**: Google Fonts CDN for web font delivery
- **Development**: Replit development banner and error handling for development environment