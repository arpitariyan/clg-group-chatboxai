import dns from 'node:dns';
import disposableDomains from 'disposable-email-domains';

// Fix Node 18+ IPv6 timeouts
dns.setDefaultResultOrder('ipv4first');

// Convert array to Set for O(1) lookup
const DISPOSABLE_SET = new Set(disposableDomains);

// Additional domains not in the package
const EXTRA_BLOCKED = new Set([
  'anonaddy.me', 'anonadnaddy.com',
  'simplelogin.co', 'simplelogin.fr',
  'mailto.plus', 'tempmail.plus',
  'temp-mail.io', 'temp-mail.org',
]);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function checkDomainMX(domain) {
  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      resolve(!err && addresses && addresses.length > 0);
    });
  });
}

export async function validateEmailStrict(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email address format' };
  }

  const domain = parts[1];

  // 100k+ disposable domains check
  if (DISPOSABLE_SET.has(domain) || EXTRA_BLOCKED.has(domain)) {
    return { 
      valid: false, 
      error: 'Temporary or disposable email addresses are not allowed. Please use your real email.' 
    };
  }

  // DNS MX check
  try {
    const hasMx = await checkDomainMX(domain);
    if (!hasMx) {
      return { valid: false, error: 'This email domain cannot receive mail.' };
    }
  } catch (err) {
    console.warn(`[Email Validator] DNS check failed for ${domain}:`, err.message);
    // Do not block on DNS failure to avoid blocking legitimate users on network errors
  }

  return { valid: true };
}
