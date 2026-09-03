import crypto from 'crypto';
const salt = crypto.randomBytes(16).toString('hex');
const derived = crypto.scryptSync('18thDimension@369', salt, 64).toString('hex');
process.stdout.write(`${salt}:${derived}`);
