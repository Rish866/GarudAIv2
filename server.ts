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

  // API Route: Execute database migration/setup SQL
  app.post("/api/admin/setup-database", async (req, res) => {
    if (!supabaseAdminClient) {
      return res.status(403).json({ error: "Service role key not configured. Cannot run migrations." });
    }

    try {
      // Seed tenants
      const { error: tenantErr } = await supabaseAdminClient.from('tenants').upsert([
        { id: 'tenant-balaji', name: 'Shree Balaji Logistics', domain: 'balaji.garud.ai', industry: 'Trailer & Container', client_logo_bg: 'from-blue-600 to-indigo-600', total_trips: 480, fuel_saved_litres: 14200, safety_score: 94, billing_due: '₹48,200' },
        { id: 'tenant-hindustan', name: 'Hindustan Tipper & Mining Corp', domain: 'hindustan.garud.ai', industry: 'Hywa & Tipper', client_logo_bg: 'from-amber-600 to-orange-600', total_trips: 1150, fuel_saved_litres: 8900, safety_score: 82, billing_due: '₹32,500' },
        { id: 'tenant-polar', name: 'Polar Cold Chain Reefer Fleets', domain: 'polar.garud.ai', industry: 'Cold Chain', client_logo_bg: 'from-cyan-600 to-teal-500', total_trips: 210, fuel_saved_litres: 4100, safety_score: 97, billing_due: '₹18,900' }
      ], { onConflict: 'id' });

      // Seed users
      const { error: userErr } = await supabaseAdminClient.from('users').upsert([
        { id: 'user-balaji-1', tenant_id: 'tenant-balaji', email: 'admin@balaji.com', password: 'balaji123', name: 'Rajesh Kumar (Fleet Admin)', role: 'admin' },
        { id: 'user-hindustan-1', tenant_id: 'tenant-hindustan', email: 'admin@hindustan.com', password: 'hindustan123', name: 'Birendra Mahto (Mine Supt)', role: 'admin' },
        { id: 'user-polar-1', tenant_id: 'tenant-polar', email: 'admin@polar.com', password: 'polar123', name: 'Kumar Swamy (Cold Chain Exec)', role: 'admin' }
      ], { onConflict: 'id' });

      // Seed vehicles
      const { error: vehErr } = await supabaseAdminClient.from('vehicles').upsert([
        { id: 'balaji-v1', tenant_id: 'tenant-balaji', reg_number: 'HR-55-AJ-9021', driver_name: 'Rajesh Kumar', speed: 68, status: 'Moving', route: 'Delhi Cargo Terminal → Mumbai Nhava Sheva', cameras_active: 4, last_update: 'Just now', lat: '28.6139° N', lng: '77.2090° E' },
        { id: 'balaji-v2', tenant_id: 'tenant-balaji', reg_number: 'MH-43-QQ-1102', driver_name: 'Satish Yadav', speed: 0, status: 'Stopped', route: 'Pune Industrial Area → Hyderabad Hub', cameras_active: 4, last_update: '2 mins ago', lat: '18.5204° N', lng: '73.8567° E' },
        { id: 'balaji-v3', tenant_id: 'tenant-balaji', reg_number: 'GJ-12-BY-8843', driver_name: 'Gurpreet Singh', speed: 82, status: 'Alert', route: 'Ahmedabad Port → Jaipur Bypass Road', cameras_active: 4, last_update: '10 sec ago', lat: '23.0225° N', lng: '72.5714° E' },
        { id: 'hindustan-v1', tenant_id: 'tenant-hindustan', reg_number: 'JH-02-ZZ-8822', driver_name: 'Birendra Mahto', speed: 28, status: 'Moving', route: 'Dhanbad Quarry Pit 4 → Thermal Power Plant Coal Silo', cameras_active: 3, last_update: 'Just now', lat: '23.7957° N', lng: '86.4304° E' },
        { id: 'hindustan-v2', tenant_id: 'tenant-hindustan', reg_number: 'JH-09-AA-5561', driver_name: 'Suraj Hansda', speed: 0, status: 'Idle', route: 'Quarry Entry Weighbridge Gate 2', cameras_active: 3, last_update: '1 min ago', lat: '23.7990° N', lng: '86.4350° E' },
        { id: 'polar-v1', tenant_id: 'tenant-polar', reg_number: 'KA-51-MM-4491', driver_name: 'Kumar Swamy', speed: 55, status: 'Moving', route: 'Amul Dairy Anand → Bengaluru Ice Cream Depot 2', cameras_active: 4, last_update: 'Just now', lat: '12.9716° N', lng: '77.5946° E' }
      ], { onConflict: 'id' });

      // Seed events
      const { error: evtErr } = await supabaseAdminClient.from('events').upsert([
        { id: 'balaji-e1', tenant_id: 'tenant-balaji', timestamp: '14:28:10', vehicle_reg: 'GJ-12-BY-8843', type: 'DSM (Driver Behavior)', description: 'Driver fatigue sequence alert - Micro-sleep pattern flagged', severity: 'Critical', location: 'NH-48 Near Udaipur Bypass', checked: false },
        { id: 'balaji-e2', tenant_id: 'tenant-balaji', timestamp: '14:15:44', vehicle_reg: 'HR-55-AJ-9021', type: 'ADAS (Road Safety)', description: 'Forward Collision Warning - Sudden pedestrian crossing', severity: 'Warning', location: 'Kolar Highway Hub', checked: true },
        { id: 'hindustan-e1', tenant_id: 'tenant-hindustan', timestamp: '13:50:11', vehicle_reg: 'JH-02-ZZ-8822', type: 'Overspeeding', description: 'Internal Mine Road Speed Limit Exceeded', severity: 'Warning', location: 'Dhanbad Mine Descent Ramp B', checked: false },
        { id: 'polar-e1', tenant_id: 'tenant-polar', timestamp: '14:02:15', vehicle_reg: 'KA-51-MM-4491', type: 'Reefer Sensor Anomaly', description: 'Chamber Temperature spiked from -18C to -11C', severity: 'Caution', location: 'NH-4 Bengaluru Outer Ring Road', checked: false }
      ], { onConflict: 'id' });

      const errors = [tenantErr, userErr, vehErr, evtErr].filter(Boolean);
      if (errors.length > 0) {
        return res.json({
          success: true,
          partial: true,
          message: "Some seed operations had issues (tables may need schema update).",
          errors: errors.map(e => e!.message)
        });
      }

      return res.json({ success: true, message: "Database seeded successfully!" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      supabaseConfigured: !!SUPABASE_URL,
      hasAdminKey: !!SUPABASE_SERVICE_ROLE_KEY
    });
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
