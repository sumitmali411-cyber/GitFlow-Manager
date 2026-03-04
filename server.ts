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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "gitflow-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
      },
    })
  );

  // Notification Endpoint
  app.post("/api/notify/assignment", async (req, res) => {
    const { email, issueTitle, issueUrl, repoName } = req.body;
    
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
        subject: `New Issue Assigned: ${issueTitle}`,
        text: `You have been assigned a new issue in ${repoName}.\n\nTitle: ${issueTitle}\nLink: ${issueUrl}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Issue Assigned</h2>
            <p>You have been assigned a new issue in <strong>${repoName}</strong>.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000;">
              <h3 style="margin-top: 0; color: #000;">${issueTitle}</h3>
              <p style="color: #666; font-size: 14px;">A new task has been assigned to you. Click the button below to view the details on GitHub.</p>
              <a href="${issueUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Issue on GitHub</a>
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
      
      res.status(500).json({ 
        error: "EMAIL_SEND_FAILED", 
        message: `Failed to send email: ${error.message}. Check server logs for full details.`,
        details: error.code
      });
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
      res.status(500).json({ 
        configured: false, 
        error: "VERIFICATION_FAILED", 
        message: `SMTP verification failed: ${error.message}` 
      });
    }
  });

  // GitHub OAuth Routes
  app.get("/api/auth/url", (_req, res) => {
    const redirectUri = `${process.env.APP_URL || `http://localhost:${PORT}`}/auth/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "repo user security_events",
      state: Math.random().toString(36).substring(7),
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
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
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${access_token}' }, '*');
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
  app.get("/api/github/*", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const githubPath = (req.params as any)[0];
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

  app.post("/api/github/*", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const githubPath = (req.params as any)[0];
    
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

  app.patch("/api/github/*", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const githubPath = (req.params as any)[0];
    
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
