import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate friendly error messages for common HTTP errors
 */
export function getFriendlyErrorMessage(status: number, error?: string): string {
  switch (status) {
    case 409:
      return "This practice may already exist in CuraGenesis. Please check for duplicates.";
    case 422:
      return "CuraGenesis rejected some fields. Please verify NPI, Email, and State are correct.";
    case 408:
    case 504:
      return "Network timeout. Please try again or contact Admin if the issue persists.";
    case 401:
    case 403:
      return "Authentication error. Please contact Admin.";
    case 500:
    case 502:
    case 503:
      return "CuraGenesis service is temporarily unavailable. Please try again later.";
    default:
      return error || "An unexpected error occurred. Please try again.";
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format date
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
