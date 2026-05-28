#!/bin/bash

# Quick Database Query Script
# Run common queries without opening psql

echo "🗄️  Quick Database Queries"
echo "=========================="
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./db-query.sh [query-type]"
  echo ""
  echo "Available queries:"
  echo "  tables       - List all tables"
  echo "  users        - Show all users"
  echo "  properties   - Show all properties"
  echo "  partners     - Show all service partners"
  echo "  stats        - Database statistics"
  echo "  custom       - Run custom SQL query"
  echo ""
  echo "Example: ./db-query.sh tables"
  exit 1
fi

case $1 in
  tables)
    echo "📋 Database Tables:"
    echo "==================="
    psql $DATABASE_URL -c "\dt" -P pager=off
    ;;
  users)
    echo "👥 Users (Top 10):"
    echo "=================="
    psql $DATABASE_URL -c "SELECT id, email, name, subscription_tier, is_admin FROM users ORDER BY created_at DESC LIMIT 10;" -P pager=off
    ;;
  properties)
    echo "🏠 Properties (Top 10):"
    echo "======================="
    psql $DATABASE_URL -c "SELECT id, title, price, property_type, suburb, is_active FROM properties ORDER BY created_at DESC LIMIT 10;" -P pager=off
    ;;
  partners)
    echo "🤝 Service Partners:"
    echo "===================="
    psql $DATABASE_URL -c "SELECT id, company_name, account_type, status FROM service_partners ORDER BY created_at DESC LIMIT 10;" -P pager=off
    ;;
  stats)
    echo "📊 Database Statistics:"
    echo "======================="
    echo ""
    echo "Users:"
    psql $DATABASE_URL -c "SELECT COUNT(*) as total_users, SUM(CASE WHEN is_admin THEN 1 ELSE 0 END) as admins FROM users;" -P pager=off
    echo ""
    echo "Properties:"
    psql $DATABASE_URL -c "SELECT COUNT(*) as total_properties, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM properties;" -P pager=off
    echo ""
    echo "Service Partners:"
    psql $DATABASE_URL -c "SELECT COUNT(*) as total_partners, account_type, COUNT(*) FROM service_partners GROUP BY account_type;" -P pager=off
    ;;
  custom)
    echo "🔧 Custom SQL Query:"
    echo "===================="
    read -p "Enter SQL query: " query
    psql $DATABASE_URL -c "$query" -P pager=off
    ;;
  *)
    echo "❌ Unknown query type: $1"
    echo "Run without arguments to see available options"
    exit 1
    ;;
esac
