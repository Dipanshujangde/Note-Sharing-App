# NoteShare — Secure Note-Sharing App (POC)

A note-taking app with **secure, expiring share links**. One-time or time-based. Public or password-protected.
Built as a full-stack TypeScript app: **Next.js (App Router) + Hono.js + MongoDB (Mongoose) + Tailwind CSS + shadcn/ui-style components**.

## Tech Stack

| Layer     | Choice                                             |
|-----------|----------------------------------------------------|
| Frontend  | Next.js 15 (App Router, Client Components), TypeScript, Tailwind CSS, shadcn/ui-style UI primitives |
| API       | Hono.js mounted on Next.js Route Handlers (`/api/[[...route]]`) |
| Database  | MongoDB via Mongoose (connection-cached for serverless) |
| Auth      | JWT (jose, HS256) in HttpOnly cookie, scrypt-hashed passwords |
| Validation| zod on every write endpoint                        |

MongoDB is a good fit here: share-link claiming is a single-document atomic operation, which makes the race-condition handling trivial (see below).

## Setup

```bash
# 1. Prereqs: Node 18+, a MongoDB instance (local or Atlas)
# 2. Install deps
npm install

# 3. Configure environment
cp .env.example .env.local
#   MONGODB_URI=mongodb://127.0.0.1:27017/note-share
#   JWT_SECRET=<any long random string, 32+ chars>
#   NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. Run
npm run dev
# App: http://localhost:3000
```

No migration step is needed — Mongoose creates collections/indexes lazily (the `token` unique index is declared in the schema).

## Pages

| Route         | Purpose                                        |
|---------------|------------------------------------------------|
| `/register`   | Create account                                 |
| `/login`      | Login (HttpOnly JWT cookie)                    |
| `/notes`      | List my notes (extra convenience page)         |
| `/notes/new`  | Create note + share link, shows link & key once|
| `/notes/[id]` | Note detail: view count per link, revoke links |
| `/share/[token]` | Public/password unlock flow, one-time expiry |

## Database Schema

### `users`
```json
{
  "name": "string",
  "email": "string (unique, lowercased, indexed)",
  "passwordHash": "scrypt salt:hash",
  "createdAt": "date"
}
```

### `notes`
```json
{
  "ownerId": "ObjectId -> users (indexed)",
  "title": "string, max 200",
  "content": "string, max 10000",
  "createdAt": "date"
}
```

### `shares`
```json
{
  "noteId":   "ObjectId -> notes (indexed)",
  "ownerId":  "ObjectId -> users (indexed)",
  "token":    "string (unique, indexed) — 192-bit random, base64url",
  "shareType":"one_time | time_based",
  "accessType":"public | password",
  "passwordHash": "scrypt salt:hash (only if password)",
  "expiryAt": "date (required if time_based)",
  "usedAt":   "date (set on first successful access; one_time)",
  "revokedAt":"date (set by owner force-invalidate)",
  "viewCount":"number (default 0)",
  "attempts": "number (failed password attempts)",
  "lockedUntil": "date (brute-force lockout)",
  "createdAt":"date"
}
```

## Share Link Flow

1. User creates a note (title, content) + share config (shareType, accessType, expiry, optional password).
2. Server generates `token = randomBytes(24).toString('base64url')` (~32 chars, 192 bits of entropy) and stores the share.
3. If password-protected and no password was supplied, server auto-generates a **dynamic access key** (`randomBytes(6).toString('base64url')`, 8 chars) — hashed with scrypt before storage; the plaintext key is returned to the creator **exactly once** in the creation response.
4. Creator copies `https://app/share/<token>` (+ key if password-protected) and sends it to the recipient.
5. Recipient opens `/share/[token]`: the page fetches link metadata (status/type only — never the note). If `public`, it auto-unlocks. If `password`, a key prompt is shown.
6. `POST /api/shares/:token/unlock` validates state machine order → claims the link atomically → returns the note content.

## Password / Key Generation Logic

- **Tokens** (in the URL): `crypto.randomBytes(24)` → `base64url`. Cryptographically unguessable; the share lookup is by exact unique token, never enumerable.
- **Access keys** (typed by humans): `crypto.randomBytes(6)` → `base64url` (8 chars, ~48 bits). Enough for a single-use/short-lived link, human-typeable.
- **Storage**: keys/passwords are never stored in plaintext. `scrypt(secret, salt, 32)` → stored as `salt:hash`, compared with `timingSafeEqual` (constant-time, no timing oracle).

## Expiry Logic

- **Time-based**: `expiryAt` required at creation (zod rejects past dates). Checked at every access: `shareStatus()` short-circuits with `410` before any unlock.
- **One-time**: expiry is the *first successful unlock*. `usedAt` is set inside the atomic claim; subsequent requests see `used` and get `410 "already been used"`.

## Invalidate / Revoke Logic

`POST /api/shares/:shareId/revoke` (auth required, owner-only):
```ts
Share.findOneAndUpdate(
  { _id: shareId, ownerId: session.userId, revokedAt: null },
  { $set: { revokedAt: new Date() } }
)
```
Idempotent (already-revoked → 404). Revoked links return `403` to viewers, and the atomic claim filter includes `revokedAt: null`, so even in-flight requests lose the race.

## View Count Logic

Increment happens **only** inside the atomic claim:

| Event                     | viewCount |
|---------------------------|-----------|
| Public view               | +1        |
| Successful password unlock| +1        |
| Wrong password            | unchanged (+1 `attempts`) |
| Expired link              | unchanged (410, before claim) |
| Revoked link              | unchanged (403, before claim) |
| One-time already used     | unchanged (410, before claim) |

`$inc: { viewCount: 1 }` is atomic at the MongoDB document level — concurrent increments never lose updates.

## Race-Condition Handling

The one-time claim is a single atomic find-and-modify with a guard that only matches a still-claimable link:

```ts
const claimed = await Share.findOneAndUpdate(
  { _id: share._id, revokedAt: null, usedAt: null },   // guard
  { $set: { usedAt: new Date() }, $inc: { viewCount: 1 } },
  { new: true }
);
if (!claimed) return 410; // someone else won the race
```

MongoDB applies a single document update atomically server-side — there is no read-then-write window, so **N simultaneous requests on a one-time link produce exactly 1 winner and N−1 `410` responses**, with `viewCount` incremented exactly once. If the claim fails, the code re-reads the document to return the precise reason (used/expired/revoked).

## Security & Brute-Force Protection

- 5 wrong keys → 5-minute lockout (`lockedUntil`), attempts counter reset; lock is checked before any hash comparison.
- Constant-time hash comparison (no timing oracle).
- All inputs validated with zod (lengths, enums, ISO dates, future-date check).
- HttpOnly + SameSite=Lax session cookie; no tokens in localStorage.
- Share metadata endpoint leaks nothing about the note (no title/content before unlock).

---

## Assessment Questions

**1. How do you prevent two users from using a one-time link at the same time?**
The claim is a single atomic `findOneAndUpdate` guarded by `usedAt: null` (plus `revokedAt: null` / `expiryAt > now`). MongoDB executes it atomically server-side: exactly one concurrent request matches the filter and wins; the rest get `null` back and receive `410 Already used`. There is no check-then-set window, and `usedAt` + `viewCount` are written in the same operation.

**2. How do you update view count safely?**
`$inc: { viewCount: 1 }` inside the same atomic claim operation. `$inc` is atomic per document in MongoDB, so concurrent successful unlocks serialize on the document — no lost updates, and the count can only change together with a legitimate claim (wrong passwords, expired/revoked links return before the claim stage).

**3. How would this work if 1 million people opened the link?**
- A one-time link still grants exactly 1 view: 1 winner, 999,999 get `410` — the atomic claim is O(1) on an indexed unique `_id`.
- Hot-document contention on one link is bounded by MongoDB's per-document write serialization; for extreme fan-out you'd shard by share `_id` (MongoDB shard key), add a caching layer (Redis) for the status/metadata endpoint (immutable until claimed), rate-limit `/unlock` per IP, and serve static note content via CDN after first claim. The design itself (token-indexed lookups, atomic ops) needs no algorithmic change to scale.
- For time-based public links, reads are cheap indexed lookups and writes are single `$inc`s; horizontal scaling = more app replicas (stateless JWT) + read replicas, since view counts tolerate brief replication lag.

**4. How would you prevent brute-force attempts on password-protected links?**
Three layers: (a) **lockout** — 5 failed attempts locks the link for 5 minutes (`lockedUntil`, enforced before hashing); (b) **rate limiting per IP** at the edge/gateway for the `/unlock` endpoint; (c) the key space (48-bit random keys) + constant-time scrypt comparison makes online guessing impractical anyway — 5 attempts per 5 minutes per link caps an attacker at ~1,440 guesses/day/link against a 2^48 space. Optionally add exponential backoff and CAPTCHA after repeated lockouts.

## Demo Script (matches the required demo video)

1. Register + login.
2. Create a **public, time-based** note → show generated link.
3. Open link in an incognito window → note opens without password → view count = 1.
4. Create a **password-protected** note (empty password field) → show **auto-generated dynamic key**.
5. Open link → key prompt → enter **wrong key** → error, attempts-left message, view count unchanged.
6. Enter **correct key** → note unlocks → view count = 1.
7. Create a **one-time** note → open it once (success) → open again → **"already been used"**, count stays 1.
8. Create a **time-based** note with a 1-minute expiry → wait → open → **expired**.
9. Open an **invalid** token URL → 404 message.
10. From `/notes/[id]`, hit **Revoke** → open link → **revoked** message.
11. Show view counts on the owner's note page (public +1, unlock +1, wrong password +0, expired/revoked +0).
#   N o t e - S h a r i n g - A p p  
 