import { env } from "./env";

// ============================================================================
// CURAGENESIS API CLIENT - User Creation and Practice Management
// ============================================================================

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  baaSigned?: boolean;
  paSigned?: boolean;
  facilityName?: string;
  facilityAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    npi?: string;
    tin?: string;
    ptan?: string;
    fax?: string;
    phone?: string;
  };
  facilityNPI?: string;
  facilityTIN?: string;
  facilityPTAN?: string;
  facilityFax?: string;
  facilityPhone?: string;
  shippingContact?: string;
  selectedFacility?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  shippingAddresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>;
  salesRepresentative?: string | object;
  physicianInfo?: {
    physicianFirstName?: string;
    physicianLastName?: string;
    phone?: string;
    npi?: string;
    tin?: string;
    ptan?: string;
    specialty?: string;
    fax?: string;
    contactName?: string;
    contactPhone?: string;
    medicareAdminContractor?: string;
    siteName?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  additionalPhysicians?: Array<{
    firstName?: string;
    lastName?: string;
    specialty?: string;
    npi?: string;
    tin?: string;
  }>;
}

export interface CreateUserResponse {
  success: boolean;
  userId: string;
}

export interface Practice {
  practiceId: string;
  userId: string;
  curaIntakeId: string | null;
  specialty: string | null;
  state: string;
  activatedAt: number;
  activatedAtIso: string;
  totalOrders: number;
  salesRep: string;
}

export interface PracticesResponse {
  items: Practice[];
  nextCursor?: string;
}

export class CuraGenesisUserAPI {
  private baseUrl = 'https://sr9bkv1k3k.execute-api.us-east-1.amazonaws.com/Admin-Prod';
  private vendorToken: string;

  constructor() {
    this.vendorToken = env.CURAGENESIS_VENDOR_TOKEN;
    if (!this.vendorToken) {
      throw new Error('CURAGENESIS_VENDOR_TOKEN is not configured');
    }
  }

  /**
   * Create a new user and seed BAA data
   * This will also send a welcome email to the user
   */
  async createUser(data: CreateUserPayload): Promise<CreateUserResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/createUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vendor-token': this.vendorToken
        },
        body: JSON.stringify({
          ...data,
          baaSigned: data.baaSigned ?? false,
          paSigned: data.paSigned ?? false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(result.message || 'Missing required fields');
        } else if (response.status === 401) {
          throw new Error('Unauthorized: Invalid vendor token');
        } else if (response.status === 500) {
          throw new Error(result.message || 'Error creating user');
        }
        throw new Error(result.message || `API error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('CuraGenesis createUser error:', error);
      throw error;
    }
  }

  /**
   * Fetch all practices with optional pagination
   */
  async getPractices(cursor?: string): Promise<PracticesResponse> {
    try {
      const url = new URL(`${this.baseUrl}/api/partner/v1/practices`);
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-vendor-token': this.vendorToken
        }
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid vendor token');
        }
        throw new Error(result.message || `API error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('CuraGenesis getPractices error:', error);
      throw error;
    }
  }

  /**
   * Fetch all practices (handles pagination automatically)
   */
  async getAllPractices(): Promise<Practice[]> {
    const allPractices: Practice[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getPractices(cursor);
      allPractices.push(...response.items);
      cursor = response.nextCursor;
    } while (cursor);

    return allPractices;
  }
}
