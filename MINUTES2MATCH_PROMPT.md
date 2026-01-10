# Project: Minutes 2 Match (v2) - Hybrid Dating Platform for Ghana

## Tech Stack
- **Frontend**: Nuxt 3 (SSR)
- **UI**: Nuxt UI + TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **SMS/OTP**: Hubtel SMS API
- **Payments**: Paystack (card/mobile money)
- **State**: Pinia

---

## Context & Goal

Rebuild an existing speed dating site into a full "Dating Engine" for the African market. Move from ticket-only sales to a **dual-revenue model**:

| Mode | Description | Revenue |
|------|-------------|---------|
| **Events** | Users book spots for physical speed dating events | Ticket sales |
| **Matchmaking (Headhunter)** | Users pay premium to be manually matched from the database | Unlock fees |

---

## Design Principles

1. **Mobile-First**: 95% of traffic is mobile. All interactions must be thumb-friendly.
2. **Low-Friction**: No long forms. Use progressive "Vibe Check" quiz to gather data.
3. **Privacy-Centric**: Profiles are "blind" (no names/photos public) until payment unlocks them.
4. **Premium Aesthetic**: Dark theme (Navy Blue `#1a1a2e` + Gold accents `#d4af37`) to signal high value.

---

## 1. Database Schema (Supabase)

### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  birth_date DATE,
  location TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  dating_persona TEXT, -- e.g., "The Power Player", "The Romantic"
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `vibe_answers`
```sql
CREATE TABLE vibe_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL, -- e.g., "friday_night", "conflict_style"
  answer_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_key)
);
```

### `events`
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  venue_address TEXT,
  male_capacity INT NOT NULL,
  female_capacity INT NOT NULL,
  male_tickets_sold INT DEFAULT 0,
  female_tickets_sold INT DEFAULT 0,
  ticket_price_male DECIMAL(10,2) NOT NULL,
  ticket_price_female DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'open', 'waitlist', 'sold_out', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `event_bookings`
```sql
CREATE TABLE event_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled')) DEFAULT 'pending',
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
```

### `matches`
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending_payment', 'unlocked', 'rejected', 'expired')) DEFAULT 'pending_payment',
  unlock_price DECIMAL(10,2) NOT NULL,
  created_by UUID REFERENCES profiles(id), -- Admin who created the match
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,
  UNIQUE(user_1_id, user_2_id)
);
```

### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  provider TEXT CHECK (provider IN ('paystack', 'hubtel')) NOT NULL,
  provider_ref TEXT UNIQUE,
  purpose TEXT CHECK (purpose IN ('event_ticket', 'match_unlock')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `admins`
```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('super_admin', 'matchmaker')) DEFAULT 'matchmaker',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
```sql
-- Profiles: Users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Matches: Users can only see matches they're part of
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own matches" ON matches FOR SELECT 
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);
```

---

## 2. Key Feature Modules

### A. "Vibe Check" Onboarding

Multi-step wizard replacing traditional registration:

| Step | Content | Action |
|------|---------|--------|
| 1 | Age, Gender, Location | Basic validation |
| 2 | 3-5 scenario questions (large tappable cards) | Store in `vibe_answers` |
| 3 | Phone verification via Hubtel OTP | Set `is_verified = true` |
| 4 | Persona result reveal | Save `dating_persona`, redirect to Dashboard |

**Persona Assignment Logic**:
```typescript
// composables/usePersona.ts
const personas = {
  'power_player': { answers: ['career', 'networking', 'ambitious'] },
  'romantic': { answers: ['love', 'connection', 'emotional'] },
  'adventurer': { answers: ['travel', 'spontaneous', 'thrill'] },
  // ... more personas
};
```

---

### B. User Dashboard (The "Fork")

**Route**: `pages/dashboard/index.vue`

#### View 1: Events Tab
- List upcoming events from `events` table where `status = 'open'`
- **Dynamic Capacity Logic**:
  ```typescript
  function getButtonState(event: Event, userGender: string) {
    const capacity = userGender === 'female' ? event.female_capacity : event.male_capacity;
    const sold = userGender === 'female' ? event.female_tickets_sold : event.male_tickets_sold;
    
    if (sold >= capacity) return 'waitlist';
    if (sold >= capacity * 0.9) return 'almost_full'; // 90% threshold
    return 'available';
  }
  ```

#### View 2: Matchmaking Tab
- Display "Blind Cards" of admin-recommended matches
- Card shows: Age, Persona Badge, Vibe Summary (blurred photo)
- CTA: "Unlock this Match (GH₵ X)" → Initiates Paystack payment

---

### C. Admin Panel (Headhunter Tool)

**Route**: `pages/admin/index.vue` (protected via middleware)

| Feature | Description |
|---------|-------------|
| User Table | Filterable by Gender, Age Range, Persona, Verification Status |
| Matchmaker | Select User A + User B → Click "Create Match" |
| Event Manager | CRUD for events, view bookings, export attendee list |

**Match Creation Flow**:
1. Admin selects two users
2. System creates `match` record with `status = 'pending_payment'`
3. Trigger Hubtel SMS to both users: *"You have a potential match! Log in to minutes2match.com to view their blind profile."*

---

## 3. Hubtel SMS Integration

### Server Route: `server/api/send-sms.post.ts`

> ⚠️ **Critical**: Never call Hubtel directly from frontend—API keys would be exposed.

```typescript
// server/api/send-sms.post.ts
export default defineEventHandler(async (event) => {
  const { to, message } = await readBody(event);
  
  const config = useRuntimeConfig();
  
  const response = await $fetch('https://smsc.hubtel.com/v1/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.hubtelClientId}:${config.hubtelClientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: {
      From: 'M2Match',
      To: to,
      Content: message
    }
  });
  
  return { success: true, messageId: response.MessageId };
});
```

### Composable: `composables/useHubtel.ts`
```typescript
export const useHubtel = () => {
  const sendSMS = async (to: string, message: string) => {
    return await $fetch('/api/send-sms', {
      method: 'POST',
      body: { to, message }
    });
  };
  
  const sendOTP = async (phone: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store OTP in Supabase with expiry (5 mins)
    await sendSMS(phone, `Your M2Match verification code is: ${otp}`);
    return otp;
  };
  
  return { sendSMS, sendOTP };
};
```

### SMS Templates
| Trigger | Message |
|---------|---------|
| OTP Verification | `Your M2Match code is: {OTP}. Expires in 5 mins.` |
| Match Found | `You have a potential match! Log in to minutes2match.com to unlock.` |
| Event Reminder (24h) | `Reminder: {Event} is tomorrow at {Venue}. See you there!` |
| Booking Confirmed | `Your spot for {Event} is confirmed! Check-in starts at {Time}.` |

---

## 4. Payment Integration (Paystack)

### Server Route: `server/api/paystack/initialize.post.ts`
```typescript
export default defineEventHandler(async (event) => {
  const { email, amount, metadata, callback_url } = await readBody(event);
  const config = useRuntimeConfig();
  
  const response = await $fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.paystackSecretKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      email,
      amount: amount * 100, // Paystack uses pesewas
      currency: 'GHS',
      callback_url,
      metadata
    }
  });
  
  return response.data;
});
```

### Webhook: `server/api/paystack/webhook.post.ts`
Handle `charge.success` events to:
1. Update `payments.status = 'success'`
2. For event tickets: Update `event_bookings.status = 'confirmed'`, increment `tickets_sold`
3. For match unlocks: Update `matches.status = 'unlocked'`

---

## 5. Project Structure

```
minutes2match-v2/
├── nuxt.config.ts
├── .env
├── pages/
│   ├── index.vue              # Landing page
│   ├── vibe-check/
│   │   └── index.vue          # Onboarding wizard
│   ├── dashboard/
│   │   ├── index.vue          # Main dashboard (tabs)
│   │   └── match/[id].vue     # Individual match view
│   └── admin/
│       ├── index.vue          # Admin dashboard
│       ├── users.vue          # User management
│       ├── matches.vue        # Matchmaker tool
│       └── events/
│           ├── index.vue      # Event list
│           └── [id].vue       # Event detail/edit
├── components/
│   ├── VibeCard.vue           # Tappable answer card
│   ├── BlindProfileCard.vue   # Blurred match card
│   └── EventCard.vue          # Event listing card
├── composables/
│   ├── useHubtel.ts
│   ├── usePersona.ts
│   └── usePaystack.ts
├── server/
│   └── api/
│       ├── send-sms.post.ts
│       └── paystack/
│           ├── initialize.post.ts
│           └── webhook.post.ts
└── middleware/
    └── admin.ts               # Protect admin routes
```

---

## 6. Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Hubtel
HUBTEL_CLIENT_ID=your_client_id
HUBTEL_CLIENT_SECRET=your_client_secret

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx

# App
BASE_URL=https://minutes2match.com
```

---

## 7. Setup Commands

```bash
# Initialize project
npx nuxi@latest init minutes2match-v2
cd minutes2match-v2

# Install dependencies
npm install @nuxt/ui @nuxtjs/supabase @pinia/nuxt

# Add to nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@pinia/nuxt'],
  supabase: {
    redirect: false
  }
})
```

---

## Summary of Key Fixes Made

| Issue | Fix |
|-------|-----|
| Missing foreign keys | Added proper `REFERENCES` and `ON DELETE CASCADE` |
| No RLS policies | Added Row Level Security examples |
| Incomplete payment flow | Added full Paystack integration with webhooks |
| Vague capacity logic | Added explicit `getButtonState()` function |
| Missing event_bookings table | Added junction table for user-event relationship |
| No admin authentication | Added `admins` table and middleware reference |
| Exposed API keys risk | Emphasized server-side SMS handling |
| Missing waitlist logic | Integrated into booking status enum |
