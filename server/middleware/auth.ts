import { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import {
  completeInviteSchema,
  createInviteSchema,
  insertUserSchema,
  loginSchema,
  mfaEnableSchema,
  mfaVerifySchema,
} from "@shared/schema";
import { storage } from "../storage";
import {
  buildOtpauthUri,
  buildQrDataUrl,
  consumeRecoveryCode,
  createMfaChallengeToken,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  toPublicUser,
  verifyMfaChallengeToken,
  verifyTotpCode,
} from "../services/totpService";
import {
  buildInviteUrl,
  createInviteToken,
  verifyInviteToken,
} from "../services/inviteService";
import { compare, hash } from "bcrypt";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: number;
    mfaVerified?: boolean;
  }
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return await compare(password, passwordHash);
}

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session?.userId && req.session.mfaVerified) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export async function registerHandler(req: Request, res: Response) {
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return res.status(403).json({ message: "Registration is disabled" });
  }

  try {
    const parsedData = insertUserSchema.safeParse(req.body);
    if (!parsedData.success) {
      const validationError = fromZodError(parsedData.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const { username, email, password } = parsedData.data;

    if (await storage.getUserByEmail(email)) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (await storage.getUserByUsername(username)) {
      return res.status(400).json({ message: "Username already in use" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
    });

    req.session.userId = user.id;
    req.session.mfaVerified = false;

    res.status(201).json({
      user: toPublicUser(user),
      needsMfaSetup: true,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
}

/**
 * Create an invited admin (authenticated + MFA).
 * Returns a one-time onboarding URL; the invitee chooses their password, then MFA.
 */
export async function createAdminInviteHandler(req: Request, res: Response) {
  try {
    const parsedData = createInviteSchema.safeParse(req.body);
    if (!parsedData.success) {
      const validationError = fromZodError(parsedData.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const email = parsedData.data.email.toLowerCase().trim();
    const username =
      parsedData.data.username?.trim() || email.split("@")[0] || "admin";

    if (await storage.getUserByEmail(email)) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (await storage.getUserByUsername(username)) {
      return res.status(400).json({
        message: "Username already in use — pass a different username",
      });
    }

    // Placeholder password; invitee sets a real one during onboarding
    const placeholder = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const user = await storage.createUser({
      username,
      email,
      password: placeholder,
      invitePending: true,
    });

    const token = createInviteToken(user.id);
    const inviteUrl = buildInviteUrl(token);

    res.status(201).json({
      user: toPublicUser(user),
      inviteUrl,
      expiresInDays: 7,
    });
  } catch (error) {
    console.error("Error creating admin invite:", error);
    res.status(500).json({ message: "Failed to create invite" });
  }
}

/** Public: resolve invite token to email for the onboarding page. */
export async function getInviteHandler(req: Request, res: Response) {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const userId = verifyInviteToken(token);
    if (!userId) {
      return res.status(403).json({ message: "Invalid or expired invite link" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.invitePending) {
      return res.status(403).json({
        message: "This invite is no longer valid",
      });
    }

    res.json({
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    console.error("Error loading invite:", error);
    res.status(500).json({ message: "Failed to load invite" });
  }
}

/** Public: set password from invite, then start MFA enrollment session. */
export async function completeInviteHandler(req: Request, res: Response) {
  try {
    const parsed = completeInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      const validationError = fromZodError(parsed.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const userId = verifyInviteToken(parsed.data.token);
    if (!userId) {
      return res.status(403).json({ message: "Invalid or expired invite link" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.invitePending) {
      return res.status(403).json({
        message: "This invite is no longer valid",
      });
    }

    const hashedPassword = await hashPassword(parsed.data.password);
    const updated = await storage.updateUserPassword(user.id, hashedPassword, {
      clearInvitePending: true,
    });
    if (!updated) {
      return res.status(500).json({ message: "Failed to set password" });
    }

    req.session.userId = updated.id;
    req.session.mfaVerified = false;

    res.json({
      user: toPublicUser(updated),
      needsMfaSetup: true,
    });
  } catch (error) {
    console.error("Error completing invite:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsedData = loginSchema.safeParse(req.body);
    if (!parsedData.success) {
      const validationError = fromZodError(parsedData.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const { email, password } = parsedData.data;
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.invitePending) {
      return res.status(403).json({
        message:
          "Account setup is incomplete. Open the invite link to choose a password and set up authenticator.",
      });
    }

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.totpEnabled && user.totpSecret) {
      // Do not grant a session until TOTP succeeds
      return res.json({
        mfaRequired: true,
        mfaToken: createMfaChallengeToken(user.id),
      });
    }

    req.session.userId = user.id;
    req.session.mfaVerified = false;

    res.json({
      user: toPublicUser(user),
      needsMfaSetup: true,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
}

export async function mfaVerifyHandler(req: Request, res: Response) {
  try {
    const parsed = mfaVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      const validationError = fromZodError(parsed.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const { mfaToken, code } = parsed.data;
    const userId = verifyMfaChallengeToken(mfaToken);
    if (!userId) {
      return res.status(401).json({ message: "MFA challenge expired or invalid" });
    }

    const user = await storage.getUser(userId);
    if (!user?.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ message: "MFA is not enabled for this user" });
    }

    const secret = decryptSecret(user.totpSecret);
    let verified = verifyTotpCode(secret, code);

    if (!verified) {
      const recovery = await consumeRecoveryCode(
        user.totpRecoveryCodes,
        code,
      );
      if (recovery.ok) {
        verified = true;
        await storage.updateUserTotp(user.id, {
          totpRecoveryCodes: recovery.remaining,
        });
      }
    }

    if (!verified) {
      return res.status(401).json({ message: "Invalid authentication code" });
    }

    req.session.userId = user.id;
    req.session.mfaVerified = true;

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Error verifying MFA:", error);
    res.status(500).json({ message: "Failed to verify MFA" });
  }
}

export async function mfaSetupHandler(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.totpEnabled) {
      return res.status(400).json({ message: "MFA is already enabled" });
    }

    const secret = generateTotpSecret();
    await storage.updateUserTotp(user.id, {
      totpSecret: encryptSecret(secret),
      totpEnabled: false,
    });

    const otpauthUrl = buildOtpauthUri(user.email, secret);
    const qrDataUrl = await buildQrDataUrl(otpauthUrl);

    res.json({
      otpauthUrl,
      qrDataUrl,
      secret,
    });
  } catch (error) {
    console.error("Error setting up MFA:", error);
    res.status(500).json({ message: "Failed to set up MFA" });
  }
}

export async function mfaEnableHandler(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = mfaEnableSchema.safeParse(req.body);
    if (!parsed.success) {
      const validationError = fromZodError(parsed.error);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.totpSecret) {
      return res
        .status(400)
        .json({ message: "Call MFA setup before enabling" });
    }

    const secret = decryptSecret(user.totpSecret);
    if (!verifyTotpCode(secret, parsed.data.code)) {
      return res.status(401).json({ message: "Invalid authentication code" });
    }

    const { plain, hashed } = await generateRecoveryCodes();
    await storage.updateUserTotp(user.id, {
      totpEnabled: true,
      totpRecoveryCodes: hashed,
    });

    req.session.mfaVerified = true;

    res.json({
      user: toPublicUser({ ...user, totpEnabled: true }),
      recoveryCodes: plain,
    });
  } catch (error) {
    console.error("Error enabling MFA:", error);
    res.status(500).json({ message: "Failed to enable MFA" });
  }
}

export function logoutHandler(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return res.status(500).json({ message: "Failed to log out" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
}

export async function getCurrentUserHandler(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      ...toPublicUser(user),
      mfaVerified: Boolean(req.session.mfaVerified),
      needsMfaSetup: !user.totpEnabled,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Failed to get current user" });
  }
}
