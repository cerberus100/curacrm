import { z } from "zod";

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

const NPI_REGEX = /^[0-9]{10}$/;
const EIN_TIN_REGEX = /^\d{9}$/; // 9 digits, stored without dashes
const PHONE_DISPLAY_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/;
const E164_REGEX = /^\+1\d{10}$/;
const STATE_REGEX = /^[A-Z]{2}$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PHI patterns to reject (security)
const PHI_PATTERNS = [
  /\bSSN\b|\b\d{3}-\d{2}-\d{4}\b/i,
  /\bDOB\b|\bdate of birth\b/i,
  /\bMRN\b|\bmedical record number\b/i,
];

export function containsPHI(text: string): boolean {
  return PHI_PATTERNS.some((pattern) => pattern.test(text));
}

// ============================================================================
// ENUMS
// ============================================================================

export const RoleEnum = z.enum(["admin", "rep"]);
export const AccountStatusEnum = z.enum(["draft", "ready_to_send", "sent", "failed", "acknowledged"]);
export const ContactTypeEnum = z.enum(["clinician", "owner_physician", "admin", "billing"]);
export const SubmissionStatusEnum = z.enum(["pending", "sent", "failed"]);

// ============================================================================
// USER SCHEMA
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email format"),
  role: RoleEnum,
  active: z.boolean().default(true),
});

export type UserInput = z.infer<typeof UserSchema>;

// ============================================================================
// ACCOUNT SCHEMA
// ============================================================================

export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  
  // Required fields
  practiceName: z
    .string()
    .min(3, "Practice name must be at least 3 characters")
    .max(255, "Practice name must be less than 255 characters")
    .refine((val) => !containsPHI(val), "Practice name contains prohibited PHI patterns"),
  
  specialty: z
    .string()
    .min(1, "Specialty is required")
    .max(100),
  
  state: z
    .string()
    .length(2, "State must be 2-letter code")
    .regex(STATE_REGEX, "State must be uppercase 2-letter code (e.g., CA, NY)"),
  
  // Optional fields
  npiOrg: z
    .string()
    .regex(NPI_REGEX, "NPI must be exactly 10 digits")
    .optional()
    .nullable(),
  
  einTin: z
    .string()
    .regex(EIN_TIN_REGEX, "EIN/TIN must be exactly 9 digits")
    .optional()
    .nullable(),
  
  phoneDisplay: z
    .string()
    .regex(PHONE_DISPLAY_REGEX, "Phone must be in format (XXX) XXX-XXXX")
    .optional()
    .nullable(),
  
  phoneE164: z
    .string()
    .regex(E164_REGEX, "Phone must be in E.164 format (+1XXXXXXXXXX)")
    .optional()
    .nullable(),
  
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable(),
  
  website: z
    .string()
    .url("Invalid website URL")
    .optional()
    .nullable(),
  
  ehrSystem: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  addressLine1: z
    .string()
    .max(255)
    .optional()
    .nullable(),
  
  addressLine2: z
    .string()
    .max(255)
    .optional()
    .nullable(),
  
  city: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  zip: z
    .string()
    .regex(ZIP_REGEX, "ZIP must be 5 digits or 5+4 format")
    .optional()
    .nullable(),
  
  leadSource: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  status: AccountStatusEnum.default("draft"),
  
  ownerRepId: z.string().uuid("Invalid owner rep ID"),
});

export type AccountInput = z.infer<typeof AccountSchema>;

// Partial schema for updates
export const AccountUpdateSchema = AccountSchema.partial().omit({ id: true, ownerRepId: true });

// ============================================================================
// CONTACT SCHEMA
// ============================================================================

export const ContactSchema = z.object({
  id: z.string().uuid().optional(),
  
  accountId: z.string().uuid("Invalid account ID"),
  
  contactType: ContactTypeEnum,
  
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(255)
    .refine((val) => !containsPHI(val), "Full name contains prohibited PHI patterns"),
  
  npiIndividual: z
    .string()
    .regex(NPI_REGEX, "NPI must be exactly 10 digits")
    .optional()
    .nullable(),
  
  title: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable(),
  
  phoneDisplay: z
    .string()
    .regex(PHONE_DISPLAY_REGEX, "Phone must be in format (XXX) XXX-XXXX")
    .optional()
    .nullable(),
  
  phoneE164: z
    .string()
    .regex(E164_REGEX, "Phone must be in E.164 format (+1XXXXXXXXXX)")
    .optional()
    .nullable(),
  
  preferredContactMethod: z
    .enum(["email", "phone", "both"])
    .optional()
    .nullable(),
}).refine(
  (data) => data.email || data.phoneE164 || data.phoneDisplay,
  {
    message: "At least one contact method (email or phone) is required",
    path: ["email"],
  }
);

export type ContactInput = z.infer<typeof ContactSchema>;

// ============================================================================
// INTAKE PAYLOAD SCHEMA (for CuraGenesis API)
// ============================================================================

export const IntakePayloadSchema = z.object({
  source_system: z.literal("intake_crm"),
  submitted_at: z.string().datetime(),
  
  practice: z.object({
    name: z.string(),
    npi_org: z.string().nullable(),
    ein_tin: z.string().nullable(),
    specialty: z.string(),
    ehr_system: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().email().nullable(),
    website: z.string().url().nullable(),
    address: z.object({
      line1: z.string().nullable(),
      line2: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string(),
      zip: z.string().nullable(),
    }),
    lead_source: z.string().nullable(),
  }),
  
  contacts: z.array(
    z.object({
      contact_type: z.string(),
      full_name: z.string(),
      npi_individual: z.string().nullable(),
      title: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      preferred_contact_method: z.string().nullable(),
    })
  ).min(1, "At least one contact is required"),
  
  rep: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export type IntakePayload = z.infer<typeof IntakePayloadSchema>;

// ============================================================================
// SUBMISSION SCHEMA
// ============================================================================

export const SubmissionCreateSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
});

export type SubmissionCreateInput = z.infer<typeof SubmissionCreateSchema>;

// ============================================================================
// CSV BULK IMPORT SCHEMA
// ============================================================================

export const CSVRowSchema = z.object({
  practice_name: z.string().min(3),
  specialty: z.string().min(1),
  state: z.string().length(2).regex(STATE_REGEX),
  npi_org: z.string().regex(NPI_REGEX).optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().regex(ZIP_REGEX).optional().or(z.literal("")),
  contact_full_name: z.string().min(1),
  contact_type: ContactTypeEnum,
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
});

export type CSVRow = z.infer<typeof CSVRowSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format phone number to display format: (XXX) XXX-XXXX
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Convert phone to E.164 format: +1XXXXXXXXXX
 */
export function formatPhoneE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }
  return null;
}

/**
 * Format EIN/TIN for display: XX-XXXXXXX
 */
export function formatEinTinDisplay(einTin: string): string {
  const digits = einTin.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return einTin;
}

/**
 * Strip EIN/TIN to just digits for storage
 */
export function formatEinTinStorage(einTin: string): string | null {
  const digits = einTin.replace(/\D/g, "");
  if (digits.length === 9) {
    return digits;
  }
  return null;
}

/**
 * Validate NPI checksum using Luhn algorithm
 */
export function validateNPIChecksum(npi: string): boolean {
  if (!NPI_REGEX.test(npi)) return false;
  
  // Luhn algorithm for NPI validation
  const digits = npi.split("").map(Number);
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}
