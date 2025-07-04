# Payment Modal Debugging Guide

## Current Issue
The payment resubmission modal is not appearing when authors try to resubmit payment information for rejected payments.

## Debug Changes Made

### 1. Added Visual Debug Indicators

**Green Debug Box (Top Left)**: Shows in PaymentInfoDisplay when modal should be visible
- Modal State: true/false
- Bank Config: Available/Not Available  
- Payment Status: current payment status
- Amount: the payable amount

**Blue Debug Box (Lower Left)**: Shows in PaymentInfoModal when modal is rendering
- isOpen: true/false
- amount: the payment amount
- manuscriptId: the manuscript ID being processed

### 2. Modal Rendering Changes

- **Removed CSS Module Dependencies**: Temporarily using inline styles to eliminate any CSS module loading issues
- **Increased Z-Index**: Modal now uses z-index: 9999 to ensure it appears above all other elements
- **Added Conditional Rendering**: Shows loading message if bank config is not available
- **Simplified Structure**: Removed complex nested elements that might cause rendering issues

### 3. Testing Steps

When you click "Re-submit Payment Information" button:

1. **Check for Green Debug Box**: Should appear immediately in top-left corner
   - If missing: The button click isn't triggering state change
   - If showing "Bank Config: Not Available": Bank config hasn't loaded

2. **Check for Blue Debug Box**: Should appear below green box
   - If missing: Modal component isn't rendering
   - If showing wrong values: Props aren't being passed correctly

3. **Check for Modal**: Should appear as white dialog in center of screen
   - If missing: CSS/styling issues preventing visibility
   - If appearing but not functional: Form submission issues

### 4. Common Issues to Check

**Bank Config Loading**:
```javascript
// Check browser console for these logs:
"Fetching bank config"
"Bank config response"
```

**Modal State Changes**:
```javascript
// Check browser console for:
"Modal state changed: true"
"Resubmit button clicked"
"Modal state set to true"
```

**Form Submission**:
```javascript
// Check browser console for:
"Form submitted with data"
"Calling onSubmit with"
"Payment submission successful"
```

### 5. Next Steps Based on Debug Results

**If Green Box Doesn't Appear**:
- Button click handler not working
- Check for JavaScript errors in console
- Verify isAuthor prop is true

**If Green Box Shows "Bank Config: Not Available"**:
- API call to /api/bank-config is failing
- Check network tab in browser dev tools
- Verify bank config endpoint is working

**If Blue Box Doesn't Appear**:
- Modal component has rendering issues
- Check for TypeScript/JavaScript errors
- Verify PaymentInfoModal import is correct

**If Modal Appears But Can't Submit**:
- Form validation issues
- API endpoint problems
- Network connectivity issues

### 6. Cleanup After Testing

Once the issue is identified and fixed, remove the debug boxes by:

1. Removing the debug div elements from both components
2. Restoring CSS module classes instead of inline styles
3. Removing console.log statements

### 7. Production-Ready Solution

The final working version should:
- Use proper CSS modules for styling
- Have no debug elements or console logs
- Handle all error cases gracefully
- Show loading states appropriately
- Close modal after successful submission

## Files Modified

1. **PaymentInfoDisplay.tsx**: Added debug overlay and conditional modal rendering
2. **PaymentInfoModal.tsx**: Converted to inline styles and added debug information

## Testing Environment

Start the development server and navigate to a manuscript with rejected payment to test the modal functionality.
