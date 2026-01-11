/**
 * Validation utilities for input sanitization and validation
 * Prevents XSS and injection attacks
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (Brazilian format)
const PHONE_REGEX = /^(\+55)?[\s-]?\(?[1-9]{2}\)?[\s-]?9?[\s-]?\d{4}[\s-]?\d{4}$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/.+/i;

// HTML tag regex for sanitization
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates phone number (Brazilian format)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Validates password strength
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Senha é obrigatória"] };
  }

  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/**
 * Sanitizes string input by removing HTML tags and trimming
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(HTML_TAG_REGEX, "")
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitizes text input (allows some formatting but removes dangerous tags)
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";
  // Remove script, iframe, object, embed tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .trim()
    .slice(0, 50000); // Limit length
}

/**
 * Validates CPF (Brazilian tax ID) format
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== "string") return false;
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11;
}

/**
 * Validates CNPJ (Brazilian company tax ID) format
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== "string") return false;
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 14;
}

/**
 * Validates required field
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validates number range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): boolean {
  if (typeof value !== "number" || isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validates date format and range
 */
export function validateDate(date: string | Date): boolean {
  if (!date) return false;
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return !isNaN(dateObj.getTime());
}

/**
 * Sanitizes object by applying sanitization to string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    }
  }
  return sanitized;
}

/**
 * Validates form data object
 */
export function validateFormData<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, (value: any) => boolean | string>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field in rules) {
    const validator = rules[field];
    const value = data[field];
    const result = validator(value);

    if (result !== true) {
      errors[field] = typeof result === "string" ? result : "Campo inválido";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

