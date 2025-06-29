# Ngrok Webhook Setup for Stripe Integration

This guide explains how to set up ngrok for testing Stripe webhooks in your local development environment.

## What is ngrok?

Ngrok creates a secure tunnel from a public URL to your localhost, allowing Stripe to send webhook events to your local development server.

## Setup Steps

### 1. Install ngrok

**Option A: Download from website**
1. Go to https://ngrok.com/download
2. Download ngrok for Windows
3. Extract to a folder in your PATH

**Option B: Using Chocolatey (if you have it)**
```powershell
choco install ngrok
```

**Option C: Using Scoop (if you have it)**
```powershell
scoop install ngrok
```

### 2. Sign up for ngrok account (Optional but recommended)

1. Go to https://ngrok.com/signup
2. Create a free account
3. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
4. Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`

### 3. Start your Next.js development server

```bash
npm run dev
```

Your app should be running at http://localhost:3000

### 4. Start ngrok tunnel

In a new terminal window:

```bash
ngrok http 3000
```

You'll see output like:
```
ngrok                                                          (Ctrl+C to quit)

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                             0       0       0.00    0.00    0.00    0.00
```

**Important**: Copy the `https://abc123def456.ngrok-free.app` URL - this is your public tunnel URL.

### 5. Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > Webhooks**
3. Click **Add endpoint**
4. Set the endpoint URL to: `https://your-ngrok-url.ngrok-free.app/api/payments/webhook`
   - Replace `your-ngrok-url` with your actual ngrok URL
   - Example: `https://abc123def456.ngrok-free.app/api/payments/webhook`

5. Select the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`

6. Click **Add endpoint**

7. After creation, click on the webhook endpoint you just created

8. Copy the **Signing secret** (starts with `whsec_`)

### 6. Update Environment Variables

Update your `.env.local` file with the webhook secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_from_stripe_dashboard
```

### 7. Restart your development server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Testing the Integration

### 1. Complete Payment Flow Test

1. Make sure both your Next.js server and ngrok are running
2. Navigate to a manuscript with "accepted" status
3. Click "Proceed to Payment"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete the payment
6. Check that the payment status updates automatically via webhook

### 2. Webhook Event Verification

You can monitor webhook events in:

**Stripe Dashboard:**
- Go to **Developers > Webhooks**
- Click on your endpoint
- View the **Recent deliveries** tab

**Ngrok Web Interface:**
- Open http://127.0.0.1:4040 in your browser
- See all HTTP requests to your tunnel in real-time

### 3. Test Different Scenarios

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expected: Payment status becomes "completed"

**Declined Payment:**
- Card: `4000 0000 0000 0002`
- Expected: Payment status becomes "failed"

**3D Secure Authentication:**
- Card: `4000 0025 0000 3155`
- Expected: Authentication challenge, then success

## Development Workflow

### Daily Development Setup

1. **Start Next.js:**
   ```bash
   npm run dev
   ```

2. **Start ngrok in separate terminal:**
   ```bash
   ngrok http 3000
   ```

3. **Update webhook URL if ngrok URL changed:**
   - Free ngrok accounts get new URLs each restart
   - Update the webhook endpoint in Stripe Dashboard
   - Or use ngrok pro for static URLs

### Pro Tips

**1. Keep ngrok running:**
- Keep the ngrok terminal open during development
- If you close it, you'll need to update the webhook URL

**2. Ngrok Web Interface:**
- Visit http://127.0.0.1:4040 to see all requests
- Great for debugging webhook issues

**3. Static domains (Paid feature):**
- Consider ngrok Pro for consistent URLs
- No need to update webhook URLs on each restart

## Troubleshooting

### Common Issues

**1. Webhook not receiving events:**
- Check that ngrok is running and tunnel is active
- Verify webhook URL is correct in Stripe Dashboard
- Check ngrok web interface for incoming requests

**2. Webhook signature verification failed:**
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Make sure you copied the signing secret from the correct webhook endpoint

**3. CORS issues:**
- Ngrok handles CORS automatically
- If issues persist, check your Next.js CORS configuration

**4. ngrok URL changed:**
- Free accounts get new URLs on restart
- Update webhook endpoint in Stripe Dashboard
- Restart your Next.js server to pick up new environment variables

### Debugging Commands

**Check webhook deliveries:**
```bash
# In Stripe Dashboard: Developers > Webhooks > Your endpoint > Recent deliveries
```

**Monitor ngrok traffic:**
```bash
# Open browser to: http://127.0.0.1:4040
```

**Test webhook endpoint manually:**
```bash
curl -X POST https://your-ngrok-url.ngrok-free.app/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## Production Migration

When moving to production:

1. **Replace ngrok URL** with your actual domain
2. **Update webhook endpoint** in Stripe Dashboard
3. **Use production Stripe keys**
4. **Ensure SSL certificate** is valid on production domain

## Security Notes

- ✅ Ngrok provides HTTPS by default
- ✅ Webhook signature verification prevents tampering
- ✅ Free ngrok includes basic DDoS protection
- ⚠️ Free ngrok URLs are public - don't use in production
- ⚠️ Consider ngrok Pro for additional security features

## Alternative Tools

If you prefer alternatives to ngrok:
- **localtunnel**: `npm install -g localtunnel`
- **Stripe CLI**: Has built-in webhook forwarding
- **Visual Studio Code Port Forwarding**: If using VS Code

The integration is now ready for local development with ngrok webhooks!
