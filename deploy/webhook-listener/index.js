#!/usr/bin/env node
/**
 * LottoDrop GitHub Webhook Listener
 *
 * Listens for GitHub push events and triggers deployment.
 * Location: /opt/lottodrop-webhook/index.js
 *
 * Environment variables:
 *   WEBHOOK_SECRET - GitHub webhook secret for signature validation
 *   WEBHOOK_PORT   - Port to listen on (default: 9001)
 *   DEPLOY_SCRIPT  - Path to deploy script (default: /usr/local/bin/deploy-lottodrop.sh)
 */

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const CONFIG = {
  port: process.env.WEBHOOK_PORT || 9001,
  secret: process.env.WEBHOOK_SECRET || '',
  deployScript: process.env.DEPLOY_SCRIPT || '/usr/local/bin/deploy-lottodrop.sh',
  logFile: '/var/log/lottodrop-webhook.log',
  allowedBranch: 'main',
  allowedEvents: ['push']
};

// Logging
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({ timestamp, level, message, ...data });
  console.log(logEntry);

  try {
    fs.appendFileSync(CONFIG.logFile, logEntry + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  if (!CONFIG.secret) {
    log('warn', 'No webhook secret configured - skipping signature verification');
    return true;
  }

  if (!signature) {
    log('error', 'No signature provided in request');
    return false;
  }

  const hmac = crypto.createHmac('sha256', CONFIG.secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (err) {
    log('error', 'Signature verification failed', { error: err.message });
    return false;
  }
}

// Execute deploy script
function runDeploy() {
  log('info', 'Starting deployment...');

  const deploy = spawn(CONFIG.deployScript, [], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  deploy.stdout.on('data', (data) => {
    log('info', 'Deploy output', { output: data.toString().trim() });
  });

  deploy.stderr.on('data', (data) => {
    log('error', 'Deploy error', { output: data.toString().trim() });
  });

  deploy.on('close', (code) => {
    if (code === 0) {
      log('info', 'Deployment completed successfully');
    } else {
      log('error', 'Deployment failed', { exitCode: code });
    }
  });

  deploy.on('error', (err) => {
    log('error', 'Failed to start deploy script', { error: err.message });
  });

  // Unref to allow the parent to exit independently
  deploy.unref();
}

// Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Limit body size to 1MB
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// HTTP request handler
async function handleRequest(req, res) {
  const requestId = crypto.randomBytes(8).toString('hex');

  log('info', 'Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  });

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Only accept POST to /webhook
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];

    log('info', 'GitHub webhook received', {
      requestId,
      event,
      delivery,
      hasSignature: !!signature
    });

    // Verify signature
    if (!verifySignature(body, signature)) {
      log('error', 'Invalid signature', { requestId });
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    // Check event type
    if (!CONFIG.allowedEvents.includes(event)) {
      log('info', 'Ignoring event type', { requestId, event });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Event ignored', event }));
      return;
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      log('error', 'Invalid JSON payload', { requestId });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Check branch
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');

    if (branch !== CONFIG.allowedBranch) {
      log('info', 'Ignoring push to different branch', { requestId, branch });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Branch ignored', branch }));
      return;
    }

    // Log commit info
    const commits = payload.commits || [];
    const pusher = payload.pusher?.name || 'unknown';

    log('info', 'Processing push event', {
      requestId,
      branch,
      pusher,
      commitCount: commits.length,
      headCommit: payload.head_commit?.id?.substring(0, 7)
    });

    // Trigger deployment
    runDeploy();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Deployment triggered',
      branch,
      commits: commits.length
    }));

  } catch (err) {
    log('error', 'Request handling failed', { requestId, error: err.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(CONFIG.port, () => {
  log('info', 'Webhook listener started', {
    port: CONFIG.port,
    deployScript: CONFIG.deployScript,
    hasSecret: !!CONFIG.secret
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down...');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down...');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});
