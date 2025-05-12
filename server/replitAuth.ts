import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

// Make sure environment variables exist or provide defaults
const REPL_ID = process.env.REPL_ID;
const REPLIT_DOMAINS = process.env.REPLIT_DOMAINS || "";

if (!REPL_ID) {
  console.warn("REPL_ID environment variable not found. Authentication may not work correctly.");
}

if (!REPLIT_DOMAINS) {
  console.warn("REPLIT_DOMAINS environment variable not provided. Using hostname from request.");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-xyz123",
    store: storage.sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      } catch (error) {
        console.error("Error during auth verification:", error);
        verified(error as Error);
      }
    };

    // If REPLIT_DOMAINS is provided, use those domains
    const domains = REPLIT_DOMAINS ? 
      REPLIT_DOMAINS.split(",") : 
      [app.get('host') || 'localhost'];

    for (const domain of domains) {
      const domainWithoutPort = domain.split(':')[0]; // Remove port if present
      console.log(`Setting up Replit auth for domain: ${domainWithoutPort}`);
      
      // Create the strategy for this domain
      const strategy = new Strategy(
        {
          name: `replitauth:${domainWithoutPort}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domainWithoutPort}/api/callback`,
        },
        verify,
      );
      
      passport.use(strategy);
    }
  } catch (error) {
    console.error("Error setting up Replit authentication:", error);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      const hostname = req.hostname.split(':')[0]; // Remove port if present
      const strategyName = `replitauth:${hostname}`;
      
      console.log(`Authenticating with strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      const hostname = req.hostname.split(':')[0]; // Remove port if present
      const strategyName = `replitauth:${hostname}`;
      
      console.log(`Callback for strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/auth",
      })(req, res, next);
    } catch (error) {
      console.error("Error during callback:", error);
      res.redirect("/auth?error=auth_failed");
    }
  });

  app.get("/api/logout", async (req, res) => {
    try {
      let logoutConfig;
      try {
        logoutConfig = await getOidcConfig();
      } catch (error) {
        console.error("Error getting OIDC config for logout:", error);
        req.logout((err) => {
          if (err) console.error("Error during logout:", err);
          res.redirect("/auth");
        });
        return;
      }
      
      const redirectUrl = `${req.protocol}://${req.hostname}`;
      
      req.logout((err) => {
        if (err) {
          console.error("Error during logout:", err);
          return res.redirect("/auth");
        }
        
        // Redirect to the OIDC end session endpoint
        if (REPL_ID && logoutConfig) {
          try {
            const logoutUrl = client.buildEndSessionUrl(logoutConfig, {
              client_id: REPL_ID,
              post_logout_redirect_uri: redirectUrl,
            }).href;
            
            res.redirect(logoutUrl);
          } catch (error) {
            console.error("Error building end session URL:", error);
            res.redirect("/auth");
          }
        } else {
          res.redirect("/auth");
        }
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.redirect("/auth");
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    
    // If no expiration time is set, assume token is valid
    if (!user.expires_at) {
      console.log("No expiration time found in user session, continuing");
      return next();
    }

    // Check if token is still valid
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    console.log("Token expired, attempting to refresh");

    // Attempt to refresh token if we have a refresh token
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      console.log("No refresh token available");
      return res.status(401).json({ message: "Session expired" });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      console.log("Token refreshed successfully");
      return next();
    } catch (error) {
      console.error("Error refreshing token:", error);
      return res.status(401).json({ message: "Session expired, please login again" });
    }
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};