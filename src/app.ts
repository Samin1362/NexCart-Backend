import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AppError } from './utils/errors';
import { sendError } from './utils/response';
import './types';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import reviewRoutes from './routes/review.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import dashboardRoutes from './routes/dashboard.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

/* ─────────────────────────────────────────
   CORS — allow listed origins only
   ───────────────────────────────────────── */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://nexcart-backend-gpd0.onrender.com',
  'https://nex-cart-frontend.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow any Vercel preview deployment for this project
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ─────────────────────────────────────────
   Root — API Documentation
   ───────────────────────────────────────── */
app.get('/', (_req: Request, res: Response) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5001}`;
  const version = '1.0.0';
  const startedAt = new Date().toUTCString();

  const sections = [
    {
      title: 'Health',
      color: '#22c55e',
      endpoints: [
        { method: 'GET', path: '/api/health', auth: 'public', desc: 'API health check' },
      ],
    },
    {
      title: 'Authentication',
      color: '#2563eb',
      endpoints: [
        { method: 'POST',  path: '/api/auth/register',        auth: 'public', desc: 'Register new user' },
        { method: 'POST',  path: '/api/auth/login',           auth: 'public', desc: 'Login and receive tokens' },
        { method: 'POST',  path: '/api/auth/refresh-token',   auth: 'public', desc: 'Refresh access token' },
        { method: 'PATCH', path: '/api/auth/change-password', auth: 'auth',   desc: 'Change own password' },
        { method: 'POST',  path: '/api/auth/logout',          auth: 'auth',   desc: 'Logout current session' },
      ],
    },
    {
      title: 'Users',
      color: '#7c3aed',
      endpoints: [
        { method: 'GET',    path: '/api/users/me',   auth: 'auth',  desc: 'Get current user profile' },
        { method: 'PATCH',  path: '/api/users/me',   auth: 'auth',  desc: 'Update current user profile' },
        { method: 'GET',    path: '/api/users',       auth: 'admin', desc: 'List all users' },
        { method: 'GET',    path: '/api/users/:id',   auth: 'admin', desc: 'Get user by ID' },
        { method: 'PATCH',  path: '/api/users/:id',   auth: 'admin', desc: 'Update user by ID' },
        { method: 'DELETE', path: '/api/users/:id',   auth: 'admin', desc: 'Delete user by ID' },
      ],
    },
    {
      title: 'Categories',
      color: '#0891b2',
      endpoints: [
        { method: 'GET',    path: '/api/categories',       auth: 'public', desc: 'List all categories' },
        { method: 'GET',    path: '/api/categories/:slug', auth: 'public', desc: 'Get category by slug' },
        { method: 'POST',   path: '/api/categories',       auth: 'admin',  desc: 'Create category' },
        { method: 'PATCH',  path: '/api/categories/:id',   auth: 'admin',  desc: 'Update category' },
        { method: 'DELETE', path: '/api/categories/:id',   auth: 'admin',  desc: 'Delete category' },
      ],
    },
    {
      title: 'Products',
      color: '#16a34a',
      endpoints: [
        { method: 'GET',    path: '/api/products',          auth: 'public', desc: 'List products (search, filter, sort, paginate)' },
        { method: 'GET',    path: '/api/products/featured', auth: 'public', desc: 'Get featured products' },
        { method: 'GET',    path: '/api/products/:slug',    auth: 'public', desc: 'Get product by slug' },
        { method: 'POST',   path: '/api/products',          auth: 'admin',  desc: 'Create product' },
        { method: 'PATCH',  path: '/api/products/:id',      auth: 'admin',  desc: 'Update product' },
        { method: 'DELETE', path: '/api/products/:id',      auth: 'admin',  desc: 'Delete product' },
      ],
    },
    {
      title: 'Reviews',
      color: '#f59e0b',
      endpoints: [
        { method: 'GET',    path: '/api/reviews/product/:productId', auth: 'public', desc: 'Get reviews for a product' },
        { method: 'GET',    path: '/api/reviews/my',                 auth: 'auth',   desc: 'Get current user\'s reviews' },
        { method: 'POST',   path: '/api/reviews',                    auth: 'auth',   desc: 'Post a new review' },
        { method: 'DELETE', path: '/api/reviews/:id',                auth: 'auth',   desc: 'Delete own review' },
      ],
    },
    {
      title: 'Cart',
      color: '#ec4899',
      endpoints: [
        { method: 'GET',    path: '/api/cart',                       auth: 'auth', desc: 'Get cart contents' },
        { method: 'POST',   path: '/api/cart/add',                   auth: 'auth', desc: 'Add item to cart' },
        { method: 'PATCH',  path: '/api/cart/update',                auth: 'auth', desc: 'Update cart item quantity' },
        { method: 'DELETE', path: '/api/cart/remove/:productId',     auth: 'auth', desc: 'Remove item from cart' },
        { method: 'DELETE', path: '/api/cart/clear',                 auth: 'auth', desc: 'Clear entire cart' },
      ],
    },
    {
      title: 'Orders',
      color: '#ef4444',
      endpoints: [
        { method: 'POST',  path: '/api/orders',             auth: 'auth',  desc: 'Place a new order' },
        { method: 'GET',   path: '/api/orders',             auth: 'auth',  desc: 'Get current user\'s orders' },
        { method: 'GET',   path: '/api/orders/:id',         auth: 'auth',  desc: 'Get order by ID' },
        { method: 'PATCH', path: '/api/orders/:id/cancel',  auth: 'auth',  desc: 'Cancel an order' },
        { method: 'GET',   path: '/api/orders/all',         auth: 'admin', desc: 'List all orders' },
        { method: 'PATCH', path: '/api/orders/:id/status',  auth: 'admin', desc: 'Update order status' },
      ],
    },
    {
      title: 'Dashboard',
      color: '#6366f1',
      endpoints: [
        { method: 'GET', path: '/api/dashboard/stats',         auth: 'admin', desc: 'Overall platform stats' },
        { method: 'GET', path: '/api/dashboard/chart-data',    auth: 'admin', desc: 'Revenue & order chart data' },
        { method: 'GET', path: '/api/dashboard/recent-orders', auth: 'admin', desc: 'Recent orders list' },
      ],
    },
    {
      title: 'AI',
      color: '#8b5cf6',
      endpoints: [
        { method: 'POST', path: '/api/ai/chat',                 auth: 'auth',  desc: 'AI shopping assistant chat' },
        { method: 'POST', path: '/api/ai/generate-description', auth: 'admin', desc: 'Generate product description via AI' },
        { method: 'POST', path: '/api/ai/review-summary',       auth: 'public', desc: 'Summarize product reviews via AI' },
      ],
    },
  ];

  const methodColor: Record<string, string> = {
    GET:    '#22c55e',
    POST:   '#2563eb',
    PATCH:  '#f59e0b',
    PUT:    '#f59e0b',
    DELETE: '#ef4444',
  };

  const authBadge: Record<string, { label: string; color: string; bg: string }> = {
    public: { label: '🌐 Public',  color: '#86efac', bg: 'rgba(34,197,94,0.12)'  },
    auth:   { label: '🔑 Auth',    color: '#93c5fd', bg: 'rgba(37,99,235,0.15)'  },
    admin:  { label: '🛡️ Admin',  color: '#f9a8d4', bg: 'rgba(236,72,153,0.15)' },
  };

  const totalEndpoints = sections.reduce((s, g) => s + g.endpoints.length, 0);

  const endpointRows = sections
    .map(
      (section) => `
      <div class="section">
        <div class="section-header">
          <span class="section-dot" style="background:${section.color}"></span>
          <span class="section-title">${section.title}</span>
          <span class="section-count">${section.endpoints.length} endpoint${section.endpoints.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="endpoint-list">
          ${section.endpoints
            .map(
              (ep) => `
            <div class="endpoint-row">
              <span class="method-badge" style="background:${methodColor[ep.method] ?? '#64748b'}22;color:${methodColor[ep.method] ?? '#64748b'};border:1px solid ${methodColor[ep.method] ?? '#64748b'}44">${ep.method}</span>
              <code class="endpoint-path"><a href="${baseUrl}${ep.path}" target="_blank" rel="noopener">${ep.path}</a></code>
              <span class="endpoint-desc">${ep.desc}</span>
              <span class="auth-badge" style="color:${authBadge[ep.auth].color};background:${authBadge[ep.auth].bg}">${authBadge[ep.auth].label}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexCart API — Documentation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       #0d1117;
      --bg-card:  #161b22;
      --bg-card2: #1c2128;
      --border:   #30363d;
      --text:     #e6edf3;
      --muted:    #8b949e;
      --accent:   #2563eb;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      min-height: 100vh;
    }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0d1117 0%, #1e1b4b 50%, #0d1117 100%);
      border-bottom: 1px solid var(--border);
      padding: 40px 24px 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #2563eb, #7c3aed, #ec4899);
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .logo-icon {
      width: 40px; height: 40px;
      background: #2563eb;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
    }
    .logo-text span { color: #60a5fa; }
    .header-sub {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .header-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
    }
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      padding: 4px 12px;
      font-size: 12px;
      color: var(--muted);
    }
    .status-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Container */
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }

    /* Legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 28px;
      padding: 14px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--muted);
    }
    .legend-badge {
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Section */
    .section {
      margin-bottom: 20px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      overflow: hidden;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--bg-card2);
      border-bottom: 1px solid var(--border);
    }
    .section-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .section-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--text);
      flex: 1;
    }
    .section-count {
      font-size: 11px;
      color: var(--muted);
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 2px 8px;
    }

    /* Endpoint rows */
    .endpoint-list { padding: 4px 0; }
    .endpoint-row {
      display: grid;
      grid-template-columns: 72px 1fr 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 9px 16px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
    }
    .endpoint-row:last-child { border-bottom: none; }
    .endpoint-row:hover { background: rgba(255,255,255,0.03); }

    .method-badge {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
      padding: 2px 6px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .endpoint-path {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 12px;
      color: #e6edf3;
      word-break: break-all;
    }
    .endpoint-path a { color: #93c5fd; }
    .endpoint-path a:hover { color: #fff; }
    .endpoint-desc {
      font-size: 12px;
      color: var(--muted);
    }
    .auth-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      white-space: nowrap;
      text-align: right;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
      margin-top: 8px;
    }

    /* Responsive */
    @media (max-width: 680px) {
      .endpoint-row {
        grid-template-columns: 60px 1fr;
        grid-template-rows: auto auto;
        gap: 4px 8px;
      }
      .endpoint-desc { grid-column: 1 / -1; font-size: 11px; }
      .auth-badge { grid-column: 2; text-align: left; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <div class="logo-text">Nex<span>Cart</span></div>
    </div>
    <p style="color:#8b949e;font-size:15px;margin-top:4px;">REST API Documentation</p>
    <div class="header-meta">
      <span class="meta-pill"><span class="status-dot"></span> Online &amp; Running</span>
      <span class="meta-pill">v${version}</span>
      <span class="meta-pill">${totalEndpoints} endpoints</span>
      <span class="meta-pill">Base: <code style="color:#60a5fa">${baseUrl}/api</code></span>
      <span class="meta-pill">Started: ${startedAt}</span>
    </div>
  </div>

  <div class="container">
    <!-- Legend -->
    <div class="legend">
      <span style="font-size:12px;font-weight:600;color:var(--text);margin-right:4px;">Auth:</span>
      <span class="legend-item"><span class="legend-badge" style="color:#86efac;background:rgba(34,197,94,0.12)">🌐 Public</span> No auth required</span>
      <span class="legend-item"><span class="legend-badge" style="color:#93c5fd;background:rgba(37,99,235,0.15)">🔑 Auth</span> Bearer token required</span>
      <span class="legend-item"><span class="legend-badge" style="color:#f9a8d4;background:rgba(236,72,153,0.15)">🛡️ Admin</span> Admin role required</span>
    </div>

    ${endpointRows}
  </div>

  <div class="footer">
    NexCart API &copy; ${new Date().getFullYear()} &mdash; Built with Express.js &amp; TypeScript &mdash;
    <a href="${baseUrl}/api/health">Health Check</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

/* ─────────────────────────────────────────
   Health check
   ───────────────────────────────────────── */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'NexCart API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/* ─────────────────────────────────────────
   Route mounting
   ───────────────────────────────────────── */
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai',        aiRoutes);

/* ─────────────────────────────────────────
   Error handlers
   ───────────────────────────────────────── */
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route not found', 404));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message);
    return;
  }
  console.error('Unhandled Error:', err);
  sendError(res, 500, 'Internal server error', err.message);
});

export default app;
