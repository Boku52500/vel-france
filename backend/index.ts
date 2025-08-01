import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { compressionMiddleware } from "./middleware/compression";
import { optimizeDatabase, createPerformanceIndexes } from "./middleware/dbOptimization";

// Simple logging function
function log(message: string) {
  console.log(`[express] ${message}`);
}

const app = express();

// Enable compression for all responses
app.use(compressionMiddleware);

// Enable CORS for frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Local testing
    'https://your-frontend-url.vercel.app', // Production frontend - REPLACE with actual Vercel URL
    process.env.FRONTEND_URL // Environment variable for production
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database optimizations
  await optimizeDatabase();
  await createPerformanceIndexes();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Remove Vite setup - this is now a standalone backend API server
  // The frontend will be served separately by Vercel

  // Health check endpoint for Railway deployment
  app.get('/health', (_, res) => res.send('OK'));

  // Use PORT environment variable for deployment (Railway/Heroku) or default to 3000
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
