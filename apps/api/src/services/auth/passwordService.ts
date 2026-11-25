import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0 to 4
  feedback: string[];
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Must contain at least one lowercase letter');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Must contain at least one uppercase letter');
  } else {
    score++;
  }

  if (!/\d/.test(password)) {
    feedback.push('Must contain at least one number');
  } else {
    score++;
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    // bonus point for special characters
    if (score < 4) score++;
  }

  return {
    isValid: feedback.length === 0,
    score,
    feedback,
  };
}
