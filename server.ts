import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Backend Supabase configuration - KEEP THE SECRETS SAFE!
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://emcynvexbauhohpwcqaw.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MQxqdtD5HRHHsIxhmIjHrQ_XS4jyXWh';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Initialize server-side Supabase client (used for anon/client level ops)
  const supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Initialize privileged Supabase admin client if service role key is available
  const supabaseAdminClient = SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

  // API Route: Get Public Config safely (only the URL and Anon Key if requested, or we can proxy entirely to hide them!)
  app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      hasAdminKey: !!SUPABASE_SERVICE_ROLE_KEY
    });
  });

  // API Route: Real authentication login proxy
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data, error } = await supabaseServerClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Onboard new user (SaaS client)
  app.post("/api/admin/onboard", async (req, res) => {
    const { email, password, fullName, company, domainPrefix, industry } = req.body;
    
    if (!email || !password || !fullName || !domainPrefix) {
      return res.status(400).json({ error: "Missing required onboarding fields" });
    }

    try {
      let authUserId = "";

      if (supabaseAdminClient) {
        // Admin Client is available! Use admin auth API to create user without logging out the administrator.
        const { data, error } = await supabaseAdminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email is highly useful to skip validation
          user_metadata: {
            full_name: fullName,
            company,
            domain_prefix: domainPrefix
          }
        });

        if (error) {
          return res.status(400).json({ error: error.message });
        }
        authUserId = data.user?.id || "";
      } else {
        // Fallback: signUp with normal auth client using persistSession: false
        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false }
        });
        const { data, error } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company,
              domain_prefix: domainPrefix
            }
          }
        });

        if (error) {
          return res.status(400).json({ error: error.message });
        }
        authUserId = data.user?.id || "";
      }

      return res.json({
        success: true,
        userId: authUserId,
        message: "User registered successfully in Supabase backend."
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to onboard customer." });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
