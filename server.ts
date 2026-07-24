import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // ============================================================
  // SECURITY MIDDLEWARE
  // ============================================================

  // Helmet — sets secure HTTP headers (XSS protection, content-type sniffing,
  // clickjacking prevention, HSTS, referrer policy, etc.)
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://cdnjs.cloudflare.com', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    } : false, // Disable CSP in dev (Vite HMR needs inline scripts)
    crossOriginEmbedderPolicy: false, // Required for map tiles
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Required for external assets
  }));

  // CORS — restrict origins in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : isProduction
      ? [] // No CORS needed if serving from same origin
      : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(cors({
    origin: isProduction
      ? (origin, callback) => {
          // Same-origin requests have no origin header
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('CORS: Origin not allowed'));
          }
        }
      : true, // Allow all in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  }));

  // Rate Limiting — prevent brute force and abuse
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    skip: (req) => !isProduction && req.path.startsWith('/@'), // Skip Vite HMR in dev
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 auth attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
  });

  app.use(generalLimiter);
  app.use('/api/auth', authLimiter);

  // Body parsing with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // ============================================================
  // SECURITY HEADERS (additional beyond helmet)
  // ============================================================

  app.use((_req, res, next) => {
    // Prevent the page from being loaded in iframes (clickjacking)
    res.setHeader('X-Frame-Options', 'DENY');
    // Disable MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy — disable unnecessary browser features
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
    next();
  });

  // ============================================================
  // API ROUTES
  // ============================================================

  // Health check (rate-limited by general limiter)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: isProduction ? 'production' : 'development',
    });
  });

  // ============================================================
  // APPLICATION SERVING
  // ============================================================

  if (!isProduction) {
    // Development: Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static build
    const distPath = path.join(process.cwd(), 'dist');

    // Static assets with long-term caching
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));

    // Other static files (short cache)
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        // Don't cache HTML (allows instant updates on deploy)
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));

    // SPA fallback — all non-file routes serve index.html
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({
      error: isProduction ? 'Internal server error' : err.message,
    });
  });

  // ============================================================
  // START
  // ============================================================

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Garud AI Transport ERP running at http://localhost:${PORT} [${isProduction ? 'production' : 'development'}]`);
  });
}

startServer();
