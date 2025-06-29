# Stripe Payment Integration Setup

This document explains how to set up Stripe payment integration for the journal management system.

## Prerequisites

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard

## Configuration

### 1. Get Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers > API Keys**
3. Copy your **Publishable key** and **Secret key**

For testing, use the keys that start with:
- `pk_test_...` (Publishable key)
- `sk_test_...` (Secret key)

### 2. Update Environment Variables

Update your `.env.local` file with your Stripe keys:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Set Up Webhook (Optional but Recommended)

Webhooks ensure payment status is updated even if the user closes the browser:

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL to: `https://yourdomain.com/api/payments/webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
5. Copy the **Signing secret** and update `STRIPE_WEBHOOK_SECRET` in `.env.local`

## Features

### Payment Portal

- **Secure Card Processing**: All card data is handled by Stripe, never stored on your servers
- **Real-time Payment Updates**: Status updates via webhooks
- **Billing Information**: Automatically populated from manuscript author data
- **Payment Receipt**: Automatic email receipts from Stripe

### Payment Dashboard

- **Payment Tracking**: View all payments with filtering and search
- **Payment Details**: Comprehensive payment information and history
- **Admin Controls**: Mark payments as completed/failed manually if needed

### Security

- **PCI Compliance**: Stripe handles all PCI compliance requirements
- **SSL Encryption**: All payment data is encrypted in transit
- **No Stored Card Data**: Card information never touches your servers

## Testing

### Test Card Numbers

Stripe provides test card numbers for development:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### Test Workflow

1. Set a manuscript status to "accepted"
2. Click "Proceed to Payment" on the manuscript detail page
3. Fill in payment details using test card numbers
4. Verify payment completion in the payment dashboard

## Going Live

When ready for production:

1. Replace test API keys with live keys (starting with `pk_live_` and `sk_live_`)
2. Update webhook endpoint to your production domain
3. Test with small amounts first
4. Monitor payments in Stripe Dashboard

## Troubleshooting

### Common Issues

1. **"Stripe is not defined"**: Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
2. **Webhook verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint secret
3. **Payment not updating**: Check webhook endpoint is accessible and events are being sent

### Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

## Integration Points

The payment system integrates with:

- **Manuscript Workflow**: Payments are created when manuscripts are accepted
- **Notification System**: Email notifications for payment confirmations
- **User Dashboard**: Payment status and history
- **Admin Panel**: Payment management and oversight
