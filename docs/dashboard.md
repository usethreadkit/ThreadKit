# ThreadKit Dashboard (SaaS)

This document describes setting up the Next.js dashboard for the hosted SaaS version of ThreadKit.

> **Note:** The dashboard is only needed for the hosted SaaS product (usethreadkit.com). Self-hosters can manage everything via the API and Redis directly.

---

## Overview

The dashboard provides:
- Site owner authentication (separate from commenters)
- Site management (create sites, API keys, settings)
- Billing & subscriptions (Stripe integration)
- Analytics & usage tracking
- Moderator management

---

## Tech Stack

- **Next.js 16** - React framework
- **Drizzle ORM** - Type-safe database client
- **PostgreSQL** - Dashboard data (users, sites, billing)
- **Redis** - Comment data (read for analytics)
- **Stripe** - Payments

---

## Database Schema

### Postgres Tables

```sql
-- Site owners / dashboard users
users
  id                    uuid
  email                 text (unique)
  phone                 text (unique)
  password_hash         text
  name                  text
  avatar_url            text
  provider              text (email/phone/google/github)
  provider_id           text
  email_verified        boolean
  phone_verified        boolean
  stripe_customer_id    text
  created_at            timestamp
  updated_at            timestamp

-- Sessions for dashboard auth
sessions
  id                    uuid
  user_id               uuid (FK)
  token_hash            text
  user_agent            text
  ip                    text
  expires_at            timestamp
  created_at            timestamp

-- Verification codes
verification_codes
  id                    uuid
  user_id               uuid (FK)
  email                 text
  phone                 text
  code                  text
  type                  text
  expires_at            timestamp
  created_at            timestamp

-- Subscriptions
subscriptions
  id                    uuid
  user_id               uuid (FK, unique)
  plan                  text (free/pro/business/enterprise)
  status                text (active/past_due/canceled)
  stripe_subscription_id text
  stripe_price_id       text
  current_period_start  timestamp
  current_period_end    timestamp
  cancel_at_period_end  boolean
  created_at            timestamp
  updated_at            timestamp

-- Sites
sites
  id                    uuid
  owner_id              uuid (FK)
  name                  text
  domain                text (unique)
  project_id_public        text (unique)
  project_id_secret        text (unique)
  settings              jsonb
  created_at            timestamp
  updated_at            timestamp

-- Usage records (for billing)
usage_records
  id                    uuid
  site_id               uuid (FK)
  period                text (YYYY-MM)
  comments              integer
  pageviews             integer
  unique_visitors       integer
  api_requests          integer
  created_at            timestamp
  updated_at            timestamp
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd usethreadkit.com
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/threadkit

# Redis (for reading comment data)
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key-at-least-32-chars

# OAuth
OAUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=xxx
OAUTH_GITHUB_CLIENT_ID=xxx
OAUTH_GITHUB_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxx

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Set Up Database

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:push

# (Optional) Open Drizzle Studio
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

---

## API Routes to Implement

### Auth Routes (`/api/auth/`)

```
POST /api/auth/register     - Email/phone registration
POST /api/auth/login        - Email/phone login
POST /api/auth/verify       - Verify email/phone
POST /api/auth/forgot       - Request password reset
POST /api/auth/reset        - Reset password
GET  /api/auth/google       - Google OAuth
GET  /api/auth/google/callback
GET  /api/auth/github       - GitHub OAuth
GET  /api/auth/github/callback
POST /api/auth/refresh      - Refresh token
POST /api/auth/logout       - Logout
```

### Site Routes (`/api/sites/`)

```
GET    /api/sites           - List user's sites
POST   /api/sites           - Create new site
GET    /api/sites/:id       - Get site details
PUT    /api/sites/:id       - Update site settings
DELETE /api/sites/:id       - Delete site
POST   /api/sites/:id/keys  - Rotate API keys
```

### Billing Routes (`/api/billing/`)

```
GET  /api/billing/subscription  - Get current subscription
POST /api/billing/checkout      - Create Stripe checkout session
POST /api/billing/portal        - Create Stripe billing portal link
POST /api/billing/webhook       - Stripe webhook handler
GET  /api/billing/usage         - Get usage breakdown
```

### Internal Routes (`/api/internal/`)

Used by Rust server in SaaS mode:

```
GET /api/internal/validate-key?key=tk_pub_xxx
    → { site_id, settings, plan_limits }
```

---

## Dashboard Pages

```
/                           - Landing page
/login                      - Login
/register                   - Register
/dashboard                  - Site overview
/dashboard/sites            - Site list
/dashboard/sites/new        - Create site
/dashboard/sites/:id        - Site details
/dashboard/sites/:id/settings - Site settings
/dashboard/sites/:id/analytics - Usage analytics
/dashboard/sites/:id/moderation - Moderation queue
/dashboard/billing          - Subscription management
/dashboard/account          - Account settings
```

---

## Stripe Integration

### Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Free | $0 | $0 | 1 site, 1K comments/mo |
| Pro | $19 | $190 | 5 sites, 50K comments/mo |
| Business | $49 | $490 | 20 sites, 500K comments/mo |
| Enterprise | Custom | Custom | Unlimited |

### Webhook Events to Handle

```typescript
switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
  case 'customer.subscription.deleted':
    // Update subscription in database
    break;

  case 'invoice.payment_succeeded':
    // Record payment, extend period
    break;

  case 'invoice.payment_failed':
    // Mark subscription as past_due
    break;

  case 'customer.subscription.trial_will_end':
    // Send reminder email
    break;
}
```

---

## Usage Tracking

The Rust server increments usage counters in Redis. The dashboard reads these for billing:

```typescript
// Sync usage from Redis to Postgres (run hourly)
async function syncUsage() {
  const sites = await db.select().from(sites);

  for (const site of sites) {
    const period = new Date().toISOString().slice(0, 7);
    const key = `site:${site.id}:usage:${period}`;

    const usage = await redis.hgetall(key);

    await db.insert(usageRecords)
      .values({
        siteId: site.id,
        period,
        comments: parseInt(usage.comments || '0'),
        pageviews: parseInt(usage.pageviews || '0'),
      })
      .onConflictDoUpdate({
        target: [usageRecords.siteId, usageRecords.period],
        set: {
          comments: parseInt(usage.comments || '0'),
          pageviews: parseInt(usage.pageviews || '0'),
        },
      });
  }
}
```

---

## Limit Enforcement

In SaaS mode, the Rust server calls the dashboard to validate API keys and get limits:

```typescript
// /api/internal/validate-key
export async function GET(request: Request) {
  const key = request.nextUrl.searchParams.get('key');

  // Look up site by API key
  const site = await db.query.sites.findFirst({
    where: or(
      eq(sites.apiKeyPublic, key),
      eq(sites.apiKeySecret, key)
    ),
    with: { owner: { with: { subscription: true } } }
  });

  if (!site) {
    return Response.json({ error: 'Invalid key' }, { status: 401 });
  }

  const plan = site.owner.subscription?.plan || 'free';
  const limits = PLAN_LIMITS[plan];

  return Response.json({
    site_id: site.id,
    key_type: key === site.apiKeySecret ? 'secret' : 'public',
    settings: site.settings,
    limits: {
      comments_per_month: limits.commentsPerMonth,
      pageviews_per_month: limits.pageviewsPerMonth,
    }
  });
}
```

---

## Deployment

### Vercel

```bash
vercel deploy
```

Environment variables in Vercel dashboard.

### Self-Hosted

```bash
npm run build
npm start
```

Or with Docker:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Development Tasks

### TODO: Auth

- [ ] Email/phone registration with verification
- [ ] Password login with Argon2
- [ ] OAuth (Google, GitHub)
- [ ] Password reset flow
- [ ] Session management

### TODO: Sites

- [ ] Create site with auto-generated API keys
- [ ] Site settings page
- [ ] API key rotation
- [ ] Delete site (with confirmation)

### TODO: Billing

- [ ] Stripe checkout integration
- [ ] Webhook handling
- [ ] Usage tracking & limits
- [ ] Billing portal link
- [ ] Upgrade/downgrade flows

### TODO: Moderation

- [ ] Read moderation queue from Redis
- [ ] Approve/reject comments via API
- [ ] Manage blocked users
- [ ] View reports

### TODO: Analytics

- [ ] Comment counts over time
- [ ] Pageview charts
- [ ] Top pages by engagement
- [ ] User growth
