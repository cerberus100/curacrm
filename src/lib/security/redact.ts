/**
 * PHI Redaction Utility
 * Removes or masks sensitive information from text content
 */

// Common PHI patterns
const PHI_PATTERNS = {
  // SSN: XXX-XX-XXXX or XXXXXXXXX
  SSN: /(\b\d{3}-?\d{2}-?\d{4}\b)/g,
  
  // MRN: Medical Record Number (various formats)
  MRN: /(\bMRN[:\s]*\d{6,12}\b)/gi,
  
  // DOB: Date of Birth (MM/DD/YYYY, MM-DD-YYYY, etc.)
  DOB: /(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)/g,
  
  // Phone numbers
  PHONE: /(\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/g,
  
  // Credit card numbers
  CREDIT_CARD: /(\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b)/g,
  
  // Email addresses (optional - may be needed for business)
  EMAIL: /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g,
};

/**
 * Redacts PHI from text content
 * @param text - The text to redact
 * @param options - Redaction options
 * @returns Redacted text
 */
export function redactPHI(
  text: string, 
  options: {
    maskSSN?: boolean;
    maskMRN?: boolean;
    maskDOB?: boolean;
    maskPhone?: boolean;
    maskCreditCard?: boolean;
    maskEmail?: boolean;
    replacement?: string;
  } = {}
): string {
  const {
    maskSSN = true,
    maskMRN = true,
    maskDOB = true,
    maskPhone = false, // Usually needed for business
    maskCreditCard = true,
    maskEmail = false, // Usually needed for business
    replacement = '[REDACTED]'
  } = options;

  let redactedText = text;

  if (maskSSN) {
    redactedText = redactedText.replace(PHI_PATTERNS.SSN, replacement);
  }

  if (maskMRN) {
    redactedText = redactedText.replace(PHI_PATTERNS.MRN, replacement);
  }

  if (maskDOB) {
    redactedText = redactedText.replace(PHI_PATTERNS.DOB, replacement);
  }

  if (maskPhone) {
    redactedText = redactedText.replace(PHI_PATTERNS.PHONE, replacement);
  }

  if (maskCreditCard) {
    redactedText = redactedText.replace(PHI_PATTERNS.CREDIT_CARD, replacement);
  }

  if (maskEmail) {
    redactedText = redactedText.replace(PHI_PATTERNS.EMAIL, replacement);
  }

  return redactedText;
}

/**
 * Checks if text contains PHI patterns
 * @param text - The text to check
 * @returns Object with detected PHI types
 */
export function detectPHI(text: string): {
  hasSSN: boolean;
  hasMRN: boolean;
  hasDOB: boolean;
  hasPhone: boolean;
  hasCreditCard: boolean;
  hasEmail: boolean;
} {
  return {
    hasSSN: PHI_PATTERNS.SSN.test(text),
    hasMRN: PHI_PATTERNS.MRN.test(text),
    hasDOB: PHI_PATTERNS.DOB.test(text),
    hasPhone: PHI_PATTERNS.PHONE.test(text),
    hasCreditCard: PHI_PATTERNS.CREDIT_CARD.test(text),
    hasEmail: PHI_PATTERNS.EMAIL.test(text),
  };
}

/**
 * Redacts PHI from request/response bodies for logging
 * @param body - The request/response body
 * @returns Redacted body for logging
 */
export function redactForLogging(body: any): any {
  if (typeof body === 'string') {
    return redactPHI(body);
  }

  if (typeof body === 'object' && body !== null) {
    const redacted = { ...body };
    
    // Redact common PHI fields
    const phiFields = ['ssn', 'mrn', 'dob', 'dateOfBirth', 'phone', 'phoneNumber', 'creditCard'];
    
    for (const field of phiFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }

    // Recursively redact nested objects
    for (const key in redacted) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = redactForLogging(redacted[key]);
      } else if (typeof redacted[key] === 'string') {
        redacted[key] = redactPHI(redacted[key]);
      }
    }

    return redacted;
  }

  return body;
}
