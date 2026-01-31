

# Fix Memo/Invoice Printing in POS Module

## Problem Analysis
The print preview is showing a **blank page** because:
1. The popup window attempts to print before the Google Font ("Hind Siliguri") fully loads
2. The current implementation uses a fixed 250ms delay instead of waiting for the window's `onload` event
3. Font loading from Google Fonts requires additional wait time

## Solution Overview

### Technical Changes

**File: `src/components/invoice/InvoiceDialog.tsx`**

1. **Use `onload` callback** - Replace the immediate `setTimeout` with `printWindow.onload` to ensure the document is fully loaded
2. **Add font preload wait** - Increase the delay to 500ms and add font loading detection using `document.fonts.ready`
3. **Add fallback fonts** - Include system fonts as fallback in case the web font doesn't load
4. **Remove restrictive CSP** - The current Content-Security-Policy blocks necessary font loading behavior

### Code Changes

```typescript
// Before (problematic):
printWindow.document.close();
printWindow.focus();
setTimeout(() => {
  printWindow.print();
  printWindow.close();
}, 250);

// After (fixed):
printWindow.document.close();

// Wait for content and fonts to load
printWindow.onload = () => {
  // Wait for fonts to be ready
  if (printWindow.document.fonts && printWindow.document.fonts.ready) {
    printWindow.document.fonts.ready.then(() => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 100);
    });
  } else {
    // Fallback for older browsers
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};
```

### Additional Improvements

1. **Update font import** - Use `font-display: swap` for better loading behavior
2. **Add fallback fonts** - System fonts as backup: `'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif`
3. **Remove overly restrictive CSP** - The `script-src 'none'` is preventing proper font initialization

---

## Technical Details

| Component | Change |
|-----------|--------|
| `InvoiceDialog.tsx` | Fix print timing with `onload` + `fonts.ready` API |
| Font loading | Add `font-display: swap` and fallback fonts |
| CSP header | Remove restrictive `script-src 'none'` that blocks font loading |
| Timeout | Increase from 250ms to 500ms as fallback |

## Files to Modify
- `src/components/invoice/InvoiceDialog.tsx`

## Expected Result
After implementation, clicking "Print" in the POS module will display the complete invoice content in the print preview window instead of a blank page.

