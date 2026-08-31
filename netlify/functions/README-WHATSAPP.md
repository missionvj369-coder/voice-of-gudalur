# WhatsApp Voice Intake — Setup Guide

The Netlify function `webhook.js` receives WhatsApp voice notes, transcribes
them (Groq Whisper), extracts a structured wildlife report (Groq Llama), gates
the sender, and publishes to the live alert network (Supabase `wildlife_incidents`).

## 1. Run the database migration (once)
Supabase Dashboard → SQL Editor → paste `supabase/whatsapp_intake.sql` → Run.

## 2. Meta (free)
1. https://developers.facebook.com → Create App → type **Business** → add the
   **WhatsApp** product.
2. WhatsApp → API Setup: note the **test number** (free), **Phone number ID**,
   and generate a **temporary access token** (24h; switch to a permanent
   System User token before launch).
3. App Settings → Basic: copy the **App Secret**.
4. WhatsApp → Configuration → Webhook → Callback URL:
   `https://<your-site>.netlify.app/.netlify/functions/webhook`
   Verify token: the exact value of `WHATSAPP_VERIFY_TOKEN`.
   Subscribe to the **messages** webhook field.
5. Add test recipient numbers (up to 5 while the app is in Development mode).

## 3. Groq (free tier)
https://console.groq.com → API Keys → create `GROQ_API_KEY`.
Models used: `whisper-large-v3-turbo` (ta/ml/kn/en speech) + `llama-3.3-70b-versatile`.

## 4. Netlify environment variables
Site settings → Environment variables:

| Key | Value |
|-----|-------|
| `WHATSAPP_VERIFY_TOKEN` | any secret you invent (match it in Meta) |
| `WHATSAPP_APP_SECRET` | Meta App Secret |
| `WHATSAPP_TOKEN` | Meta access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Phone number ID |
| `GROQ_API_KEY` | Groq key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** key (server-only!) |

## 5. Local testing
```bash
npm i -g netlify-cli
netlify dev        # serves functions + site on :8888
```
Then verify the handshake:
```
curl "http://localhost:8888/.netlify/functions/webhook?hub.mode=subscribe&hub.verify_token=my_secret_token_123&hub.challenge=CHALLENGE_123"
# -> CHALLENGE_123
```

## 6. Who can file voice reports
Only WhatsApp numbers that are ALL of: registered Gudalur Resident ID
(`users.phone`), petition signer (`manifesto_signatures`), and official-email
docket holder (`manifesto_submissions`). Everyone else gets an auto-reply with
the steps they are missing.

## Cost
Receiving voice notes is a Meta *service conversation* = free; replies within
the 24-hour window = free; Groq free tier covers community-scale volume;
Netlify Functions free tier = 125k invocations/month. Effective cost ≈ ₹0.
