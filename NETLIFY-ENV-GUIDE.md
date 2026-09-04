# Netlify Environment Variables Configuration

## Required Environment Variables

Go to: **Netlify Dashboard → Site Settings → Environment → Environment Variables**

Add these variables:

### 1. DATABASE_URL (Required)
```
postgresql://username:password@host:26257/defaultdb?sslmode=verify-full
```

**For CockroachDB Serverless (Recommended):**
1. Go to [cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Create a free cluster
3. Download the connection string
4. Format: `postgresql://<user>:<password>@<host>:26257/defaultdb?sslmode=verify-full`

**Example:**
```
postgresql://voicegudalur:YourPassword123@free-cluster.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

### 2. SESSION_SECRET (Required)
Generate a random secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it.

### 3. NODE_ENV (Required)
```
production
```

### 4. DATABASE_POOL_MAX (Optional - Recommended)
```
5
```

### 5. DATABASE_SSL (Optional)
```
verify-full
```
Or use `require` for simpler setup without CA certificate.

---

## CockroachDB Setup Guide

### Step 1: Create CockroachDB Serverless Account
1. Visit [https://cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Sign up for free (no credit card required)
3. Create a **Serverless** cluster (free tier: 5GB storage, 10M RU/month)

### Step 2: Get Connection String
1. Click on your cluster
2. Go to **"Connection"** tab
3. Select **"Connection string"**
4. Copy the string

### Step 3: Create Database Tables
The app will auto-create tables on first run. No manual setup needed.

### Step 4: Add to Netlify
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Select your site
3. Go to **Site Settings → Environment → Environment Variables**
4. Click **"Add a variable"**
5. Add each variable from above

---

## Verify Setup

After adding env variables:
1. Go to **Deploys** tab
2. Click **"Trigger deploy" → "Deploy site"**
3. Check deploy logs for any errors

The app should now work with the backend API.

---

## Troubleshooting

### Error: "DATABASE_URL is not set"
→ Make sure DATABASE_URL is added to Netlify environment variables

### Error: "Connection refused"
→ Check if your CockroachDB cluster is running
→ Verify the host and port in connection string

### Error: "self signed certificate"
→ Change `sslmode=verify-full` to `sslmode=require`

### Error: "password authentication failed"
→ Verify username and password in connection string
→ Reset password in CockroachDB dashboard if needed
