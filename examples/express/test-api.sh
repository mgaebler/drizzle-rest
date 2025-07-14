#!/bin/bash

# Example API requests for the Drizzle REST Adapter Demo
# Run this script after starting the server with npm run dev

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api/v1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🧪 Testing Drizzle REST Adapter Demo API"
echo "========================================"
echo

# Function to make a request and show the command
make_request() {
    echo -e "${BLUE}📡 $1${NC}"
    echo -e "${CYAN}   curl '$2'${NC}"
    echo
    curl -s "$2" | jq . 2>/dev/null || curl -s "$2"
    echo
    echo "----------------------------------------"
    echo
}

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}❌ Server is not running. Please start it with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running!${NC}"
echo

# Basic endpoints
make_request "Get API documentation" "$BASE_URL/"
make_request "Health check" "$BASE_URL/health"

# CRUD Operations
make_request "Get all users" "$API_URL/users"
make_request "Get user by ID" "$API_URL/users/1"
make_request "Get all posts" "$API_URL/posts"
make_request "Get specific post" "$API_URL/posts/1"

# Filtering
make_request "Get published posts only" "$API_URL/posts?published=1"
make_request "Search posts by title" "$API_URL/posts?title_like=Drizzle"
make_request "Get posts by author" "$API_URL/posts?authorId=1"

# Sorting and Pagination
make_request "Get latest posts (sorted by date)" "$API_URL/posts?_sort=-createdAt"
make_request "Get first 3 posts" "$API_URL/posts?_page=1&_per_page=3"
make_request "Get latest 2 published posts" "$API_URL/posts?published=1&_sort=-createdAt&_per_page=2"

# Relationships
make_request "Get post with author" "$API_URL/posts/1?_embed=author"
make_request "Get user with their posts" "$API_URL/users/1?_embed=posts"
make_request "Get post with author and comments" "$API_URL/posts/1?_embed=author,comments"

# Categories and Tags
make_request "Get all categories" "$API_URL/categories"
make_request "Get all tags" "$API_URL/tags"
make_request "Get comments for a post" "$API_URL/comments?postId=1"

# Complex queries
make_request "Published posts with full relations" "$API_URL/posts?published=1&_embed=author,comments&_per_page=2"

echo -e "${GREEN}🎉 Demo complete!${NC}"
echo
echo "Try creating new content:"
echo -e "${CYAN}# Create a new user${NC}"
echo "curl -X POST $API_URL/users \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"name\": \"John Doe\", \"email\": \"john@example.com\", \"bio\": \"New user\"}'"
echo
echo -e "${CYAN}# Create a new post${NC}"
echo "curl -X POST $API_URL/posts \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"title\": \"My Post\", \"content\": \"Content here\", \"slug\": \"my-post\", \"authorId\": 1, \"published\": 1}'"
echo
echo -e "${CYAN}# Update a post${NC}"
echo "curl -X PATCH $API_URL/posts/1 \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"title\": \"Updated Title\"}'"
