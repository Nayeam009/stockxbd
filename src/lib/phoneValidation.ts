/**
 * Bangladesh Phone Number Validation Utilities
 * Standardized validation for all forms across the application
 */

// Valid Bangladesh mobile operator prefixes
const BD_MOBILE_PREFIXES = ['013', '014', '015', '016', '017', '018', '019'];

/**
 * Validates a Bangladesh mobile phone number
 * Accepts formats: 01XXXXXXXXX or +8801XXXXXXXXX
 * @param phone - The phone number to validate
 * @returns true if valid Bangladesh mobile number
 */
export const validateBDPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove spaces, dashes, and other formatting
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Check for +880 prefix format
  if (cleaned.startsWith('+880')) {
    const withoutPrefix = cleaned.slice(4);
    return withoutPrefix.length === 10 && BD_MOBILE_PREFIXES.some(p => withoutPrefix.startsWith(p.slice(1)));
  }
  
  // Check for 880 prefix format (without +)
  if (cleaned.startsWith('880')) {
    const withoutPrefix = cleaned.slice(3);
    return withoutPrefix.length === 10 && BD_MOBILE_PREFIXES.some(p => withoutPrefix.startsWith(p.slice(1)));
  }
  
  // Standard 11-digit format starting with 01
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    return BD_MOBILE_PREFIXES.some(p => cleaned.startsWith(p));
  }
  
  return false;
};

/**
 * Formats a phone number to standard Bangladesh format
 * @param phone - Raw phone input
 * @returns Formatted phone number (01XXXXXXXXX format)
 */
export const formatBDPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // If starts with +880, convert to 01 format
  if (cleaned.startsWith('+880')) {
    return '0' + cleaned.slice(4);
  }
  
  // If starts with 880, convert to 01 format
  if (cleaned.startsWith('880')) {
    return '0' + cleaned.slice(3);
  }
  
  return cleaned;
};

/**
 * Gets validation error message for phone number
 * @param phone - The phone number to validate
 * @returns Error message or null if valid
 */
export const getPhoneValidationError = (phone: string): string | null => {
  if (!phone || phone.trim() === '') {
    return null; // Empty is allowed (optional field)
  }
  
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  if (cleaned.length < 11) {
    return 'Phone number must be 11 digits';
  }
  
  if (cleaned.length > 14) {
    return 'Phone number is too long';
  }
  
  if (!validateBDPhone(phone)) {
    return 'Please enter a valid Bangladesh mobile number';
  }
  
  return null;
};

/**
 * Validates phone for required fields
 * @param phone - The phone number to validate
 * @returns Error message or null if valid
 */
export const validateRequiredPhone = (phone: string): string | null => {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }
  
  return getPhoneValidationError(phone);
};

/**
 * Formats phone for display with spaces
 * @param phone - The phone number to format
 * @returns Formatted display string (01XXX-XXXXXX)
 */
export const formatPhoneDisplay = (phone: string): string => {
  const formatted = formatBDPhone(phone);
  if (formatted.length === 11) {
    return `${formatted.slice(0, 5)}-${formatted.slice(5)}`;
  }
  return formatted;
};
