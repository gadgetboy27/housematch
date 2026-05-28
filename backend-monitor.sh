#!/bin/bash

# Backend Monitoring Script
# Quick access to backend logs, database, and server status

echo "🔧 HouseMatch Backend Monitor"
echo "=============================="
echo ""
echo "Choose an option:"
echo ""
echo "  1) View live server logs"
echo "  2) View recent API requests"
echo "  3) Access PostgreSQL database (psql)"
echo "  4) Check database connection"
echo "  5) View environment variables"
echo "  6) Monitor server in real-time"
echo "  7) Exit"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
  1)
    echo ""
    echo "📊 Live Server Logs (Ctrl+C to exit)"
    echo "====================================="
    tail -f /tmp/logs/Start_application_*.log 2>/dev/null || echo "No logs found. Start the application first."
    ;;
  2)
    echo ""
    echo "📝 Recent API Requests (Last 50 lines)"
    echo "======================================="
    tail -n 50 /tmp/logs/Start_application_*.log 2>/dev/null | grep -E "GET|POST|PUT|DELETE|PATCH" || echo "No API logs found"
    ;;
  3)
    echo ""
    echo "🗄️  PostgreSQL Database Access"
    echo "=============================="
    echo "Connecting to database..."
    psql $DATABASE_URL
    ;;
  4)
    echo ""
    echo "🔌 Database Connection Status"
    echo "=============================="
    psql $DATABASE_URL -c "\conninfo" -c "\l" 2>/dev/null && echo "✅ Database connected successfully" || echo "❌ Database connection failed"
    ;;
  5)
    echo ""
    echo "🔐 Environment Variables"
    echo "========================"
    echo "DATABASE_URL: ${DATABASE_URL:0:30}... (hidden)"
    echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:15}... (hidden)"
    echo "SENTRY_DSN: ${SENTRY_DSN:0:30}... (hidden)"
    echo "NODE_ENV: $NODE_ENV"
    echo "PORT: ${PORT:-5000}"
    ;;
  6)
    echo ""
    echo "📡 Real-time Server Monitor (Press Ctrl+C to exit)"
    echo "=================================================="
    echo ""
    watch -n 2 'echo "=== Server Status ===" && curl -s http://localhost:5000/api/auth/user 2>&1 | head -c 100 && echo "" && echo "" && echo "=== Recent Logs ===" && tail -n 10 /tmp/logs/Start_application_*.log 2>/dev/null'
    ;;
  7)
    echo "Goodbye!"
    exit 0
    ;;
  *)
    echo "Invalid choice. Please run the script again."
    exit 1
    ;;
esac
