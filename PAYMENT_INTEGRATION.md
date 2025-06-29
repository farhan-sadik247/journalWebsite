# Payment System Integration

This document describes the APC (Article Processing Charge) payment system integration in the journal manuscript workflow.

## Overview

The payment system implements the missing "Pay APC" step in the journal workflow pipeline:
**Submit → Review → Accept → Pay APC → Final Checks → Publish**

## Components Added

### Backend Models
- **Payment Model** (`src/models/Payment.ts`): Tracks APC payments, status, waivers, and billing information
- **FeeConfig Model** (`src/models/FeeConfig.ts`): Manages APC fee structure, discounts, and calculation logic
- **Updated Manuscript Model**: Added payment-related fields (requiresPayment, paymentStatus, apcAmount, paymentDeadline)

### API Endpoints
- **`/api/payments`**: List and create payments, calculate fees, handle waivers
- **`/api/payments/[id]`**: Get/update individual payment, admin actions (mark as paid, approve waiver)
- **`/api/fee-config`**: Get fee configuration and calculate fee for a manuscript

### Dashboard UI
- **Payment Dashboard** (`/dashboard/payments`): List, filter, and search payments
- **Payment Detail** (`/dashboard/payments/[id]`): View payment details, fee breakdown, billing, timeline, admin actions

## Navigation Integration

### Main Dashboard (`/dashboard`)
1. **Quick Actions**: Added "Payment Status" card for all users
2. **Role-Based Actions**: 
   - Admin: "Payment Management" with full system access
   - Editor: "Payment Oversight" for review and approval tasks

### Header Navigation
- Added "Payments" link in user dropdown for admin and editor roles

## User Roles & Permissions

### All Users
- View their own payment status and history
- Access payment dashboard at `/dashboard/payments`

### Editors
- View all payments for oversight
- Approve waiver requests
- Access editor view: `/dashboard/payments?view=editor`

### Admins
- Full payment management access
- Configure fee structures
- Mark payments as paid/failed
- Access admin view: `/dashboard/payments?view=admin`

## Payment Workflow

1. **Manuscript Acceptance**: When a manuscript is accepted, the system:
   - Calculates APC based on fee configuration
   - Creates a payment record
   - Sets payment deadline
   - Updates manuscript payment status

2. **Payment Processing**: Users can:
   - View payment details and fee breakdown
   - Request waivers with justification
   - Make payments (integration ready for payment gateways)

3. **Admin/Editor Oversight**: 
   - Review waiver requests
   - Mark payments as completed
   - Monitor payment deadlines
   - Generate reports

## Integration Points

### Existing Workflow
- Payment status checks are integrated into manuscript status transitions
- Dashboard shows payment-related statistics
- User permissions respect existing role system

### Future Enhancements
- Payment gateway integration (Stripe/PayPal)
- Automated email notifications for payment reminders
- PDF invoice/receipt generation
- Bulk payment operations for admins

## Configuration

The fee configuration system allows:
- Base fees by manuscript type (article, review, etc.)
- Author discounts (student, developing country, etc.)
- Institutional waivers
- Seasonal/promotional pricing

## Testing

The payment system can be tested through the dashboard interface. A test script (`test-payment-api.js`) was created for API verification and has been moved to the `unnecessary` folder.

## Files Modified/Created

### New Files
- `src/models/Payment.ts`
- `src/models/FeeConfig.ts`
- `src/app/api/payments/route.ts`
- `src/app/api/payments/[id]/route.ts`
- `src/app/api/fee-config/route.ts`
- `src/app/dashboard/payments/PaymentDashboard.tsx`
- `src/app/dashboard/payments/PaymentDashboard.module.scss`
- `src/app/dashboard/payments/page.tsx`
- `src/app/dashboard/payments/[id]/PaymentDetail.tsx`
- `src/app/dashboard/payments/[id]/PaymentDetail.module.scss`
- `src/app/dashboard/payments/[id]/page.tsx`

### Modified Files
- `src/models/Manuscript.ts`: Added payment fields
- `src/app/dashboard/page.tsx`: Added payment navigation
- `src/app/dashboard/Dashboard.module.scss`: Added success color style
- `src/components/layout/Header.tsx`: Added payments link for admin/editor roles

The payment system is now fully integrated and ready for use!
