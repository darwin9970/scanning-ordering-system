# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **restaurant table QR code ordering system** (桌台扫码点单系统) - a full-stack monorepo supporting multi-user collaborative ordering and automated kitchen order distribution. The system consists of three main applications:

- **admin**: Web-based management dashboard (Next.js 16)
- **api**: Backend API service (Elysia.js + Drizzle ORM)
- **mini**: WeChat mini-program (uni-app + Vue 3)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Admin Frontend** | Next.js 16, React 19, TailwindCSS 4, React Query, Zustand, Radix UI |
| **Mini-program** | uni-app, Vue 3, Pinia, Vite |
| **Backend** | Elysia.js, TypeScript, Bun runtime |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **Cache/Queue** | Redis 7 (caching + Redis Stream for print jobs) |
| **Real-time** | WebSocket |
| **Authentication** | JWT |
| **Deployment** | Docker Compose |

## Development Commands

### API Service (`api/`)

```bash
bun run dev                    # Start dev server with hot reload
bun run start                  # Production mode
bun run worker:dev             # Start print worker with hot reload
bun run worker                 # Start print worker (production)

# Database
bun run db:push                # Push schema changes to database
bun run db:generate            # Generate migrations
bun run db:migrate             # Run migrations
bun run db:studio              # Open Drizzle Studio
bun run db:seed                # Seed test data
bun run init:page-configs      # Initialize page decoration configs

# Code Quality
bun run lint                   # Run ESLint
bun run lint:fix               # Auto-fix ESLint issues
bun run format                 # Format with Prettier
bun run typecheck              # TypeScript type checking
bun test                       # Run tests
```

### Admin Dashboard (`admin/`)

```bash
npm run dev                    # Start dev server with Turbopack
npm run build                  # Production build
npm run start                  # Start production server

# Code Quality
npm run lint                   # Run ESLint
npm run lint:fix               # Auto-fix ESLint issues
npm run format                 # Format with Prettier
npm run typecheck              # TypeScript type checking
```

### Mini-program (`mini/`)

```bash
# WeChat Mini-program
npm run dev:mp-weixin          # Dev mode for WeChat
npm run build:mp-weixin        # Build for WeChat

# H5 (for testing)
npm run dev:h5                 # Dev mode for H5
npm run build:h5               # Build for H5

# Code Quality
npm run lint                   # Run ESLint with auto-fix
npm run lint:check             # Check without fixing
```

### Docker Deployment

```bash
# First-time setup
cp .env.example .env
docker-compose up -d
docker-compose exec -T api bunx drizzle-kit push --force
docker-compose exec -T api bun run db:seed
docker-compose exec -T api bun run init:page-configs

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache api worker admin
docker-compose up -d

# Useful commands
docker-compose ps              # Check service status
docker-compose logs -f api     # View API logs
docker-compose restart api     # Restart API service
docker-compose exec api sh     # Enter API container
```

## Architecture & Key Concepts

### Monorepo Structure

This is a **multi-store restaurant ordering system** with store-level data isolation. Most entities are scoped to a specific store via `storeId`.

### Database Schema Highlights

**Core Entities:**
- `stores`: Multi-store support with business hours, order settings, WiFi info
- `tables`: Each table has a unique QR code for ordering
- `admins`: Staff accounts with role-based permissions (SUPER_ADMIN, OWNER, STAFF)
- `users`: WeChat users (identified by openid)
- `members` & `storeMembers`: Global and per-store membership with points

**Product System:**
- `products`: SPU (Standard Product Unit) with type: SINGLE or VARIANT
- `productVariants`: SKU with specs (e.g., {"size": "Large", "temperature": "Hot"})
- `productAttributes`: Additional options (e.g., sugar level, ice level)
- `categories`: Product categories with drag-and-drop sorting
- `combos` & `comboItems`: Combo/set meals with multiple products

**Order System:**
- `orders`: Main order table with support for add-on orders (`isAddition`, `parentOrderId`)
- `orderItems`: Order line items with product snapshots
- Order statuses: PENDING → PAID → PREPARING → COMPLETED (or CANCELLED/REFUNDED)
- Supports partial refunds via `refundedQuantity` and `refundedAmount`

**Marketing System:**
- `coupons`: Coupon templates (FIXED/PERCENT/NO_THRESHOLD)
- `userCoupons`: User-claimed coupons with expiration
- `promotions`: Marketing campaigns (FULL_REDUCE, DISCOUNT, TIME_LIMITED, etc.)
- `pointLogs`: Points transaction history (per-store isolation)

**Print System:**
- `printers`: Kitchen/cashier/bar printers with cloud printing support
- `categoryPrinters`: Category-to-printer mapping for auto-routing
- `printJobs`: Print queue managed by Redis Stream worker
- Print worker runs separately and processes jobs asynchronously

**Page Decoration System:**
- `pageConfigs`: Drag-and-drop page builder for mini-program
- Supports 10 page types: HOME, MENU, PRODUCT_DETAIL, ORDER_CENTER, PROFILE, MEMBER, BARRAGE, TABBAR, TOPIC, RECHARGE
- Components stored as JSON with free-canvas layout (x, y, width, height, zIndex)

**RBAC System:**
- `rolePermissions`: Dynamic permission configuration per role
- Permissions are stored as string arrays (e.g., `["orders:view", "orders:update"]`)
- Middleware checks permissions on protected routes

### API Architecture

**Framework:** Elysia.js (Bun-native, high-performance)

**Route Organization:**
- Routes are in `api/src/routes/` organized by feature
- Each route file exports an Elysia plugin
- Main app in `api/src/index.ts` composes all routes

**Authentication:**
- JWT-based with `@elysiajs/jwt`
- Protected routes use `authMiddleware` to verify tokens
- Token payload includes: `{ id, username, role, storeId }`

**Database Access:**
- Drizzle ORM with PostgreSQL driver
- Schema defined in `api/src/db/schema.ts`
- Use `db` instance from `api/src/db/index.ts`
- Prefer Drizzle query builder over raw SQL

**Redis Usage:**
- Caching: Store frequently accessed data (e.g., store settings)
- Redis Stream: Print job queue (`print-jobs` stream)
- WebSocket: Pub/sub for real-time order notifications

**WebSocket:**
- Endpoint: `ws://localhost:4000/ws/store/:storeId`
- Used for real-time order updates to admin dashboard
- Broadcasts order events: `order:created`, `order:updated`, `order:status_changed`

**File Uploads:**
- Handled in `api/src/routes/upload.ts`
- Files stored in `api/uploads/` directory
- Returns public URL for uploaded files

### Admin Dashboard Architecture

**Framework:** Next.js 16 with App Router

**State Management:**
- **React Query**: Server state (API data fetching, caching, mutations)
- **Zustand**: Client state (UI state, user session)
- Store definitions in `admin/store/`

**UI Components:**
- **Radix UI**: Headless components (Dialog, Dropdown, Select, etc.)
- **TailwindCSS 4**: Utility-first styling
- **Lucide React**: Icon library
- **Recharts**: Data visualization
- Reusable components in `admin/components/`

**Key Features:**
- Dashboard with analytics charts (`admin/app/dashboard/page.tsx`)
- Order management with real-time updates via WebSocket
- Product/SKU management with multi-spec support
- Drag-and-drop category sorting (`@dnd-kit/sortable`)
- QR code generation for tables (`qrcode.react`)
- Role-based access control with dynamic permissions
- Page decoration system with free-canvas editor

**API Client:**
- Centralized in `admin/lib/api.ts`
- Uses `fetch` with automatic token injection
- Base URL configured via environment variable

**Form Handling:**
- React Hook Form with Zod validation
- Form components in `admin/components/ui/`

### Mini-program Architecture

**Framework:** uni-app (cross-platform, primarily WeChat)

**State Management:**
- Pinia stores in `mini/store/`
- `useUserStore`: User info, login state
- `useCartStore`: Shopping cart with local persistence

**Key Pages:**
- `pages/index`: Home page with store info
- `pages/menu`: Product browsing with category tabs
- `pages/cart`: Shopping cart with swipe-to-delete
- `pages/order`: Order list and details
- `pages/mine`: User profile with member info

**API Client:**
- Centralized in `mini/api/`
- Uses `uni.request` wrapper
- Automatic token handling

**WeChat Integration:**
- Login via `wx.login()` to get code, exchange for JWT
- Member system with points display
- QR code scanning for table ordering

## Important Development Notes

### Database Migrations

- **Always use `bun run db:push`** for schema changes during development
- Schema is defined in `api/src/db/schema.ts`
- After modifying schema, run `db:push` to sync with database
- For production, use `db:generate` and `db:migrate`

### Multi-store Isolation

- Most queries should filter by `storeId`
- Admin users have a `storeId` (except SUPER_ADMIN)
- Always validate store access in API routes
- Member points are per-store (`storeMembers` table)

### Order Flow

1. User scans table QR code → gets `tableId` and `storeId`
2. User adds products to cart (mini-program)
3. User submits order → API creates order with status PENDING
4. Order can be paid → status changes to PAID
5. Kitchen receives order → status changes to PREPARING
6. Order completed → status changes to COMPLETED
7. Support add-on orders: create new order with `isAddition=true` and `parentOrderId`

### Print Job Processing

- Print jobs are created when order status changes to PAID
- Jobs are added to Redis Stream (`print-jobs`)
- Print worker (`api/src/worker/print-worker.ts`) processes jobs
- Worker retries failed jobs (max 3 retries)
- Dead jobs are marked as DEAD status

### Permission System

- Permissions are checked in `api/src/middleware/permission.ts`
- Format: `resource:action` (e.g., `orders:view`, `products:create`)
- SUPER_ADMIN has all permissions
- Other roles check `rolePermissions` table
- Frontend hides UI elements based on permissions

### Code Quality

- **Pre-commit hooks** (Husky + lint-staged) run on `git commit`
- ESLint + Prettier configured for all projects
- TypeScript strict mode enabled
- VSCode settings include auto-fix on save

### Testing Credentials

- Username: `admin`
- Password: `admin123`
- Test data available via `bun run db:seed`

## Common Tasks

### Adding a New API Endpoint

1. Create route file in `api/src/routes/` (e.g., `my-feature.ts`)
2. Define route using Elysia plugin pattern
3. Add authentication middleware if needed
4. Import and register in `api/src/index.ts`
5. Update Swagger documentation with `.detail()` method

### Adding a New Database Table

1. Define table in `api/src/db/schema.ts` using Drizzle schema
2. Add relations if needed
3. Run `bun run db:push` to sync schema
4. Update TypeScript types if needed

### Adding a New Admin Page

1. Create page in `admin/app/dashboard/[feature]/page.tsx`
2. Create API client functions in `admin/lib/api.ts`
3. Use React Query for data fetching
4. Add navigation link in sidebar component
5. Check permissions before rendering

### Working with WebSocket

- Server: `api/src/ws/` handles WebSocket connections
- Client: `admin/hooks/useWebSocket.ts` provides React hook
- Events are namespaced by store: `store:${storeId}:order:created`

## Documentation

Comprehensive documentation is available in `docs/`:
- `01-项目结构文档.md`: Project structure and tech stack
- `02-数据库设计文档.md`: Database design and ER diagrams
- `03-API接口文档.md`: API endpoint reference
- `04-后台管理系统架构文档.md`: Admin frontend architecture
- `05-开发与部署指南.md`: Development and deployment guide
- `06-小程序页面装修渲染指南.md`: Page decoration system guide
- `07-项目审查报告.md`: Project review and competitive analysis
- `08-UI交互评估与改进建议.md`: UI/UX evaluation
- `09-系统改进总结.md`: System improvements summary
- `10-竞品对比分析.md`: Competitive analysis

## Access Points

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:3000 |
| API Service | http://localhost:4000 |
| API Documentation | http://localhost:4000/swagger |
| WebSocket | ws://localhost:4000/ws/store/:storeId |
