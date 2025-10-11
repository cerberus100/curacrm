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
    // Try to get vendor token from environment
    try {
      this.vendorToken = env.CURAGENESIS_VENDOR_TOKEN;
    } catch (e) {
      // If env validation fails, try direct access
      this.vendorToken = process.env.CURAGENESIS_VENDOR_TOKEN || '';
    }
    
    if (!this.vendorToken) {
      console.error('CURAGENESIS_VENDOR_TOKEN is not configured');
      throw new Error('CURAGENESIS_VENDOR_TOKEN is not configured. Please check your environment variables.');
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
          'x-vendor-key': this.vendorToken
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
      
      // Add required query parameters
      url.searchParams.set('page_size', '50');
      url.searchParams.set('include', 'metrics'); // Include totalOrders
      
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      console.log('Fetching practices from:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vendor-key': this.vendorToken
        }
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Unexpected response format: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error('API Error Response:', result);
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid vendor token. Please check your CURAGENESIS_VENDOR_TOKEN.');
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
