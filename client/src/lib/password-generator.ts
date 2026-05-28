/**
 * Secure Password Generator
 * Generates cryptographically strong passwords following industry standards
 */

export interface PasswordGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generate a cryptographically secure random password
 * @param options Password generation options
 * @returns Generated password string
 */
export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = true,
  } = options;

  // Build character set based on options
  let charset = '';
  const requiredChars: string[] = [];

  if (includeUppercase) {
    charset += UPPERCASE;
    requiredChars.push(UPPERCASE[getSecureRandomInt(UPPERCASE.length)]);
  }
  if (includeLowercase) {
    charset += LOWERCASE;
    requiredChars.push(LOWERCASE[getSecureRandomInt(LOWERCASE.length)]);
  }
  if (includeNumbers) {
    charset += NUMBERS;
    requiredChars.push(NUMBERS[getSecureRandomInt(NUMBERS.length)]);
  }
  if (includeSpecialChars) {
    charset += SPECIAL_CHARS;
    requiredChars.push(SPECIAL_CHARS[getSecureRandomInt(SPECIAL_CHARS.length)]);
  }

  if (charset.length === 0) {
    throw new Error('At least one character type must be selected');
  }

  // Generate password with guaranteed character types
  const passwordArray: string[] = [...requiredChars];
  
  // Fill remaining length with random characters
  for (let i = requiredChars.length; i < length; i++) {
    passwordArray.push(charset[getSecureRandomInt(charset.length)]);
  }

  // Shuffle array to distribute required characters randomly
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

/**
 * Get cryptographically secure random integer using rejection sampling
 * to avoid modulo bias
 * @param max Maximum value (exclusive)
 * @returns Random integer between 0 and max-1
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  const range = Math.floor(2**32 / max) * max;
  
  // Rejection sampling to eliminate modulo bias
  let randomValue;
  do {
    crypto.getRandomValues(randomBuffer);
    randomValue = randomBuffer[0];
  } while (randomValue >= range);
  
  return randomValue % max;
}

/**
 * Estimate password strength
 * Requires character diversity for high ratings
 * @param password Password to evaluate
 * @returns Strength score (0-5) and label
 */
export function estimatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'None', color: 'gray' };

  // Count character types present
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  const charTypeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  // Require minimum length for any positive score
  if (password.length < 8) {
    return { score: 0, label: 'Very Weak', color: 'red' };
  }
  
  // Score based on character diversity and length
  let score = 0;
  
  // Character diversity is primary factor (max 3 points)
  if (charTypeCount === 1) {
    score = 1; // Single type: very weak
  } else if (charTypeCount === 2) {
    score = 2; // Two types: weak
  } else if (charTypeCount === 3) {
    score = 3; // Three types: fair/good
  } else if (charTypeCount === 4) {
    score = 4; // All four types: strong base
  }
  
  // Length bonus (only for diverse passwords)
  if (charTypeCount >= 3 && password.length >= 12) {
    score = Math.min(score + 1, 5); // Bonus for good length with diversity
  }
  
  // Map score to label
  const strengthMap = [
    { score: 0, label: 'Very Weak', color: 'red' },
    { score: 1, label: 'Weak', color: 'orange' },
    { score: 2, label: 'Fair', color: 'yellow' },
    { score: 3, label: 'Good', color: 'blue' },
    { score: 4, label: 'Strong', color: 'green' },
    { score: 5, label: 'Very Strong', color: 'green' },
  ];

  return strengthMap[score];
}
