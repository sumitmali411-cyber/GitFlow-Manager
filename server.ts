import crypto from "crypto";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/** Escapes text before it is interpolated into an HTML email body. */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Strips CR/LF and caps length. Values reaching a mail Subject must not be
 * able to introduce new header lines.
 */
function headerSafe(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 200);
}

/** Only allow links to real http(s) URLs in outgoing email. */
function safeHttpUrl(value: unknown): string {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : "#";
  } catch {
    return "#";
  }
}

/**
 * The proxy path is caller-controlled and concatenated onto the GitHub API
 * base. Reject anything that could change the target (scheme, authority,
 * traversal) so the user's token is only ever sent to api.github.com.
 */
function isSafeGitHubPath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 512) return false;
  if (value.startsWith("/") || value.includes("//") || value.includes("..")) return false;
  if (value.includes("@") || value.includes("\\") || value.includes(":")) return false;
  return /^[A-Za-z0-9._~\-\/%]+$/.test(value);
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const APP_ORIGIN = process.env.APP_URL || `http://localhost:${PORT}`;

  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    console.error(
      "SESSION_SECRET is not set. Generate one with: openssl rand -hex 32",
    );
    process.exit(1);
  }

  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    );
    next();
  });

  // Reject oversized bodies before they are buffered into memory.
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        // "none" requires Secure, which breaks plain-http local dev. The OAuth
        // popup posts back to this same origin, so "lax" is sufficient.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
      },
    })
  );

  // The mail endpoints below send to a caller-supplied address with
  // caller-supplied content. Unauthenticated, that is an open relay: anyone
  // could send mail from this SMTP account to anyone. Require a token that
  // GitHub actually recognises, and rate limit per token.
  const tokenCache = new Map<string, { login: string; checkedAt: number }>();
  const TOKEN_TTL_MS = 5 * 60_000;

  const mailHits = new Map<string, { count: number; resetAt: number }>();
  const MAIL_RATE_MAX = 20;
  const MAIL_RATE_WINDOW_MS = 60_000;

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of mailHits) if (now >= v.resetAt) mailHits.delete(k);
    for (const [k, v] of tokenCache) if (now - v.checkedAt > TOKEN_TTL_MS) tokenCache.delete(k);
  }, MAIL_RATE_WINDOW_MS).unref();

  async function requireGitHubUser(req: any, res: any, next: any) {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: "Unauthorized" });

    const key = crypto.createHash("sha256").update(authorization).digest("hex");
    const cached = tokenCache.get(key);

    if (!cached || Date.now() - cached.checkedAt > TOKEN_TTL_MS) {
      try {
        const me = await axios.get("https://api.github.com/user", {
          headers: {
            Authorization: authorization,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitFlow-Manager-App",
          },
        });
        tokenCache.set(key, { login: me.data?.login, checkedAt: Date.now() });
      } catch {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const now = Date.now();
    const bucket = mailHits.get(key);
    if (!bucket || now >= bucket.resetAt) {
      mailHits.set(key, { count: 1, resetAt: now + MAIL_RATE_WINDOW_MS });
    } else if (++bucket.count > MAIL_RATE_MAX) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    next();
  }

  // Generic Notification Endpoint
  app.post("/api/notify/event", requireGitHubUser, async (req, res) => {
    const { email, type, data } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const payload = (data && typeof data === "object") ? data : {};
    const rawTitle = headerSafe(payload.title);
    const rawRepoName = headerSafe(payload.repoName);
    const safeTitle = escapeHtml(rawTitle);
    const safeUrl = safeHttpUrl(payload.url);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
      return res.status(400).json({ error: "SMTP_NOT_CONFIGURED" });
    }

    let subject = "";
    let content = "";

    switch (type) {
      case 'issue_activity':
        subject = `Activity on Watched Issue: ${rawTitle}`;
        content = `There is new activity on an issue you are watching in ${rawRepoName}.\n\nTitle: ${rawTitle}\nLink: ${safeUrl}`;
        break;
      case 'pr_merged':
        subject = `PR Merged: ${rawTitle}`;
        content = `Your Pull Request has been merged in ${rawRepoName}!\n\nTitle: ${rawTitle}\nLink: ${safeUrl}`;
        break;
      case 'issue_assigned':
        subject = `New Issue Assigned: ${rawTitle}`;
        content = `You have been assigned a new issue in ${rawRepoName}.\n\nTitle: ${rawTitle}\nLink: ${safeUrl}`;
        break;
      default:
        subject = `GitFlow Notification: ${rawTitle}`;
        content = `Notification for ${rawRepoName}: ${rawTitle}\nLink: ${safeUrl}`;
    }

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: `"GitFlow Manager" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        text: content,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 10px;">${escapeHtml(subject)}</h2>
            <p>${escapeHtml(content.split('\n\n')[0])}</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000;">
              <h3 style="margin-top: 0; color: #000;">${safeTitle}</h3>
              <p style="color: #666; font-size: 14px;">Click the button below to view the details on GitHub.</p>
              <a href="${safeUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View on GitHub</a>
            </div>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email send failed:", error);
      res.status(500).json({ error: "EMAIL_SEND_FAILED" });
    }
  });

  // Notification Endpoint (Legacy/Specific)
  app.post("/api/notify/assignment", requireGitHubUser, async (req, res) => {
    const { email, issueTitle, issueUrl, repoName } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const rawIssueTitle = headerSafe(issueTitle);
    const safeIssueTitle = escapeHtml(rawIssueTitle);
    const safeRepoName = escapeHtml(headerSafe(repoName));
    const safeIssueUrl = safeHttpUrl(issueUrl);
    
    console.log(`Attempting to send email to ${email} for issue: ${issueTitle}`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
      console.error("SMTP Configuration Missing: Please ensure SMTP_USER, SMTP_PASS, and SMTP_HOST are set in environment variables.");
      return res.status(400).json({ 
        error: "SMTP_NOT_CONFIGURED", 
        message: "Email notifications are not configured on the server. Please set SMTP_USER, SMTP_PASS, and SMTP_HOST environment variables." 
      });
    }

    try {
      // Verify connection configuration
      await transporter.verify();
      
      const info = await transporter.sendMail({
        from: `"GitFlow Manager" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `New Issue Assigned: ${rawIssueTitle}`,
        text: `You have been assigned a new issue in ${headerSafe(repoName)}.\n\nTitle: ${rawIssueTitle}\nLink: ${safeIssueUrl}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Issue Assigned</h2>
            <p>You have been assigned a new issue in <strong>${safeRepoName}</strong>.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000;">
              <h3 style="margin-top: 0; color: #000;">${safeIssueTitle}</h3>
              <p style="color: #666; font-size: 14px;">A new task has been assigned to you. Click the button below to view the details on GitHub.</p>
              <a href="${safeIssueUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Issue on GitHub</a>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
              This is an automated notification from your GitFlow Manager instance. 
              If you believe this was sent in error, please contact your project administrator.
            </p>
          </div>
        `,
      });
      
      console.log("Email sent successfully:", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("SMTP Error Details:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      
      res.status(500).json({ error: "EMAIL_SEND_FAILED" });
    }
  });

  // Verify SMTP Configuration Endpoint
  app.get("/api/notify/verify", async (_req, res) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
      return res.status(400).json({ 
        configured: false, 
        error: "SMTP_NOT_CONFIGURED", 
        message: "SMTP configuration is missing." 
      });
    }

    try {
      await transporter.verify();
      res.json({ configured: true, message: "SMTP connection verified successfully." });
    } catch (error: any) {
      console.error("SMTP Verification Failed:", error.message);
      res.status(500).json({ configured: false, error: "VERIFICATION_FAILED" });
    }
  });

  // GitHub OAuth Routes
  app.get("/api/auth/url", (req, res) => {
    const redirectUri = `${APP_ORIGIN}/auth/callback`;

    // Math.random is not cryptographically secure, and the previous state was
    // never stored, so it could not be verified on the way back. Both are
    // required for the state parameter to actually prevent OAuth CSRF.
    const state = crypto.randomBytes(32).toString("hex");
    (req.session as any).oauthState = state;

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "repo user security_events",
      state,
    });

    req.session.save((err) => {
      if (err) {
        console.error("Failed to persist OAuth state:", err);
        return res.status(500).json({ error: "Failed to start authentication." });
      }
      res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
    });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;

    // Verify the state we issued. Without this, an attacker can feed a victim
    // a callback URL carrying their own code and link the victim's session to
    // the attacker's GitHub account.
    const expectedState = (req.session as any)?.oauthState;
    delete (req.session as any)?.oauthState;

    if (
      typeof state !== "string" ||
      typeof expectedState !== "string" ||
      state.length !== expectedState.length ||
      !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
    ) {
      return res.status(400).send("Invalid authentication state. Please try signing in again.");
    }

    if (typeof code !== "string" || !code) {
      return res.status(400).send("Missing authorization code.");
    }

    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: { Accept: "application/json" },
        }
      );

      const { access_token } = response.data;
      
      // In a real app, you'd store this in a session or secure cookie
      // For this demo, we'll pass it back to the client via postMessage
      if (!access_token) {
        return res.status(502).send("Authentication failed.");
      }

      // Target origin is this app, never "*": a wildcard hands the access
      // token to whatever page happens to be window.opener. JSON.stringify
      // rather than raw interpolation so the value cannot break out of the
      // script context.
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage(
                  { type: 'OAUTH_AUTH_SUCCESS', token: ${JSON.stringify(access_token)} },
                  ${JSON.stringify(APP_ORIGIN)}
                );
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Proxy GitHub API requests
  app.get("/api/github/*githubPath", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const rawPath = (req.params as any).githubPath;
    const githubPath = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath ?? "");
    if (!isSafeGitHubPath(githubPath)) {
      return res.status(400).json({ error: "Invalid GitHub path" });
    }
    const query = new URLSearchParams(req.query as any).toString();
    
    try {
      const response = await axios.get(`https://api.github.com/${githubPath}${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: token,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitFlow-Manager-App"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      // Handle Dependabot alerts specifically - return empty list if not available/no permission
      if (githubPath.includes('dependabot/alerts') && (error.response?.status === 404 || error.response?.status === 403 || error.response?.status === 410)) {
        console.warn(`Dependabot alerts not available for ${githubPath} (Status: ${error.response?.status})`);
        return res.json([]);
      }
      
      console.error(`GitHub API Error (${githubPath}):`, error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "GitHub API error" });
    }
  });

  app.post("/api/github/*githubPath", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const rawPath = (req.params as any).githubPath;
    const githubPath = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath ?? "");
    if (!isSafeGitHubPath(githubPath)) {
      return res.status(400).json({ error: "Invalid GitHub path" });
    }

    try {
      const response = await axios.post(`https://api.github.com/${githubPath}`, req.body, {
        headers: {
          Authorization: token,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitFlow-Manager-App"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error(`GitHub API Error (${githubPath}):`, error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "GitHub API error" });
    }
  });

  app.patch("/api/github/*githubPath", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const rawPath = (req.params as any).githubPath;
    const githubPath = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath ?? "");
    if (!isSafeGitHubPath(githubPath)) {
      return res.status(400).json({ error: "Invalid GitHub path" });
    }

    try {
      const response = await axios.patch(`https://api.github.com/${githubPath}`, req.body, {
        headers: {
          Authorization: token,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitFlow-Manager-App"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error(`GitHub API Error (${githubPath}):`, error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "GitHub API error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    // Express 5 / path-to-regexp 8 rejects a bare '*' pattern.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
