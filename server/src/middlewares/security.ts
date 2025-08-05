import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

// Security middleware configuration optimized for chat application behind Nginx
export const securityMiddleware = helmet({
  // Content Security Policy - Strict configuration for chat app
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Allow webpack/vite dev scripts in development
        ...(config.nodeEnv === 'development' ? ["'unsafe-eval'"] : [])
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'" // Required for React/Mantine inline styles
      ],
      imgSrc: [
        "'self'",
        "data:", // For base64 encoded images
        "blob:", // For file uploads and previews
        // Allow S3 bucket for media uploads
        `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com`
      ],
      connectSrc: [
        "'self'",
        // WebSocket connections - adjust based on protocol
        ...(config.clientUrl.startsWith('https://') 
          ? [`wss://${config.clientUrl.replace('https://', '')}`]
          : [`ws://${config.clientUrl.replace('http://', '')}`]
        ),
        // Development WebSocket
        ...(config.nodeEnv === 'development' ? ['ws://localhost:3000', 'ws://localhost:5173'] : []),
        // API connections
        config.clientUrl
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: [
        "'self'",
        "blob:", // For media file handling
        `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com`
      ],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent embedding in frames
      // Only upgrade to HTTPS if the client URL is HTTPS
      upgradeInsecureRequests: (config.nodeEnv === 'production' && config.clientUrl.startsWith('https://')) ? [] : null,
    },
    reportOnly: false // Set to true for testing, false for enforcement
  },

  // Cross-Origin Embedder Policy - disable for HTTP to avoid issues
  crossOriginEmbedderPolicy: config.clientUrl.startsWith('https://') ? {
    policy: "require-corp"
  } : false,

  // Cross-Origin Opener Policy - less strict for HTTP
  crossOriginOpenerPolicy: {
    policy: config.clientUrl.startsWith('https://') ? "same-origin" : "unsafe-none"
  },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: "same-origin"
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },

  // Note: Expect-CT is deprecated and removed from helmet v7+

  // X-Frame-Options (backup for frame-ancestors CSP)
  frameguard: {
    action: 'deny'
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // HTTP Strict Transport Security - only enable for HTTPS deployments
  hsts: (config.nodeEnv === 'production' && config.clientUrl.startsWith('https://')) ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,

  // IE No Open
  ieNoOpen: true,

  // X-Content-Type-Options
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permissions Policy (Feature Policy replacement)
  permittedCrossDomainPolicies: false,

  // Referrer Policy
  referrerPolicy: {
    policy: ["strict-origin-when-cross-origin"]
  },

  // X-XSS-Protection (deprecated but still useful for older browsers)
  xssFilter: true
});

// Additional security middleware for WebSocket upgrade requests
export const webSocketSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a WebSocket upgrade request
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    // Validate Origin header for WebSocket connections
    const origin = req.headers.origin;
    const allowedOrigins = [
      config.clientUrl,
      ...(config.nodeEnv === 'development' ? ['http://localhost:5173'] : [])
    ];

    if (!origin || !allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Invalid origin for WebSocket connection' });
      return;
    }

    // Validate WebSocket protocol
    const protocol = req.headers['sec-websocket-protocol'];
    if (protocol && !['chat'].includes(protocol)) {
      res.status(400).json({ error: 'Invalid WebSocket protocol' });
      return;
    }
  }

  next();
};

// Security headers middleware for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional API-specific security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  next();
};

// Development-only middleware to log security headers
export const securityHeadersLogger = (req: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === 'development') {
    const originalSend = res.send;
    res.send = function(data) {
      console.log('Security Headers:', {
        'Content-Security-Policy': res.getHeader('Content-Security-Policy'),
        'X-Frame-Options': res.getHeader('X-Frame-Options'),
        'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
        'Referrer-Policy': res.getHeader('Referrer-Policy'),
        'Permissions-Policy': res.getHeader('Permissions-Policy')
      });
      return originalSend.call(this, data);
    };
  }
  next();
};