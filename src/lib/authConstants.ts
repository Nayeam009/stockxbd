/**
 * Authentication Constants
 * Centralized configuration for the Stock-X auth system
 */

// Synthetic email domains for non-email logins
export const AUTH_DOMAINS = {
  CUSTOMER: '@customer.stockx',
  MANAGER: '@manager.stockx',
} as const;

// User role types
export type UserRoleType = 'owner' | 'manager' | 'customer';

// Auth mode types
export type AuthMode = 'signin' | 'signup' | 'manager-invite';

// Signup category types
export type SignupCategory = 'customer' | 'owner';

// Phone pattern for Bangladesh
export const BD_PHONE_PATTERN = /^(01\d{9}|\+?8801\d{9})$/;

/**
 * Resolve login ID to email format
 * - Contains @ -> use as-is (Owner/Admin)
 * - Matches BD phone pattern -> Customer synthetic email
 * - Otherwise -> Manager synthetic email (username)
 */
export const resolveLoginEmail = (loginId: string): string => {
  const trimmed = loginId.trim().toLowerCase();
  
  // Already an email
  if (trimmed.includes('@')) {
    return trimmed;
  }
  
  // Bangladesh phone number -> Customer
  if (BD_PHONE_PATTERN.test(trimmed)) {
    const cleanPhone = trimmed.replace(/\+/g, '').replace(/^0/, '880');
    return `${cleanPhone}${AUTH_DOMAINS.CUSTOMER}`;
  }
  
  // Username -> Manager
  return `${trimmed.replace(/\s+/g, '')}${AUTH_DOMAINS.MANAGER}`;
};

/**
 * Generate synthetic email for customer registration
 */
export const generateCustomerEmail = (phone: string): string => {
  const cleanPhone = phone.replace(/[\s\-+()]/g, '').replace(/^0/, '880');
  return `${cleanPhone}${AUTH_DOMAINS.CUSTOMER}`;
};

/**
 * Generate synthetic email for manager registration
 */
export const generateManagerEmail = (username: string): string => {
  return `${username.toLowerCase().replace(/\s+/g, '')}${AUTH_DOMAINS.MANAGER}`;
};

/**
 * Determine the type of login ID
 */
export const getLoginIdType = (loginId: string): 'email' | 'phone' | 'username' => {
  const trimmed = loginId.trim();
  
  if (trimmed.includes('@')) {
    return 'email';
  }
  
  if (BD_PHONE_PATTERN.test(trimmed)) {
    return 'phone';
  }
  
  return 'username';
};

/**
 * Get redirect path based on user role
 */
export const getRedirectPath = (role: UserRoleType): string => {
  switch (role) {
    case 'customer':
      return '/community';
    case 'owner':
    case 'manager':
    default:
      return '/dashboard';
  }
};
