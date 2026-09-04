/**
 * Voice of Gudalur — SMS delivery for OTP codes (server-only).
 *
 * The `else` branch of POST /api/auth/request-otp used to be a stub that sent
 * nothing — switching OTP_PROVIDER away from `devel` silently broke
 * registration. This service makes real SMS delivery work end-to-end with
 * zero code changes: pick a provider via env vars (see .env.example):
 *
 *   fast2sms  — easiest start; their `otp` route uses a DLT-approved template
 *   msg91     — needs your own DLT-approved OTP flow template
 *   twilio    — international; costly for India (DLT still required)
 *
 * India (+91) is the app's domain: request-otp validates exactly 10 digits.
 * No credentials are invented — if a provider is selected without its keys,
 * sendOtpSms fails LOUDLY with an actionable message (never silently).
 */
import axios from 'axios';
import { logger } from '../utils/logger';

/** Send the message body for a given provider, or throw with a clear reason. */
export async function sendOtpSms(phone10: string, code: string): Promise<void> {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
  const to = `+91${phone10}`; // E.164 for Twilio; Fast2SMS/MSG91 use 10/12-digit forms below
  const message = `Your Voice of Gudalur verification code is ${code}. It expires in 5 minutes. Do not share it.`;

  switch (provider) {
    case 'fast2sms':
      return sendViaFast2Sms(phone10, code);
    case 'msg91':
      return sendViaMsg91(phone10, code);
    case 'twilio':
      return sendViaTwilio(to, message);
    case '':
      throw new Error(
        'SMS_PROVIDER is not set — add SMS_PROVIDER (fast2sms | msg91 | twilio) and its API keys to the server environment',
      );
    default:
      throw new Error(`Unknown SMS_PROVIDER "${provider}" — supported: fast2sms, msg91, twilio`);
  }
}

/** Fast2SMS — https://www.fast2sms.com → Dev API → "authorization" key. */
async function sendViaFast2Sms(phone10: string, code: string): Promise<void> {
  const key = process.env.SMS_API_KEY || '';
  if (!key) throw new Error('Fast2SMS selected but SMS_API_KEY is empty (their "authorization" key)');

  // route=otp uses Fast2SMS's own DLT-approved OTP template — no template setup needed.
  const res = await axios.get<any>('https://www.fast2sms.com/dev/bulkV2', {
    headers: { authorization: key },
    params: { route: 'otp', variables_values: code, numbers: phone10 },
    timeout: 10_000,
  });
  if (res.data?.return !== true) {
    throw new Error(`Fast2SMS rejected the send: ${JSON.stringify(res.data?.message || res.data).slice(0, 200)}`);
  }
}

/** MSG91 — https://msg91.com → needs your DLT-approved OTP flow template. */
async function sendViaMsg91(phone10: string, code: string): Promise<void> {
  const authkey = process.env.SMS_API_KEY || '';
  const templateId = process.env.SMS_TEMPLATE_ID || '';
  if (!authkey) throw new Error('MSG91 selected but SMS_API_KEY is empty (their "authkey")');
  if (!templateId) throw new Error('MSG91 selected but SMS_TEMPLATE_ID is empty (your DLT-approved flow template id)');

  // The flow template must contain the variable {{OTP}} (capital letters).
  const res = await axios.post<any>(
    'https://api.msg91.com/api/v5/flow/',
    { template_id: templateId, short_url: '0', recipients: [{ mobiles: `91${phone10}`, OTP: code }] },
    { headers: { authkey, 'content-type': 'application/json' }, timeout: 10_000 },
  );
  if (res.data?.type !== 'success') {
    throw new Error(`MSG91 rejected the send: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
}

/** Twilio — international sender. SMS_API_KEY = Account SID, SMS_API_SECRET = auth token. */
async function sendViaTwilio(to: string, message: string): Promise<void> {
  const sid = process.env.SMS_API_KEY || '';
  const token = process.env.SMS_API_SECRET || '';
  const from = process.env.SMS_FROM || '';
  if (!sid || !token) throw new Error('Twilio selected but SMS_API_KEY (Account SID) / SMS_API_SECRET (auth token) are empty');
  if (!from) throw new Error('Twilio selected but SMS_FROM is empty (an E.164 sender, e.g. +91XXXXXXXXXX)');

  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const res = await axios.post<any>(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, body.toString(), {
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 10_000,
  });
  if (!res.data?.sid) {
    throw new Error(`Twilio rejected the send: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  logger.info(`[OTP] SMS accepted by Twilio (sid ${res.data.sid})`);
}
