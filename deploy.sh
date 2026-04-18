#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  Washa Control - Automated Deployment Script
#  نظام إدارة وشّى - سكريبت النشر التلقائي
#═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
GEAR="⚙️"
DB="🗃️"
FUNC="⚡"
BUILD="🔨"
DEPLOY="📦"

#───────────────────────────────────────────────────────────────────────────────
# Helper Functions
#───────────────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}${GEAR} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Configuration
#───────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

#───────────────────────────────────────────────────────────────────────────────
# Pre-flight Checks
#───────────────────────────────────────────────────────────────────────────────

preflight_check() {
    print_header "${ROCKET} Washa Control Deployment - Pre-flight Check"
    
    local all_good=true
    
    print_step "Checking required tools..."
    
    check_command "node" || all_good=false
    check_command "npm" || all_good=false
    check_command "supabase" || { print_warning "Supabase CLI not found - install with: npm install -g supabase"; all_good=false; }
    
    echo ""
    print_step "Checking Node.js version..."
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js version: $(node -v)"
    else
        print_error "Node.js 18+ required. Current: $(node -v)"
        all_good=false
    fi
    
    echo ""
    print_step "Checking environment variables..."
    
    if [ -n "$VITE_SUPABASE_URL" ]; then
        print_success "VITE_SUPABASE_URL is set"
    else
        print_warning "VITE_SUPABASE_URL not set"
    fi
    
    if [ -n "$VITE_SUPABASE_KEY" ]; then
        print_success "VITE_SUPABASE_KEY is set"
    else
        print_warning "VITE_SUPABASE_KEY not set"
    fi
    
    if [ -n "$VITE_GEMINI_API_KEY" ]; then
        print_success "VITE_GEMINI_API_KEY is set"
    else
        print_warning "VITE_GEMINI_API_KEY not set (AI features will be disabled)"
    fi
    
    echo ""
    if [ "$all_good" = true ]; then
        print_success "All pre-flight checks passed!"
        return 0
    else
        print_error "Some checks failed. Please fix the issues above."
        return 1
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Install Dependencies
#───────────────────────────────────────────────────────────────────────────────

install_deps() {
    print_header "${DEPLOY} Installing Dependencies"
    
    print_step "Running npm install..."
    npm install
    
    print_success "Dependencies installed!"
}

#───────────────────────────────────────────────────────────────────────────────
# Database Migration
#───────────────────────────────────────────────────────────────────────────────

run_migrations() {
    print_header "${DB} Database Migrations"
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not installed. Skipping migrations."
        print_warning "Install with: npm install -g supabase"
        return 0
    fi
    
    print_step "Checking Supabase project link..."
    
    if [ ! -f "supabase/.temp/project-ref" ] && [ -z "$SUPABASE_PROJECT_REF" ]; then
        print_warning "Supabase project not linked."
        echo ""
        echo "To link your project, run:"
        echo -e "${CYAN}  supabase link --project-ref YOUR_PROJECT_REF${NC}"
        echo ""
        read -p "Do you want to continue without migrations? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        return 0
    fi
    
    print_step "Running database migrations..."
    supabase db push
    
    print_success "Migrations completed!"
}

#───────────────────────────────────────────────────────────────────────────────
# Deploy Edge Functions
#───────────────────────────────────────────────────────────────────────────────

deploy_functions() {
    print_header "${FUNC} Deploying Edge Functions"
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not installed. Skipping function deployment."
        return 0
    fi
    
    local FUNCTIONS=(
        "admin_create_user"
        "admin_reset_password"
        "admin_disable_user"
        "admin_list_users"
        "verify_pin"
        "list_tasks"
        "create_task"
        "update_task"
        "delete_task"
        "send_message"
        "list_chat_messages"
    )
    
    local deployed=0
    local failed=0
    
    for func in "${FUNCTIONS[@]}"; do
        if [ -d "supabase/functions/$func" ]; then
            print_step "Deploying $func..."
            if supabase functions deploy "$func" --no-verify-jwt 2>/dev/null; then
                print_success "$func deployed"
                ((deployed++))
            else
                print_warning "$func deployment failed (may not be linked)"
                ((failed++))
            fi
        fi
    done
    
    echo ""
    print_success "Functions deployed: $deployed"
    if [ $failed -gt 0 ]; then
        print_warning "Functions failed: $failed"
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Build Application
#───────────────────────────────────────────────────────────────────────────────

build_app() {
    print_header "${BUILD} Building Application"
    
    print_step "Running production build..."
    npm run build
    
    if [ -d "dist" ]; then
        print_success "Build completed!"
        echo ""
        print_step "Build output:"
        du -sh dist/
        echo ""
        ls -la dist/
    else
        print_error "Build failed - dist folder not found"
        exit 1
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Deploy to Vercel
#───────────────────────────────────────────────────────────────────────────────

deploy_vercel() {
    print_header "${ROCKET} Deploying to Vercel"
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not installed."
        echo ""
        echo "Install with:"
        echo -e "${CYAN}  npm install -g vercel${NC}"
        echo ""
        echo "Then run:"
        echo -e "${CYAN}  vercel --prod${NC}"
        return 0
    fi
    
    print_step "Deploying to Vercel..."
    vercel --prod
    
    print_success "Deployed to Vercel!"
}

#───────────────────────────────────────────────────────────────────────────────
# Deploy to Netlify
#───────────────────────────────────────────────────────────────────────────────

deploy_netlify() {
    print_header "${ROCKET} Deploying to Netlify"
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not installed."
        echo ""
        echo "Install with:"
        echo -e "${CYAN}  npm install -g netlify-cli${NC}"
        echo ""
        echo "Then run:"
        echo -e "${CYAN}  netlify deploy --prod --dir=dist${NC}"
        return 0
    fi
    
    print_step "Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    
    print_success "Deployed to Netlify!"
}

#───────────────────────────────────────────────────────────────────────────────
# Set Supabase Secrets
#───────────────────────────────────────────────────────────────────────────────

set_secrets() {
    print_header "${GEAR} Setting Supabase Secrets"
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not installed."
        return 0
    fi
    
    echo "Enter your admin email(s) (comma-separated):"
    read -p "> " ADMIN_EMAILS
    
    if [ -n "$ADMIN_EMAILS" ]; then
        supabase secrets set ADMIN_EMAILS="$ADMIN_EMAILS"
        print_success "ADMIN_EMAILS set"
    fi
    
    echo ""
    echo "Do you want to set SUPABASE_SERVICE_ROLE_KEY? (y/n)"
    read -p "> " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enter your Service Role Key:"
        read -s -p "> " SERVICE_KEY
        echo ""
        supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
        print_success "SUPABASE_SERVICE_ROLE_KEY set"
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Full Deployment
#───────────────────────────────────────────────────────────────────────────────

full_deploy() {
    print_header "${ROCKET} Washa Control - Full Deployment"
    
    preflight_check || exit 1
    install_deps
    run_migrations
    deploy_functions
    build_app
    
    echo ""
    print_header "${CHECK} Deployment Ready!"
    
    echo "Your application is built and ready to deploy."
    echo ""
    echo "Choose a deployment target:"
    echo -e "  ${CYAN}1${NC}) Vercel"
    echo -e "  ${CYAN}2${NC}) Netlify"
    echo -e "  ${CYAN}3${NC}) Skip (manual deploy)"
    echo ""
    read -p "Select (1/2/3): " -n 1 -r
    echo ""
    
    case $REPLY in
        1) deploy_vercel ;;
        2) deploy_netlify ;;
        *) print_success "Build ready in ./dist folder" ;;
    esac
    
    echo ""
    print_header "${CHECK} Deployment Complete!"
    echo ""
    echo "Next steps:"
    echo -e "  ${CYAN}1.${NC} Set environment variables on your hosting platform"
    echo -e "  ${CYAN}2.${NC} Create your first admin user in Supabase Dashboard"
    echo -e "  ${CYAN}3.${NC} Test the login flow"
    echo ""
    print_success "Happy deploying! 🎉"
}

#───────────────────────────────────────────────────────────────────────────────
# Main Menu
#───────────────────────────────────────────────────────────────────────────────

show_menu() {
    print_header "${ROCKET} Washa Control Deployment Script"
    
    echo "Select an action:"
    echo ""
    echo -e "  ${CYAN}1${NC}) ${ROCKET} Full Deploy (recommended)"
    echo -e "  ${CYAN}2${NC}) ${GEAR} Pre-flight Check Only"
    echo -e "  ${CYAN}3${NC}) ${DEPLOY} Install Dependencies"
    echo -e "  ${CYAN}4${NC}) ${DB} Run Migrations"
    echo -e "  ${CYAN}5${NC}) ${FUNC} Deploy Edge Functions"
    echo -e "  ${CYAN}6${NC}) ${BUILD} Build Only"
    echo -e "  ${CYAN}7${NC}) ${GEAR} Set Supabase Secrets"
    echo -e "  ${CYAN}8${NC}) Deploy to Vercel"
    echo -e "  ${CYAN}9${NC}) Deploy to Netlify"
    echo -e "  ${CYAN}0${NC}) Exit"
    echo ""
    read -p "Select (0-9): " -n 1 -r
    echo ""
    
    case $REPLY in
        1) full_deploy ;;
        2) preflight_check ;;
        3) install_deps ;;
        4) run_migrations ;;
        5) deploy_functions ;;
        6) build_app ;;
        7) set_secrets ;;
        8) deploy_vercel ;;
        9) deploy_netlify ;;
        0) echo "Goodbye! 👋"; exit 0 ;;
        *) print_error "Invalid option"; show_menu ;;
    esac
}

#───────────────────────────────────────────────────────────────────────────────
# Entry Point
#───────────────────────────────────────────────────────────────────────────────

# Parse command line arguments
case "${1:-}" in
    --full)     full_deploy ;;
    --check)    preflight_check ;;
    --install)  install_deps ;;
    --migrate)  run_migrations ;;
    --functions) deploy_functions ;;
    --build)    build_app ;;
    --secrets)  set_secrets ;;
    --vercel)   build_app && deploy_vercel ;;
    --netlify)  build_app && deploy_netlify ;;
    --help|-h)
        echo "HimControl Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [option]"
        echo ""
        echo "Options:"
        echo "  --full       Full deployment (recommended)"
        echo "  --check      Pre-flight check only"
        echo "  --install    Install dependencies"
        echo "  --migrate    Run database migrations"
        echo "  --functions  Deploy Edge Functions"
        echo "  --build      Build application"
        echo "  --secrets    Set Supabase secrets"
        echo "  --vercel     Build and deploy to Vercel"
        echo "  --netlify    Build and deploy to Netlify"
        echo "  --help       Show this help"
        echo ""
        echo "Run without arguments for interactive menu."
        ;;
    *)
        show_menu
        ;;
esac
