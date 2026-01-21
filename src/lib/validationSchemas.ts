import { z } from 'zod';

// Customer validation
export const customerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Customer name is required")
    .max(100, "Customer name must be less than 100 characters"),
  phone: z.string()
    .regex(/^[+]?[\d\s\-().]{7,20}$/, "Invalid phone number format")
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .nullable(),
});

// POS transaction validation
export const posItemSchema = z.object({
  price: z.number()
    .min(0, "Price cannot be negative")
    .max(10000000, "Price exceeds maximum allowed value"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(10000, "Quantity exceeds maximum allowed value"),
});

export const posTransactionSchema = z.object({
  customerName: z.string()
    .max(100, "Customer name must be less than 100 characters")
    .optional(),
  discount: z.number()
    .min(0, "Discount cannot be negative")
    .max(10000000, "Discount exceeds maximum allowed value"),
  items: z.array(posItemSchema).min(1, "At least one item is required"),
});

// Order validation
export const orderSchema = z.object({
  customerName: z.string()
    .trim()
    .min(1, "Customer name is required")
    .max(100, "Customer name must be less than 100 characters"),
  deliveryAddress: z.string()
    .trim()
    .min(1, "Delivery address is required")
    .max(500, "Address must be less than 500 characters"),
  productName: z.string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(10000, "Quantity exceeds maximum allowed value"),
  price: z.number()
    .min(0, "Price cannot be negative")
    .max(10000000, "Price exceeds maximum allowed value"),
});

// Input sanitization helpers
export const sanitizeString = (value: string): string => {
  return value
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/^[=+\-@]/, "'") // Prevent CSV formula injection
    .slice(0, 500);
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Use for any user-generated content that will be inserted into HTML
 */
export const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Sanitizes string for HTML output - combines general sanitization with HTML escaping
 * Use for dynamic content in print windows or document.write contexts
 */
export const sanitizeForHtml = (value: string): string => {
  return escapeHtml(sanitizeString(value));
};

/**
 * Sanitizes string specifically for CSV export to prevent formula injection
 */
export const sanitizeForCSV = (value: string): string => {
  return value
    .replace(/^[=+\-@]/, "'") // Prevent formula injection
    .replace(/"/g, '""'); // Escape quotes
};

export const parsePositiveNumber = (value: string, max: number = 10000000): number => {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.min(num, max);
};

export const parsePositiveInt = (value: string, max: number = 10000): number => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) return 1;
  return Math.min(num, max);
};

/**
 * Generates a cryptographically secure invite code
 * Uses Web Crypto API for secure random generation
 */
export const generateSecureInviteCode = (): string => {
  const array = new Uint8Array(16); // 128 bits of entropy
  crypto.getRandomValues(array);
  return 'INV-' + Array.from(array, byte => 
    byte.toString(36).padStart(2, '0')
  ).join('').toUpperCase().substring(0, 20);
};
