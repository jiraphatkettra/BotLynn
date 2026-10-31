# 753 BC — Master Build Prompt (v2)

> Paste this whole file into Antigravity as the project brief and also save it in the repo root as `BRIEF.md`.
> It is model-agnostic. Work may start in one model and continue in another, so follow **Section 15 (Handoff Protocol)** strictly.
> This version **replaces any earlier brief or memory**. Ignore previous design directions (no Roman/empire styling, no gold/crimson palette). The only design source of truth is Section 1.

---

## 0. Role

You are a senior full-stack engineer and a motion-focused product designer. Build a production-grade member portal website for a Discord community named **753 BC** (the brand name is a single config constant, `SITE_NAME`, so it can be changed in one place).

The site serves every Discord user who joins the server: login, role shop, **role gacha**, voice-time stats, leaderboard, profile, and an admin panel. A Discord bot already exists and its data must be connected to the site.

Do not ask permission at every step. Make reasonable decisions, record them in `docs/DECISIONS.md`, and keep moving. Ask the user only when something is truly blocking (e.g. a missing env value).

---

## 1. Design System (single source of truth)

The look is a **cinematic, black, terminal-mono "voice identity" landing experience**: full-bleed dark video, black negative space, white translucent glass, sharp rectangles, hairline borders, tiny uppercase monospace UI over a huge ultra-light display word. The reference is the "ECHOID" hero (a full-viewport hero with a right-aligned entry panel). Rebuild that hero faithfully for 753 BC, then extend its visual language to every other page.

### 1.1 Absolute design rules

- Pure black page background `#000`. Antialiased text.
- **Sharp rectangles only.** No rounded corners (`border-radius: 0`), no pills, no cards with shadows, no glow, no gradients-as-decoration, no purple, no multi-shadow chrome.
- Palette is only black / white / translucent white. No accent colors, except functional status (success/error) in very muted tones, and rarity indicators in the gacha page (see §7.4) which must stay monochrome-first (use brightness, border weight, and label text, not rainbow colors).
- UI chrome is JetBrains Mono, uppercase, wide letter-spacing. Display words are Sora 200 (ultra-light).
- Video is always **full-bleed edge-to-edge**, never inset, never inside a card.
- Do not invent extra decorative overlays, floating badges, stat cards, or sections on the hero.

### 1.2 Tokens (Tailwind v4 `@theme` + CSS variables)

```
--bg: #000000
--text: #ffffff
--text-dim: rgba(255,255,255,0.62)
--text-dimmer: rgba(255,255,255,0.42)
--line: rgba(255,255,255,0.14)
--line-strong: rgba(255,255,255,0.26)
--fill-ghost: rgba(255,255,255,0.05)
--fill-solid: rgba(255,255,255,0.10)
--gutter: clamp(20px, 5vw, 100px)
--ease-premium: cubic-bezier(0.16, 1, 0.3, 1)
--font-display: "Sora", "Helvetica Neue", Helvetica, Arial, sans-serif
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace
```

Fonts (load with `next/font/google`, `display: swap`): **Sora** weights 200/300/400, **JetBrains Mono** weights 300/400/500. For Thai text add **Noto Sans Thai** (weights 200/300/400) as a fallback inside `--font-display` and body so Thai renders in the same light, airy tone.

Usage map:
- Sora 200: logo wordmark, hero H1, large page titles
- Sora 300: inputs, body copy, legal text
- JetBrains Mono 400: nav links, CTAs, chips, buttons, small links
- JetBrains Mono 300: taglines

The site is dark only. No light theme.

### 1.3 Hero (Home page) — build to this spec

**Meta:** title `753 BC — Your voice ID to the community`, `lang="th"` with an English toggle.

**Shell (`.hero`):** `position: relative; width: 100%; height: 100vh; height: 100svh; min-height: 640px` (if `max-height: 640px`, `min-height: 100svh`); `overflow: hidden; isolation: isolate`; CSS grid `grid-template-rows: auto 1fr auto` → row 1 navbar, row 2 right-aligned panel body, row 3 legal footer.

**Media layer:** absolutely positioned, `inset: 0`, `z-index: -1`, black behind it. `<video autoPlay muted loop playsInline preload="auto">` with `poster`, `width/height: 100%`, `object-fit: cover`, `object-position: center`. Preconnect to the media host.

Placeholder media (from the reference design; **replace with the owner's own files uploaded to R2 before launch**, keep the URLs in `site_settings` so the admin can swap them):
- Video: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4`
- Poster: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png`

The video is a dark, cinematic, abstract metallic/glass face sequence with a cool dark palette. Keep any replacement in that mood.

**Scrim (two stacked gradients over the video):**
- Desktop (≥721px): `linear-gradient(to right, transparent 0%, transparent 45%, rgba(0,0,0,.45) 72%, rgba(0,0,0,.72) 100%)` and `linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 22%, transparent 78%, rgba(0,0,0,.65) 100%)`.
- Mobile (≤720px): single `linear-gradient(to bottom, rgba(0,0,0,.6) 0%, rgba(0,0,0,.25) 30%, rgba(0,0,0,.75) 100%)`.

**Navbar:** flex, space-between, centered, gap 32px, padding `clamp(20px, 2.4vw, 34px)` vertical, `var(--gutter)` horizontal, safe-area insets respected.
- Left logo: wordmark `753 BC`, Sora 200, `clamp(20px, 1.75vw, 30px)`, letter-spacing `0.16em`, white, no underline, line-height 1.
- Right (≥901px): links **Story / Ranks / Shop / Contact** (adapt labels: `Home`, `Shop`, `Gacha`, `Dashboard`, `Leaderboard` for logged-in states), JetBrains Mono 400, `clamp(11px, 0.78vw, 14px)`, letter-spacing `0.18em`, uppercase, white, hover → `--text-dim` (0.25s ease), link gap `clamp(20px, 2.8vw, 56px)`.
- CTA `Join up` (or the user's avatar + name when logged in): same mono type, padding `clamp(12px,1vw,17px) clamp(20px,1.8vw,32px)`, `1px solid var(--line-strong)`, hover background `--fill-ghost` and border `rgba(255,255,255,.5)`.
- Mobile (≤900px): hide links and CTA; show a 44×44 hamburger with three 22px×1px white bars at top 16/22/28px, centered via `translateX(-50%)`. Active state morphs to X (bar1 rotate 45° to top 22px, bar2 opacity 0 + scaleX(0), bar3 rotate −45° to top 22px), transition `transform .45s var(--ease-premium), opacity .25s ease`.

**Mobile menu overlay:** fixed fullscreen, `z-index: 50` (navbar 60), background `rgba(4,4,6,.94)` with `backdrop-filter: blur(28px) saturate(140%)`. Closed: `clip-path: circle(3% at calc(100% - 42px) 42px); opacity: 0; pointer-events: none`. Open: `clip-path: circle(150% at same origin); opacity: 1`. Transition `clip-path .7s var(--ease-premium), opacity .45s ease`. Centered column of uppercase mono links (`clamp(20px, 5.5vw, 28px)`, spacing `0.14em`), then a bordered `Join up` (spacing `0.22em`, padding `16px 40px`, `1px solid var(--line-strong)`). Items start `opacity: 0; translateY(16px)` and animate in with delay `calc(180ms + var(--i) * 70ms)`. Escape and backdrop click close it; `body.menu-open { overflow: hidden }`; restore focus on close; auto-close at ≥901px. A11y: `role="dialog"`, `aria-modal`, `aria-label="Site menu"`, `aria-hidden` + `inert` when closed; toggle has `aria-expanded`, `aria-controls="mobileMenu"`, and an Open/Close label.

**Right panel** (`flex`, align center, justify flex-end; centered on ≤720px; `min-height: 0; overflow-y: auto`): width `min(34vw, 620px)`, `min-width: 380px`; ≤1100px `min(70vw, 520px)`; ≤720px full width. Elements in order:
1. **Chip** `[ Member entry ]`: JetBrains Mono 400, uppercase, `clamp(11px, 0.72vw, 14px)`, spacing `0.2em`, background `rgba(255,255,255,.09)`, padding `clamp(9px,0.8vw,14px) clamp(14px,1.1vw,20px)`, sharp rectangle.
2. **H1** `753 BC`: Sora 200, `clamp(54px, 6.2vw, 118px)` (≤380px: `clamp(44px, 15vw, 64px)`), letter-spacing `0.03em`, line-height `0.95`, margin-top `clamp(28px, 3vw, 52px)`. The largest text on the page.
3. **Tagline** `Your voice ID to the community.`: JetBrains Mono 300, uppercase, `clamp(11px, 0.94vw, 17px)`, spacing `0.14em`, color `--text-dim`, margin-top `clamp(14px, 1.4vw, 24px)`.
4. **Actions** (margin-top `clamp(38px, 4.6vw, 82px)`, column gap `clamp(14px, 1.3vw, 22px)`, full width). The email field of the reference is **replaced** by Discord auth:
   - Ghost button `Browse role shop` (`--fill-ghost` background, `--text-dimmer` color, hover bg `rgba(255,255,255,.09)` + white text).
   - Solid button `Continue with Discord` (`--fill-solid`, white, hover `rgba(255,255,255,.17)`) → triggers NextAuth Discord sign-in.
   - Both: full width, no border, no radius, padding `clamp(17px,1.6vw,27px) 20px`, JetBrains Mono 400, uppercase, spacing `0.22em`, size `clamp(11px,0.78vw,14px)`.
   - When already logged in, the panel shows the member's Discord username (mono label) and the solid button becomes `Open dashboard`.
5. **Small link** `I've got a redeem code` (centered, mono 400 uppercase, `clamp(11px,0.74vw,14px)`, spacing `0.18em`, margin-top `clamp(26px,2.6vw,46px)`, hover `--text-dim` + underline offset 4px) → opens a minimal modal to redeem a code (see §6, redeem codes).

**Legal footer row:** `border-top: 1px solid var(--line)`, padding `clamp(18px,1.7vw,30px) var(--gutter)` plus safe-area bottom, centered. Sora 300, `clamp(12px,0.82vw,16px)`, color `--text-dim`, line-height 1.5. Copy: "By continuing you accept our **Privacy Notice** and **Service Terms**." The two links are white, underlined (offset 3px, thickness 1px), hover `--text-dim`.

**Focus / a11y:** `:focus-visible { outline: 1px solid rgba(255,255,255,.7); outline-offset: 3px }` on every interactive element.

**Reduced motion:** hide the video, show the poster as cover background on the media layer, and set all animation/transition durations to `0.01ms`.

**Short height (`max-height: 640px`):** tighter nav padding, H1 `clamp(36px,7vw,64px)`, smaller form gaps, thinner buttons, legal text 11px.

### 1.4 Extending the language to inner pages

All other pages share the same shell: black background, the same navbar (sticky, `backdrop-filter: blur`, hides on scroll-down), hairline `1px solid var(--line)` dividers, uppercase mono labels, and large Sora 200 titles.
- Section eyebrow: `[ 01 ] STATS` style chip (same chip spec as above), number then label.
- Content "panels" are sharp rectangles with `border: 1px solid var(--line)` and `background: var(--fill-ghost)`; hover raises border to `--line-strong`. No shadows, no rounding.
- Tables/lists use hairline row separators and mono numerals (tabular).
- Buttons reuse `.btn--ghost` and `.btn--solid` from the hero. Primary destructive/confirm actions stay in the same monochrome language (confirm = solid, cancel = ghost).
- Page titles: Sora 200, `clamp(40px, 5vw, 88px)`, letter-spacing `0.03em`.
- Footer on all pages: the same hairline legal row.
- Background on inner pages: pure black with an optional looping, heavily darkened version of the hero video (opacity ≤ 0.25, fixed, behind content, `preload="none"`, disabled on reduced-motion and on low-power devices).

---

## 2. Motion & Mouse Interaction Spec

The hero base is intentionally austere (no entrance animation on the panel, no glow). The motion layer below is **additive and monochrome**: it adds life without breaking the look. Everything must run at 60 fps and respect reduced motion.

**Global**
- **Smooth scroll** with Lenis (off for reduced-motion).
- **Custom cursor** (fine pointers only): a 6px white dot plus a 36px thin white ring (`1px`, `mix-blend-mode: difference`) that trails with spring easing. The ring grows to ~64px over links/buttons, turns into a small mono label (`VIEW`, `OPEN`, `DRAG`) over media, and hides on touch devices.
- **Mouse-parallax video:** the hero video layer is scaled to `1.06` and translated up to ±14px opposite the cursor (spring-smoothed), so the face visual subtly follows the mouse. Disabled on touch and reduced-motion.
- **Cursor hairline light:** panels and buttons get a white radial highlight (`rgba(255,255,255,.08)`, ~180px) clipped to the **border and fill only**, following the pointer via CSS variables `--mx/--my`. It is a soft sheen, not a glow around the element.
- **Magnetic buttons:** primary CTAs and nav CTA drift toward the cursor within ~70px (max 8px), returning with spring.
- **Text scramble on hover:** mono nav links and chips briefly scramble characters (A–Z, 0–9, `_`, `/`) for ~300 ms, then settle to the real label. No layout shift (monospace keeps width).
- **Letter-spacing breathe:** the H1 `753 BC` widens its letter-spacing by ~0.01em while the cursor is inside the panel (smooth, subtle).
- **Page transitions:** hairline wipe (a 1px white line sweeps across then content fades up 12px), using the View Transitions API where supported, Motion otherwise.
- **Navbar:** hides on scroll down, shows on scroll up; active link gets a 1px underline that slides between items.

**Content reveals (inner pages)**
- Section eyebrows and titles reveal with a masked line-by-line slide-up.
- Panels fade/translate in with a 60ms stagger.
- Numbers (voice hours, balances, ranks) count up once when visible, tabular-nums.
- Dividers draw themselves from left to right (`scaleX` 0→1).
- Cards on lists/grids tilt up to 4° toward the cursor with transform-only 3D (no shadows).
- Marquee ticker of mono tags (`VOICE TIME ▪ ROLE SHOP ▪ GACHA ▪ LEADERBOARD ▪ …`), infinite, pauses on hover, speeds up with scroll velocity.
- Charts animate in once on first view.
- Skeleton loaders match final layout (no layout shift).

**Rules**
- Animate only `transform` and `opacity` where possible. Never animate `width/height/top/left`.
- One shared `useReducedMotion()` gate for everything.
- Heavy effects are `next/dynamic` lazy-loaded and start only when visible (`IntersectionObserver`); off-screen video and canvases pause.
- Cursor and parallax logic run in a single `requestAnimationFrame` loop, not many listeners.

---

## 3. Tech Stack (use this unless a better option is justified in DECISIONS.md)

| Concern | Choice |
|---|---|
| Framework | **Next.js (latest stable), App Router, React, TypeScript strict**. Server Components by default; client components only for interaction |
| Styling | **Tailwind CSS v4** with tokens in `@theme`; custom CSS only for the hero effects Tailwind can't express |
| UI primitives | **Radix primitives (shadcn/ui)**, fully restyled to §1 (sharp, mono, hairline) |
| Motion | **Motion (`motion/react`)** for UI/scroll/layout, **Lenis** for smooth scroll, **GSAP + ScrollTrigger** only if Motion can't do a set piece cleanly |
| Optional FX | **OGL** for one lazy-loaded subtle effect (e.g. gacha reveal particles); never on first paint |
| Auth | **NextAuth (Auth.js v5)** Discord provider, scopes `identify guilds guilds.members.read` |
| Database | **Supabase Postgres** + **Drizzle ORM** + `drizzle-kit` (pooled URL at runtime, direct URL for migrations) |
| Object storage | **Cloudflare R2** via `@aws-sdk/client-s3` presigned URLs; public reads through the R2 custom domain/CDN |
| Data | Server Components + Server Actions; **TanStack Query** only for live client widgets |
| Validation | **Zod** everywhere + **@t3-oss/env-nextjs** (fail fast on bad env) |
| i18n | **next-intl**, Thai default, English toggle, no hardcoded strings |
| Charts | **Recharts**, lazy-loaded, styled monochrome (white lines, hairline grid) |
| Rate limiting | **Upstash Ratelimit** if Upstash env exists, else a Postgres-backed limiter |
| Payments | `PaymentProvider` adapter; default **Stripe Checkout with PromptPay** + signed webhook |
| Testing | **Vitest** + **Playwright** (login, purchase, gacha roll, redeem code) |
| Quality | ESLint, Prettier, `tsc --noEmit` in CI, Husky + lint-staged |

If you know a library or framework that makes the site measurably faster or more maintainable, add it and justify it in one paragraph in `docs/DECISIONS.md`.

---

## 4. Environment & Secrets

The user has **already created `.env.local`** with all keys (Discord OAuth, Discord bot token, Supabase/Postgres, NextAuth, R2).

1. Read variable **names** from `.env.local`/`.env.example`. **Never print, log, echo, or commit secret values.**
2. Create `src/env.ts` validating every variable with Zod; server secrets are `import "server-only"`.
3. Generate `.env.example` (names only, empty values). Ensure `.env*` is gitignored.
4. If a variable is missing, record it in `docs/MISSING_ENV.md` with its purpose and keep building.

---

## 5. Discord Bot Integration

The bot already runs elsewhere and tracks server activity. The site reads its data and triggers role changes.

- **Shared Supabase Postgres is the integration point.** The bot writes activity (voice sessions, message counts); the site reads it and owns shop/gacha/economy tables.
- Introspect the existing DB first (`drizzle-kit introspect`) and **adapt to existing bot tables; never rename or break them.** Put site-owned tables in a `site` schema or with a clear prefix. If the bot lacks something the site needs, document the exact change in `docs/BOT_CONTRACT.md`.
- **Role changes** are server-side only through Discord REST with the bot token (`PUT/DELETE /guilds/{guild}/members/{user}/roles/{role}`), wrapped in a `discordRoles` service with retry, `429/Retry-After` handling, and idempotency. Every grant writes `role_grants` (`source: shop | gacha | voice_rank | redeem | admin`).
- **Reconciliation cron** compares DB grants with actual Discord roles and surfaces drift in the admin panel.
- **Guild gate:** after login, verify membership. Non-members see a minimal "Join the server first" screen with an invite button. Only members can buy, roll, or view stats.
- **Optional events:** `POST /api/bot/events`, HMAC-signed (`BOT_WEBHOOK_SECRET`), Zod-validated payloads (`voice.session.closed`, `member.leave`, …). Otherwise use short-TTL cached queries.

---

## 6. Pages & Features

**Public**
1. **Home** — the hero in §1.3, then below the fold (kept minimal, same language): a marquee ticker; `[ 01 ] FEATURES` as a hairline 4-column grid (Voice time / Role shop / Gacha / Leaderboard); `[ 02 ] RANKS` as a vertical hairline ladder that draws itself on scroll; final CTA row; footer.
2. **Odds & Rules** (`/odds`) — mandatory transparency page generated from the live DB.
3. **Login** — handled by the hero panel and a minimal `/login` page (single `Continue with Discord` solid button; explains only identity + guild membership are read).

**Member**
4. **Dashboard / Voice Time** — total, this week/month, streak, server rank, 7/30-day chart, progress to next auto-rank, recent sessions, per-channel breakdown.
5. **Role Shop** — fixed-price tiers as sharp panels with perks, owned state, purchase flow, receipt.
6. **Role Gacha** — see §7.
7. **Inventory & History** — owned roles, equip/unequip cosmetic roles, transactions and roll history.
8. **Leaderboard** — voice time and XP, weekly/monthly/all-time tabs, the user's row pinned.
9. **Redeem Code** — enter a code for credits or a role (codes created in admin; single-use or limited-use, expiry, audit logged).
10. **Profile & Settings** — language, privacy toggle (hide from public leaderboard), connected Discord info, data export request.

**Admin** (gated by a Discord role ID in config + live role check)
11. Overview (revenue, active members, rolls today, grant drift) · 12. Roles & shop manager · 13. Gacha manager (pools, weights, pity, schedule, live odds preview that must sum to 100%) · 14. Economy tools (balance adjust with mandatory reason) · 15. Members (search, stats, grants, revoke) · 16. Redeem codes · 17. Content & media (R2 uploads, hero video/poster swap, marquee tags) · 18. Append-only audit log.

---

## 7. Role Gacha System

### 7.1 Currency
Members earn **Credits** (name configurable) from voice time and optional activity (rate and daily cap set in admin). Rolls cost Credits. **Do not accept real money for gacha rolls**; paid purchases are limited to the fixed-price Role Shop. (Randomized paid rewards can fall under gambling regulation in many jurisdictions, including Thailand. Record this decision in `docs/DECISIONS.md`.)

### 7.2 Pools
A pool has name, artwork, cost per roll, 10-roll discount, start/end, and prizes (Discord role, cosmetic, Credit refund, XP boost) each with rarity and weight. Rarities: Common, Rare, Epic, Legendary, Mythic.

### 7.3 Integrity (non-negotiable)
- All randomness is **server-side** (`crypto.randomInt`). The client only animates an already-decided result.
- One roll = one DB transaction: lock wallet row → verify funds → pick prize → write `gacha_rolls` → deduct balance → write pending `role_grants` → commit; then call Discord; on failure mark `grant_failed` and retry via cron. Never charge without a recorded outcome.
- **Idempotency key** per request; per-user and per-IP rate limits.
- **Pity:** soft pity raises Epic+ odds after N misses; hard pity guarantees Legendary at M; counters stored per user per pool.
- **Duplicates:** convert to Credits or shards (configurable per pool).
- **Expiring roles:** `expires_at` handled by cron removing the role from Discord and DB.
- Store a per-roll commit hash for auditability. Block rolls for users who left the guild or are flagged; log anomalies.

### 7.4 Reveal experience (showpiece, still on-brand)
Monochrome and austere, not a casino. Pool selector as large hairline panels with tilt + cursor sheen. Roll sequence: screen dims to black → a single white hairline ring contracts to a point → flash of the poster video frame → the prize panel opens as a sharp rectangle with mono label `[ RARE ]`. Rarity is expressed by **border weight, number of hairline rings, animation length, and label text**, never by rainbow colors (Common 1px, Rare 1px double line, Epic animated hairline sweep, Legendary full-width scanline + longer sequence, Mythic adds a one-frame white inversion). 10-roll shows a fast grid reveal with Skip (skip never changes results). Sound off by default with a remembered mute toggle. Live balance and pity counters with optimistic UI that rolls back on error. Reduced-motion = simple fade to result.

### 7.5 Transparency
`/odds` lists every prize per active pool with exact drop probability and pity rules, generated live from the DB.

---

## 8. Payments (Role Shop only)
`PaymentProvider` interface (`createCheckout`, `verifyWebhook`, `refund`), Stripe (card + PromptPay) implemented first, stub for Omise/manual slip. Flow: buy → `orders` row `pending` → checkout → **signed idempotent webhook** marks `paid` → grant via `discordRoles` → receipt. Never grant from a client redirect alone. Refund/chargeback revokes the role and writes an audit entry.

---

## 9. Database (Drizzle, suggested)

`users` · Auth.js `accounts/sessions` · `voice_sessions` (bot-owned) · `voice_totals` (aggregated, cron-refreshed) · `ranks` (name, role_id, min_voice_minutes, order; seed neutral names such as Initiate, Member, Veteran, Elite, Legend, editable) · `wallets` · `wallet_ledger` (append-only) · `shop_items` · `orders` · `gacha_pools` · `gacha_prizes` · `gacha_rolls` · `pity_counters` · `redeem_codes` · `role_grants` · `assets` · `audit_log` · `site_settings`.

Foreign keys, indexes on `(user_id, created_at)` and leaderboard queries, `CHECK (balance >= 0)`, enums for rarity/status, **RLS on every table** (members read their own rows; leaderboard through a safe view). The privileged connection is server-only; never expose a service role key to the browser. Seed script (dev only): ranks, shop items, one demo pool, fake voice data.

---

## 10. Cloudflare R2
Uploads go browser → presigned PUT → R2 (never proxy big files through Next). Validate MIME, size (≤ 8 MB image, ≤ 60 MB video) and ownership before issuing the URL. Keys like `site/hero/{uuid}.mp4`, `gacha/{pool}/{uuid}.webp`. Sharp-generated WebP/AVIF thumbs, dimensions stored in `assets` to prevent layout shift, long immutable cache on hashed keys. The hero video/poster URLs are read from `site_settings` so admins can swap them.

---

## 11. Performance, SEO, Accessibility
- Targets: Lighthouse ≥ 95 on mobile for Home; LCP < 2.0 s (poster image preloaded, video starts after); CLS < 0.05; first-load JS for Home < 150 KB gzip.
- RSC + `Suspense` streaming, tagged caching with revalidation on admin edits, leaderboard cached 30–60 s.
- Video: WebM + MP4, `preload="auto"` only on the hero, `preload="none"` elsewhere, pause when off-screen.
- Dynamic OG images, sitemap, robots, JSON-LD.
- WCAG AA contrast (check `--text-dimmer` use; don't use it for essential text), full keyboard navigation, visible focus ring per §1.3, `aria-live` for roll results and toasts, semantic landmarks.
- Responsive from 360 px, touch targets ≥ 44 px.

## 12. Security
Server-side only for money/roll/role logic; Zod on all inputs; parameterized queries; CSRF protection on mutations; strict cookies; security headers (CSP allowing Stripe, Discord CDN, R2 domain, media host; HSTS; nosniff; Referrer-Policy; Permissions-Policy); admin routes check session + live Discord role; every admin and money action audit-logged; rate-limit login, roll, purchase, redeem, upload-URL, bot webhook; dependency audit in CI; CI test that no secret reaches the client bundle.

## 13. Project Structure
```
src/
  app/ (public) (member) (admin)/admin api/ (auth, bot events, webhooks, cron, r2 presign)
  components/ ui/ motion/ (Cursor, MouseParallaxVideo, Magnetic, TiltPanel, Scramble, Marquee, Reveal, Counter, HairlineSheen) gacha/ charts/
  server/ db/ services/ (discordRoles, wallet, gacha, orders, voiceStats, redeem, r2) auth/
  lib/  messages/ (th.json, en.json)  env.ts
docs/ DECISIONS.md BOT_CONTRACT.md MISSING_ENV.md PROGRESS.md
```
Cron (Vercel Cron, `CRON_SECRET`): voice totals refresh, role expiry, grant reconciliation, daily credit cap reset.

## 14. Build Order (milestones)
Finish each one, run `tsc`, lint and tests, update `docs/PROGRESS.md`, commit, then continue.
1. Foundation: Next.js, Tailwind v4 tokens, fonts, i18n, env validation, CI scripts, `AGENTS.md`, `PROGRESS.md`.
2. Design system + motion kit (Cursor, parallax video, Magnetic, Scramble, TiltPanel, Marquee, Reveal, Counter, Navbar, mobile menu, buttons, chips) with a dev-only `/dev/kit` page.
3. **Home hero** matched to §1.3 exactly, then the below-the-fold sections, then mobile and short-height passes.
4. Auth + guild gate.
5. Database: introspect bot tables, schema, migrations, RLS, seeds.
6. Voice dashboard + leaderboard + auto-rank sync.
7. Role service + shop + payments.
8. Gacha engine, pity, duplicates, reveal, odds page, history.
9. Redeem codes, inventory, profile, settings.
10. Admin panel, audit log, R2 uploads.
11. Cron jobs and reconciliation.
12. Hardening: headers, rate limits, a11y, Lighthouse, Playwright flows, README with deploy steps.

## 15. Handoff Protocol (model switching mid-project)
You may be stopped at any time (usage limit) and a different model will resume from the repo alone.
1. Create `docs/PROGRESS.md` **before any feature code** and update it **after every task**: `Done` · `In progress (exact file + next step)` · `Next` · `Known issues` · `Decisions pending`.
2. Commit small and often (`feat(gacha): server-side roll transaction`). Never leave the repo non-building at a commit.
3. Maintain a root `AGENTS.md`: stack, folder map, naming rules, run commands (`pnpm dev`, `pnpm db:migrate`, `pnpm test`), the design rules of §1 and §2, and the non-negotiables of §7.3 and §12.
4. At the start of every session read `BRIEF.md`, `AGENTS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, then continue from "In progress".
5. Do not rewrite finished modules for style. Extend them.

## 16. Definition of Done
- The Home hero is visually indistinguishable from the §1.3 spec and the whole site keeps the black, sharp, mono, hairline language.
- Mouse-driven motion (cursor, parallax video, magnetic buttons, scramble, sheen) is smooth, monochrome, and disabled gracefully for touch and reduced-motion.
- A new Discord user can log in → be verified as a guild member → see voice time → buy a role → roll the gacha with Credits → receive the role in Discord within seconds.
- Admins manage everything without touching the database.
- No secret is exposed to the client or the repo.
- Performance and accessibility targets met; `README.md` documents setup, env, migrations, bot contract, cron, and deployment.

Begin with Milestone 1. Create `docs/PROGRESS.md` first, then proceed.
