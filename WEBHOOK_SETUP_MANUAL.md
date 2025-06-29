# Manual Webhook Setup Guide

Since ngrok is not installed on your system, here are manual setup instructions for testing Stripe webhooks locally.

## Option 1: Install and Use ngrok (Recommended)

### Step 1: Download ngrok
1. Go to https://ngrok.com/download
2. Download the Windows ZIP file
3. Extract `ngrok.exe` to a folder (e.g., `C:\tools\ngrok\`)

### Step 2: Optional - Add to PATH
1. Right-click "This PC" → Properties → Advanced System Settings
2. Click "Environment Variables"
3. Under "System Variables", find and select "Path", then click "Edit"
4. Click "New" and add the path where you extracted ngrok (e.g., `C:\tools\ngrok\`)
5. Click "OK" to save

### Step 3: Optional - Sign up for ngrok account
1. Create account at https://ngrok.com/signup
2. Get auth token from https://dashboard.ngrok.com/get-started/your-authtoken
3. Open Command Prompt and run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`

### Step 4: Start ngrok tunnel
1. Make sure your Next.js server is running: `npm run dev`
2. In a new Command Prompt/PowerShell window:
   ```cmd
   ngrok http 3000
   ```
3. Copy the `https://` URL that appears (e.g., `https://abc123.ngrok-free.app`)

### Step 5: Configure Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL: `https://your-ngrok-url.ngrok-free.app/api/payments/webhook`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)

### Step 6: Update .env.local
Replace the webhook secret in your `.env.local` file:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_from_stripe_dashboard
```

### Step 7: Restart your development server
```bash
npm run dev
```

## Option 2: Use Stripe CLI (Alternative)

### Step 1: Download Stripe CLI
1. Go to https://github.com/stripe/stripe-cli/releases
2. Download the Windows version
3. Extract and add to PATH (similar to ngrok steps above)

### Step 2: Login to Stripe
```bash
stripe login
```

### Step 3: Forward webhooks
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

### Step 4: Get webhook secret
The Stripe CLI will output a webhook secret. Copy it to your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_stripe_cli_generated_secret
```

## Option 3: Production-like Testing (Advanced)

If you have a domain or can set up port forwarding:

1. Deploy to a staging environment (Vercel, Netlify, etc.)
2. Use the staging URL for webhook configuration
3. Test with the staging environment

## Testing Your Setup

Once configured, test the payment flow:

1. Navigate to a manuscript with "accepted" status
2. Click "Proceed to Payment"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify webhook receives the event and updates payment status

## Troubleshooting

### Common Issues:

1. **Webhook not receiving events:**
   - Check ngrok/Stripe CLI is running
   - Verify webhook URL is correct in Stripe Dashboard
   - Check webhook secret is correctly set in `.env.local`

2. **Invalid signature error:**
   - Ensure webhook secret is correct
   - Restart development server after updating `.env.local`

3. **CORS issues:**
   - ngrok handles CORS automatically
   - Stripe CLI also handles CORS

4. **Payment not updating:**
   - Check webhook endpoint in Stripe Dashboard shows successful deliveries
   - Check browser console and server logs for errors

## Quick Command Reference

### With ngrok:
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000
```

### With Stripe CLI:
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Current Configuration Status

Your current `.env.local` has:
- ✅ Stripe publishable key configured
- ✅ Stripe secret key configured
- ❌ Webhook secret needs to be updated (currently placeholder)

Once you complete the webhook setup, your Stripe integration will be fully functional for local testing!
