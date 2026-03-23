// Allowed origins for CORS
const ALLOWED_ORIGINS = ['https://dayoffac.com', 'https://www.dayoffac.com'];

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow server-side / direct
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all dayoffac vercel preview deployments
  if (/^https:\/\/casafresh-website[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

// In-memory rate limiter (per Vercel serverless instance)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // max requests per IP per window

function isRateLimited(ip) {
  const now = Date.now();
  // Clean up stale entries to prevent memory growth
  for (const [key, val] of rateLimit) {
    if (now - val.start > RATE_LIMIT_WINDOW) rateLimit.delete(key);
  }
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Strip newlines/carriage returns to prevent email header injection
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n]/g, ' ').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default async function handler(req, res) {
  // CORS origin check
  const origin = req.headers['origin'];
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Reject requests from unknown origins in production
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { name, email, phone, units, message, website } = req.body || {};

  // Honeypot field — bots fill this in, real users don't see it
  if (website) {
    // Silently accept to not tip off bots
    return res.status(200).json({ success: true });
  }

  // Validate required fields
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Sanitize all inputs
  const cleanName = sanitize(name).slice(0, 100);
  const cleanEmail = sanitize(email).slice(0, 254);
  const cleanPhone = sanitize(phone || '').slice(0, 30);
  const cleanUnits = sanitize(units || '').slice(0, 20);
  const cleanMessage = sanitize(message || '').slice(0, 2000);

  // Validate email format
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Validate name is not empty after sanitization
  if (!cleanName) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const body = `New DayOff AC assessment request:\n\nName: ${cleanName}\nEmail: ${cleanEmail}\nPhone: ${cleanPhone || 'Not provided'}\nAC Units: ${cleanUnits || 'Not specified'}\nMessage: ${cleanMessage || 'No message'}`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'DayOff AC Website', email: 'jorgelameiras207@gmail.com' },
        to: [{ email: 'info@dayoffac.com', name: 'DayOff AC' }],
        replyTo: { email: cleanEmail, name: cleanName },
        subject: `DayOff AC: New assessment request from ${cleanName}`,
        textContent: body
      })
    });

    if (r.ok) return res.status(200).json({ success: true });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
