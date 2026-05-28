# HouseMatch NZ 🏡

A modern, mobile-first property discovery platform for New Zealand real estate. Swipe through properties Tinder-style, get AI-powered recommendations, and access comprehensive property reports - all in one place.

## ✨ Features

### 🎯 Smart Property Discovery
- **Swipe Interface**: TikTok-style card swiping for intuitive property browsing
- **AI-Powered Search**: Natural language search (e.g., "4 bedroom house in Wellington under $800k")
- **Personalized Recommendations**: AI analyzes your preferences and suggests matching properties
- **Action Buttons**: Like, dislike, go back, or search with AI

### 📧 Email Notifications
- New property matches based on your preferences
- Price drop alerts for properties you've liked
- Property status updates
- Report delivery notifications
- Customizable notification preferences (8 notification types)

### 📊 Property Reports Marketplace
- **Title Searches**: LINZ API integration - $15 (instant)
- **Rental Data**: MBIE market analysis - $29 (instant)
- **LIM Reports**: Council-specific ($399-$589)
- **Building Inspections**: Professional inspections - $699
- **Bundle Packages**: Save up to $114 with combined reports

### 💳 Secure Payments
- Stripe integration for all transactions
- Property listing payments
- Report purchases
- Storage upgrades

### 🔐 User Authentication
- Session-based authentication with PostgreSQL storage
- 7-day persistent sessions
- Secure password hashing with scrypt
- Rate limiting on auth endpoints

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** + **shadcn/ui** for beautiful, accessible components
- **TanStack Query** for server state management
- **Framer Motion** for smooth animations
- **wouter** for lightweight routing

### Backend
- **Node.js** + **Express.js**
- **TypeScript** with ESM modules
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** (Neon) for data persistence
- **SendGrid** for email delivery

### Infrastructure
- **Stripe** for payment processing
- **OpenAI GPT-4** for AI recommendations
- **PostgreSQL session store** for production-grade sessions
- **Rate limiting** and **helmet** for security

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
├── server/                # Express backend
│   ├── services/          # Business logic (email, AI, etc.)
│   ├── auth.ts            # Authentication setup
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data access layer
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
└── db/                    # Database configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- SendGrid API key (for emails)
- Stripe API keys (for payments)
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR-USERNAME/swiperight-nz.git
cd swiperight-nz
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Required
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_secure_session_secret
SENDGRID_API_KEY=your_sendgrid_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key

# Optional
OPENAI_API_KEY=your_openai_api_key
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## 📧 Email Notification System

The platform includes a comprehensive email notification system with:

- **8 Notification Types**: New matches, price drops, property status, reports, account activity, marketing, weekly digest
- **User Preferences**: Granular control over which emails to receive
- **Queue System**: Reliable email delivery with automatic retries
- **Professional Templates**: Beautiful, mobile-responsive HTML emails
- **Audit Trail**: Track all sent emails for compliance

## 🏗️ Database Schema

- **users**: User accounts and authentication
- **properties**: Property listings with full details
- **userSwipes**: Track user interactions (like/dislike)
- **userPreferences**: AI-analyzed user preferences
- **purchaseOrders**: Property report orders
- **emailNotificationPreferences**: User email settings
- **emailQueue**: Outgoing email queue
- **sentEmails**: Email delivery audit trail

## 🔒 Security Features

- Session-based authentication with PostgreSQL storage
- CSRF protection on all state-changing endpoints
- Rate limiting on authentication endpoints
- Secure password hashing with scrypt
- HTTP-only, SameSite cookies
- Helmet.js for security headers
- Input validation with Zod schemas

## 📱 Mobile-First Design

The entire platform is designed mobile-first with:
- Touch-optimized swipe gestures
- Responsive layouts for all screen sizes
- Bottom navigation for easy thumb access
- Progressive enhancement for desktop users

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is proprietary software. All rights reserved.

## 🙋 Support

For support, email info@swiperight.nz or visit our website.

---

Built with ❤️ for the New Zealand property market
