const jwt = require('jsonwebtoken');
const { verifyAuth } = require('./_shared');

function traineeJwtSecret() {
  return process.env.TRAINEE_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || '';
}

function signTraineeJwt(payload, expiresIn = '7d') {
  const secret = traineeJwtSecret();
  if (!secret) return null;
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyTraineeAuth(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = String(auth).replace(/^Bearer\s+/i, '').trim();
  const secret = traineeJwtSecret();
  if (!token || !secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || payload.type !== 'trainee') return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function verifyAdminAuth(event) {
  const claims = verifyAuth(event);
  if (!claims) return null;
  const role = String(claims.role || '').trim().toLowerCase();
  if (role !== 'admin') return null;
  return claims;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 10; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SBS-${token}`;
}

module.exports = {
  traineeJwtSecret,
  signTraineeJwt,
  verifyTraineeAuth,
  verifyAdminAuth,
  generateTempPassword,
};
