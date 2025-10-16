import { env } from "./env";
import type { IntakePayload } from "./validations";

// New API payload structure for /admin_createUserWithBaa
interface BaaPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  baaSigned: boolean;
  paSigned: boolean;
  selectedFacility?: string;
  facilityName: string;
  facilityAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    fax?: string;
  };
  facilityNPI?: string;
  facilityTIN?: string;
  facilityPTAN?: string;
  facilityPhone?: string;
  facilityFax?: string;
  shippingContact?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  shippingAddresses?: Array<{
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    instructions?: string;
  }>;
  physicianInfo?: {
    name: string;
    email?: string;
    npi?: string;
  };
  additionalPhysicians?: Array<{
    name: string;
    email?: string;
    npi?: string;
  }>;
}

// ============================================================================
// CURAGENESIS API CLIENT
// ============================================================================

export interface CuraGenesisResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface IntakeSuccessResponse {
  success: boolean;
  userId: string;
}

export class CuraGenesisClient {
  private baseUrl: string;
  private vendorToken: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    // Read from environment so we can change without code deploys
    // Use process.env directly (not env module) so runtime ECS vars are used, not build-time fallbacks
    this.baseUrl = (process.env.CURAGENESIS_API_BASE || 'https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod').replace(/\/+$/, "");
    this.vendorToken = process.env.CURAGENESIS_VENDOR_TOKEN || '';
    this.apiKey = process.env.CURAGENESIS_API_KEY || '';
    this.timeout = parseInt(process.env.CURAGENESIS_API_TIMEOUT_MS || '60000', 10);
    
    // Log config on init (safe - no secrets, just confirming vars are set)
    try {
      console.log("[CuraGenesis] Client initialized", {
        baseUrl: this.baseUrl,
        hasVendorToken: !!this.vendorToken,
        hasApiKey: !!this.apiKey,
        timeout: this.timeout
      });
    } catch {}
  }

  /**
   * Transform IntakePayload to BaaPayload format
   */
  private transformPayload(payload: IntakePayload): BaaPayload {
    // Contacts are optional now - use primary contact from form or first contact if available
    const primaryContact = payload.contacts && payload.contacts.length > 0 ? payload.contacts[0] : null;
    
    let firstName = "";
    let lastName = "";
    let contactEmail = payload.practice.email || "";
    
    if (primaryContact && primaryContact.full_name) {
      const [first, ...lastParts] = primaryContact.full_name.split(" ");
      firstName = first || "";
      lastName = lastParts.join(" ");
      contactEmail = primaryContact.email || contactEmail;
    } else if (payload.primaryContactName) {
      // Use primary contact name from form if no contacts exist
      const [first, ...lastParts] = payload.primaryContactName.split(" ");
      firstName = first || "";
      lastName = lastParts.join(" ");
    }

    const baaPayload: BaaPayload = {
      email: contactEmail,
      firstName: firstName,
      lastName: lastName,
      baaSigned: false,
      paSigned: false,
      facilityName: payload.practice.name,
      facilityAddress: {
        line1: payload.practice.address.line1 || "",
        line2: payload.practice.address.line2 || undefined,
        city: payload.practice.address.city || "",
        state: payload.practice.address.state,
        postalCode: payload.practice.address.zip || "",
        country: "US",
        phone: payload.practice.phone || undefined,
      },
      facilityNPI: payload.practice.npi_org || undefined,
      facilityTIN: payload.practice.ein_tin || undefined,
      facilityPhone: payload.practice.phone || undefined,
      // Use primaryContactName from form if available, fallback to first contact
      primaryContactName: payload.primaryContactName || (primaryContact ? primaryContact.full_name : ""),
      primaryContactEmail: primaryContact ? (primaryContact.email || undefined) : undefined,
      primaryContactPhone: primaryContact ? (primaryContact.phone || undefined) : undefined,
    };

    // Add physician info if available
    if (payload.contacts && payload.contacts.length > 0) {
      const physicianContact = payload.contacts.find(c => c.contact_type === "PHYSICIAN" || c.npi_individual);
      if (physicianContact) {
        baaPayload.physicianInfo = {
          name: physicianContact.full_name,
          email: physicianContact.email || undefined,
          npi: physicianContact.npi_individual || undefined,
        };

        // Additional physicians
        const additionalPhysicians = payload.contacts
          .filter(c => c !== physicianContact && (c.contact_type === "PHYSICIAN" || c.npi_individual));
        if (additionalPhysicians.length > 0) {
          baaPayload.additionalPhysicians = additionalPhysicians.map(p => ({
            name: p.full_name,
            email: p.email || undefined,
            npi: p.npi_individual || undefined,
          }));
        }
      }
    }

    return baaPayload;
  }

  /**
   * Submit practice intake with retry logic
   * Uses the new /admin_createUserWithBaa endpoint
   * Retries on 5xx errors and timeouts up to 3 times
   */
  async submitIntake(
    payload: IntakePayload,
    idempotencyKey: string
  ): Promise<CuraGenesisResponse<IntakeSuccessResponse>> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Transform to new API format
    const baaPayload = this.transformPayload(payload);

    // Try multiple possible endpoint shapes and stage prefixes
    // Common API Gateway behavior: stage (e.g., /Prod) must be present unless custom domain maps it away
    const candidateStagePrefixes = [
      "",           // no stage prefix (custom domain mapping)
      "/Prod",     // standard AWS API Gateway stage
      "/prod",     // some setups use lowercase
    ];
    const candidateEndpoints = [
      "/admin_createUserWithBaa",
      "/admin/createUserWithBaa",
      "/admin_createUserWithBAA",
      "/api/createUser", // fallback to legacy create user path
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response: CuraGenesisResponse<IntakeSuccessResponse> | null = null;

        // Iterate across stage prefixes and endpoint shapes until one works or we exhaust options
        outer: for (const stagePrefix of candidateStagePrefixes) {
          for (const ep of candidateEndpoints) {
            // Build combined path; baseUrl is normalized without trailing slash
            const combined = `${stagePrefix}${ep}`;
            response = await this.makeRequest<IntakeSuccessResponse>(combined, {
              method: "POST",
              body: baaPayload,
              idempotencyKey,
            });

            // If path is wrong, API Gateway commonly returns 403 with Missing Authentication Token
            const missingAuthToken =
              response.status === 403 &&
              (response.error?.toLowerCase().includes("missing authentication token") ?? false);

            // 404 can also indicate wrong path (stage or endpoint)
            const pathLikelyWrong = missingAuthToken || response.status === 404;

            if (!pathLikelyWrong) {
              // Got a definitive answer (success or other 4xx/5xx) for this combination
              break outer;
            }
          }
        }

        // Success - return immediately
        if (response && response.success) {
          return response;
        }

        // Client errors (4xx) - don't retry
        if (response && response.status >= 400 && response.status < 500) {
          return response;
        }

        // Server errors (5xx) - retry
        if (response && response.status >= 500) {
          lastError = new Error(`Server error: ${response.status}`);
          
          // Don't retry on last attempt
          if (attempt < maxRetries) {
            await this.delay(this.getBackoffDelay(attempt));
            continue;
          }
        }

        return response ?? { success: false, status: 0, error: "No response" };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Retry on network errors and timeouts
        if (attempt < maxRetries) {
          await this.delay(this.getBackoffDelay(attempt));
          continue;
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message || "Max retries exceeded",
      status: 0,
    };
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method: "GET" | "POST" | "PATCH";
      body?: unknown;
      idempotencyKey?: string;
    }
  ): Promise<CuraGenesisResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-vendor-token": this.vendorToken,
        "x-vendor-key": this.vendorToken, // some endpoints expect x-vendor-key
        "x-api-key": this.apiKey,
      };

      if (options.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }

      // Log request details for debugging (safe - no PHI in URL/headers)
      try {
        console.log("[CuraGenesis] Request", {
          method: options.method,
          url,
          headers: Object.keys(headers),
          hasBody: !!options.body,
          bodyPreview: options.body ? JSON.stringify(options.body).substring(0, 100) : null
        });
      } catch {}

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let data: T | undefined;
      let error: string | undefined;

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await response.json();
        if (response.ok) {
          data = json;
        } else {
          error = (json.error || json.message || `HTTP ${response.status}`) + ` (url: ${url})`;
          try { console.error("[CuraGenesis] Request failed", { status: response.status, url }); } catch {}
        }
      } else {
        const text = await response.text();
        if (response.ok) {
          data = text as T;
        } else {
          error = (text || `HTTP ${response.status}`) + ` (url: ${url})`;
          try { console.error("[CuraGenesis] Request failed", { status: response.status, url }); } catch {}
        }
      }

      return {
        success: response.ok,
        data,
        error,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          try { console.error("[CuraGenesis] Request timeout", { url }); } catch {}
          return {
            success: false,
            error: "Request timeout",
            status: 408,
          };
        }
        try { console.error("[CuraGenesis] Network error", { message: error.message, url }); } catch {}
        return {
          success: false,
          error: error.message,
          status: 0,
        };
      }

      return {
        success: false,
        error: "Unknown error",
        status: 0,
      };
    }
  }

  /**
   * Exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// METRICS CLIENT
// ============================================================================

export interface OverviewKPIs {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  activePractices: number;
  retentionRate90d: number;
  avgDaysToFirstOrder: number;
}

export interface TimeSeriesPoint {
  date: string; // ISO date
  sales: number;
  orders: number;
  activePractices: number;
}

export interface OverviewResponse {
  kpis: OverviewKPIs;
  series: TimeSeriesPoint[];
}

export interface GeoDataPoint {
  state: string;
  stateCode: string;
  sales: number;
  practices: number;
  orders: number;
}

export interface GeoResponse {
  topStates: GeoDataPoint[];
}

export interface LeaderboardEntry {
  repId: string;
  repName: string;
  practicesAdded: number;
  activationRate: number;
  orders: number;
  sales: number;
  averageOrderValue: number;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export type DateRange = "30d" | "60d" | "90d";

export class MetricsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    // Allow override for server-side usage
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_CG_METRICS_BASE || "";
    this.apiKey = apiKey || "";
  }

  async overview(dateRange: DateRange): Promise<OverviewResponse> {
    return this.makeRequest<OverviewResponse>("/v1/metrics/overview", {
      dateRange,
    });
  }

  async geo(dateRange: DateRange): Promise<GeoResponse> {
    return this.makeRequest<GeoResponse>("/v1/metrics/geo", {
      dateRange,
    });
  }

  async leaderboard(dateRange: DateRange): Promise<LeaderboardResponse> {
    return this.makeRequest<LeaderboardResponse>("/v1/metrics/leaderboard", {
      dateRange,
    });
  }

  private async makeRequest<T>(endpoint: string, params: { dateRange: DateRange }): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Metrics API error: ${response.status}`);
    }

    return response.json();
  }
}
