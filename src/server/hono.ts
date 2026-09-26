import { Hono } from "hono";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Note } from "@/models/Note";
import { Share } from "@/models/Share";
import {
  hashSecret,
  verifySecret,
  generateShareToken,
  generateAccessKey,
} from "@/lib/crypto";
import { signSession, getSessionFromRequest, SESSION_COOKIE } from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  createNoteSchema,
  unlockSchema,
} from "@/lib/validate";

const MAX_PASSWORD_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function shareStatus(share: any): "active" | "expired" | "revoked" | "used" {
  const now = Date.now();
  if (share.revokedAt) return "revoked";
  if (
    share.shareType === "time_based" &&
    share.expiryAt &&
    share.expiryAt.getTime() <= now
  )
    return "expired";
  if (share.shareType === "one_time" && share.usedAt) return "used";
  return "active";
}

export const app = new Hono().basePath("/api");

// ---------------- AUTH ----------------
app.post("/auth/register", async (c) => {
  await connectDB();
  const parsed = registerSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { name, email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing)
    return jsonError("An account with this email already exists", 409);

  const user = await User.create({
    name,
    email,
    passwordHash: hashSecret(password),
  });
  const token = await signSession({ userId: user._id.toString(), email });
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
  );
  return c.json({ user: { id: user._id, name: user.name, email: user.email } });
});

app.post("/auth/login", async (c) => {
  await connectDB();
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid email or password", 400);
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user || !verifySecret(password, user.passwordHash)) {
    return jsonError("Invalid email or password", 401);
  }
  const token = await signSession({ userId: user._id.toString(), email });
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
  );
  return c.json({ user: { id: user._id, name: user.name, email: user.email } });
});

app.post("/auth/logout", (c) => {
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
  return c.json({ ok: true });
});

// ---------------- NOTES ----------------
app.post("/notes", async (c) => {
  const session = await getSessionFromRequest(c.req.raw);
  if (!session) return jsonError("Unauthorized", 401);
  await connectDB();

  const parsed = createNoteSchema.safeParse(
    await c.req.json().catch(() => ({})),
  );
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { title, content, shareType, accessType, expiryAt, password } =
    parsed.data;

  // Create note + share atomically-ish (note first, share second; token is unique-indexed)
  const note = await Note.create({ ownerId: session.userId, title, content });

  let accessKey: string | undefined;
  let passwordHash: string | undefined;
  if (accessType === "password") {
    accessKey = password ?? generateAccessKey(); // dynamic key generation
    passwordHash = hashSecret(accessKey);
  }

  const share = await Share.create({
    noteId: note._id,
    ownerId: session.userId,
    token: generateShareToken(),
    shareType,
    accessType,
    passwordHash,
    expiryAt: shareType === "time_based" ? new Date(expiryAt!) : undefined,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(c.req.url).origin;
  return c.json(
    {
      note: { id: note._id, title: note.title, content: note.content },
      share: {
        id: share._id,
        token: share.token,
        url: `${baseUrl}/share/${share.token}`,
        shareType: share.shareType,
        accessType: share.accessType,
        expiryAt: share.expiryAt,
        accessKey, // returned ONCE to the creator
      },
    },
    201,
  );
});

app.get("/notes", async (c) => {
  const session = await getSessionFromRequest(c.req.raw);
  if (!session) return jsonError("Unauthorized", 401);
  await connectDB();
  const notes = await Note.find({ ownerId: session.userId })
    .sort({ createdAt: -1 })
    .lean();
  const shares = await Share.find({ ownerId: session.userId }).lean();
  const sharesByNote = new Map<string, any[]>();
  for (const s of shares) {
    const key = s.noteId.toString();
    if (!sharesByNote.has(key)) sharesByNote.set(key, []);
    sharesByNote.get(key)!.push({
      id: s._id,
      token: s.token,
      shareType: s.shareType,
      accessType: s.accessType,
      expiryAt: s.expiryAt,
      usedAt: s.usedAt,
      revokedAt: s.revokedAt,
      viewCount: s.viewCount,
      createdAt: s.createdAt,
    });
  }
  return c.json({
    notes: notes.map((n) => ({
      id: n._id,
      title: n.title,
      createdAt: n.createdAt,
      shares: sharesByNote.get(n._id.toString()) ?? [],
    })),
  });
});

app.get("/notes/:id", async (c) => {
  const session = await getSessionFromRequest(c.req.raw);
  if (!session) return jsonError("Unauthorized", 401);
  await connectDB();
  const note = await Note.findById(c.req.param("id"));
  if (!note) return jsonError("Note not found", 404);
  if (note.ownerId.toString() !== session.userId)
    return jsonError("Forbidden", 403);
  const shares = await Share.find({ noteId: note._id }).lean();
  return c.json({
    note: {
      id: note._id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
    },
    shares: shares.map((s) => ({
      id: s._id,
      token: s.token,
      shareType: s.shareType,
      accessType: s.accessType,
      expiryAt: s.expiryAt,
      usedAt: s.usedAt,
      revokedAt: s.revokedAt,
      viewCount: s.viewCount,
      createdAt: s.createdAt,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${s.token}`,
    })),
  });
});

app.delete("/notes/:id", async (c) => {
  const session = await getSessionFromRequest(c.req.raw);
  if (!session) return jsonError("Unauthorized", 401);
  await connectDB();
  const note = await Note.findById(c.req.param("id"));
  if (!note) return jsonError("Note not found", 404);
  if (note.ownerId.toString() !== session.userId)
    return jsonError("Forbidden", 403);
  await Share.deleteMany({ noteId: note._id });
  await Note.deleteOne({ _id: note._id });
  return c.json({ ok: true });
});

// ---------------- REVOKE ----------------
app.post("/shares/:shareId/revoke", async (c) => {
  const session = await getSessionFromRequest(c.req.raw);
  if (!session) return jsonError("Unauthorized", 401);
  await connectDB();
  // Atomic: only revokes if not already revoked
  const share = await Share.findOneAndUpdate(
    { _id: c.req.param("shareId"), ownerId: session.userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );
  if (!share) return jsonError("Share link not found or already revoked", 404);
  return c.json({ ok: true, revokedAt: share.revokedAt });
});

// ---------------- PUBLIC SHARE ENDPOINTS ----------------
app.get("/shares/:token", async (c) => {
  await connectDB();
  const share = await Share.findOne({ token: c.req.param("token") }).lean();
  if (!share) return jsonError("Invalid share link", 404);
  return c.json({
    status: shareStatus(share),
    shareType: share.shareType,
    accessType: share.accessType,
    requiresKey: share.accessType === "password",
    expiryAt: share.expiryAt ?? null,
    locked: share.lockedUntil
      ? share.lockedUntil.getTime() > Date.now()
      : false,
  });
});

app.post("/shares/:token/unlock", async (c) => {
  await connectDB();
  const parsed = unlockSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const key = parsed.data.key;

  const share = await Share.findOne({ token: c.req.param("token") });
  if (!share) return jsonError("Invalid share link", 404);

  const status = shareStatus(share);
  if (status === "revoked")
    return jsonError("This link has been revoked by the owner", 403);
  if (status === "expired") return jsonError("This link has expired", 410);
  if (status === "used")
    return jsonError("This one-time link has already been used", 410);

  // ---- password gate ----
  if (share.accessType === "password") {
    if (share.lockedUntil && share.lockedUntil.getTime() > Date.now()) {
      const secs = Math.ceil((share.lockedUntil.getTime() - Date.now()) / 1000);
      return jsonError(`Too many failed attempts. Try again in ${secs}s`, 429);
    }
    if (!key) return jsonError("Access key is required", 400);
    if (!verifySecret(key, share.passwordHash!)) {
      // count failed attempt, lock after MAX_PASSWORD_ATTEMPTS
      share.attempts += 1;
      if (share.attempts >= MAX_PASSWORD_ATTEMPTS) {
        share.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        share.attempts = 0;
      }
      await share.save(); // no viewCount change on wrong password
      const left = share.lockedUntil
        ? 0
        : MAX_PASSWORD_ATTEMPTS - share.attempts;
      return jsonError(
        share.lockedUntil
          ? `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes`
          : `Wrong access key (${left} attempts left)`,
        401,
      );
    }
    share.attempts = 0;
  }

  // ---- ATOMIC CLAIM (race-condition safe) ----
  // Only succeeds if the link is still claimable; if another request won the race, this returns null.
  const filter: any = { _id: share._id, revokedAt: null };
  if (share.shareType === "one_time") filter.usedAt = null;
  if (share.shareType === "time_based") filter.expiryAt = { $gt: new Date() };

  const claimed = await Share.findOneAndUpdate(
    filter,
    { $set: { usedAt: new Date() }, $inc: { viewCount: 1 } },
    { new: true },
  );

  if (!claimed) {
    // Re-check why the claim failed so we can return the right message
    const fresh = await Share.findById(share._id).lean();
    const s = fresh ? shareStatus(fresh) : "revoked";
    if (s === "used")
      return jsonError("This one-time link has already been used", 410);
    if (s === "expired") return jsonError("This link has expired", 410);
    return jsonError("This link has been revoked by the owner", 403);
  }

  const note = await Note.findById(share.noteId).lean();
  if (!note) return jsonError("Note not found", 404);
  return c.json({
    title: note.title,
    content: note.content,
    viewCount: claimed.viewCount,
  });
});

export type AppType = typeof app;
