import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).transform(e => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255).transform(e => e.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().trim().min(1, "Content is required").max(10000),
  shareType: z.enum(["one_time", "time_based"]),
  accessType: z.enum(["public", "password"]),
  expiryAt: z.string().datetime({ offset: true }).optional(),
  password: z.string().min(4).max(128).optional()
}).superRefine((data, ctx) => {
  if (data.shareType === "time_based") {
    if (!data.expiryAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiryAt"], message: "Expiry is required for time-based links" });
    } else if (new Date(data.expiryAt).getTime() <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiryAt"], message: "Expiry must be in the future" });
    }
  }
  if (data.accessType === "password" && data.password === undefined) {
    // allowed: key will be auto-generated server-side
  }
});

export const unlockSchema = z.object({
  key: z.string().max(128).optional()
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
