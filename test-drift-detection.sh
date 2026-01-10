#!/bin/bash

echo "🧪 Testing Drift Detection Implementation"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}1. Checking services...${NC}"
if curl -s http://localhost:3001/api/v1/drift/summary > /dev/null; then
    echo -e "   ${GREEN}✅ API is running${NC}"
else
    echo -e "   ${RED}❌ API is not running${NC}"
    echo "   Start it with: pnpm dev:api"
    exit 1
fi

echo -e "\n${YELLOW}2. Testing drift endpoints...${NC}"

# Test drift summary
echo -n "   Testing /drift/summary... "
if curl -s http://localhost:3001/api/v1/drift/summary | grep -q "totalDrifts"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test drift events
echo -n "   Testing /drift... "
if curl -s http://localhost:3001/api/v1/drift | grep -q "drifts"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -e "\n${YELLOW}3. Testing drift CLI commands...${NC}"

cd apps/cli
if [ -f "bin/run" ]; then
    echo -n "   Testing drift:summary... "
    if ./bin/run drift:summary --hours 1 --output json 2>/dev/null | grep -q "totalDrifts"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    echo -n "   Testing drift:events... "
    if ./bin/run drift:events --limit 1 --output json 2>/dev/null | grep -q "drifts"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠ CLI not built. Run: pnpm build:cli${NC}"
fi

cd ../..

echo -e "\n${YELLOW}4. Checking UI...${NC}"
if [ -d "apps/ui/dist" ]; then
    echo -e "   ${GREEN}✅ UI is built${NC}"
    echo -e "   Visit: ${YELLOW}http://localhost:3000/drift${NC}"
else
    echo -e "   ${YELLOW}⚠ UI not built. Run: pnpm build:ui${NC}"
fi

echo -e "\n${YELLOW}5. Database checks...${NC}"
if docker ps | grep -q "cspm-postgres"; then
    echo -e "   ${GREEN}✅ PostgreSQL is running${NC}"
    
    # Check for drift events table
    echo -n "   Checking drift_events table... "
    if docker exec cspm-postgres psql -U cspm_user -d cspm -c "SELECT COUNT(*) FROM drift_events;" 2>/dev/null | grep -q "[0-9]"; then
        echo -e "${GREEN}✅ Exists${NC}"
    else
        echo -e "${RED}❌ Not found${NC}"
    fi
    
    # Check for baselines table
    echo -n "   Checking baselines table... "
    if docker exec cspm-postgres psql -U cspm_user -d cspm -c "SELECT COUNT(*) FROM baselines;" 2>/dev/null | grep -q "[0-9]"; then
        echo -e "${GREEN}✅ Exists${NC}"
    else
        echo -e "${RED}❌ Not found${NC}"
    fi
else
    echo -e "   ${RED}❌ PostgreSQL is not running${NC}"
fi

echo -e "\n${GREEN}🎉 Drift Detection Test Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Visit the drift dashboard: http://localhost:3000/drift"
echo "2. Run a scan to generate drift data: cd apps/cli && ./bin/run scan:run --provider aws"
echo "3. Test baseline management: ./bin/run drift:baseline --help"
echo "4. Check drift events: ./bin/run drift:events"
