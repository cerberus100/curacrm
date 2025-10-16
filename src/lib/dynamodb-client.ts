// ============================================================================
// DYNAMODB CLIENT - Direct access to CuraGenesis database
// ============================================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Document client for easier JSON handling
export const docClient = DynamoDBDocumentClient.from(client);

// ============================================================================
// TYPES - Based on Ian's schema
// ============================================================================

export interface BAADataItem {
  UserId: string;
  facilityName: string;
  facilityAddress?: string;
  facilityCity?: string;
  facilityState?: string;
  facilityZip?: string;
  facilityPhone?: string;
  facilityFax?: string;
  facilityNPI?: string;
  facilityTIN?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  salesRep?: string; // repId
  // Optional analytics fields (schema-less)
  specialty?: string;
  leadSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RepItem {
  repId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  territory?: string;
  commissionRate?: number;
  status?: string;
}

export interface OrderMedicalItem {
  orderId: string;
  userId: string;
  ivrId?: string;
  status: string;
  graftsUsed?: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount?: number;
  shippingAddress?: any;
  paid?: boolean;
  invoiceId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserItem {
  UserId: string;
  email: string;
  FirstName?: string;
  LastName?: string;
  baaSigned?: boolean;
  paSigned?: boolean;
  createdAt?: string;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all facilities (BAAData)
 */
export async function getAllFacilities(): Promise<BAADataItem[]> {
  try {
    const command = new ScanCommand({
      TableName: "BAAData",
      Limit: 1000, // Adjust based on your needs
    });

    const response = await docClient.send(command);
    return (response.Items || []) as BAADataItem[];
  } catch (error) {
    console.error("Error fetching facilities:", error);
    throw error;
  }
}

/**
 * Get facilities by sales rep
 */
export async function getFacilitiesByRep(repId: string): Promise<BAADataItem[]> {
  try {
    const command = new QueryCommand({
      TableName: "BAAData",
      IndexName: "salesRep-index",
      KeyConditionExpression: "salesRep = :repId",
      ExpressionAttributeValues: {
        ":repId": repId,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as BAADataItem[];
  } catch (error) {
    console.error(`Error fetching facilities for rep ${repId}:`, error);
    throw error;
  }
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<OrderMedicalItem[]> {
  try {
    const command = new ScanCommand({
      TableName: "Orders_Medical",
      Limit: 10000, // Adjust based on your needs
    });

    const response = await docClient.send(command);
    return (response.Items || []) as OrderMedicalItem[];
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}

/**
 * Get orders by user
 */
export async function getOrdersByUser(userId: string): Promise<OrderMedicalItem[]> {
  try {
    const command = new QueryCommand({
      TableName: "Orders_Medical",
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as OrderMedicalItem[];
  } catch (error) {
    console.error(`Error fetching orders for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all reps
 */
export async function getAllReps(): Promise<RepItem[]> {
  try {
    const command = new ScanCommand({
      TableName: "Reps",
    });

    const response = await docClient.send(command);
    return (response.Items || []) as RepItem[];
  } catch (error) {
    console.error("Error fetching reps:", error);
    throw error;
  }
}

/**
 * Get rep by ID
 */
export async function getRepById(repId: string): Promise<RepItem | null> {
  try {
    const command = new GetCommand({
      TableName: "Reps",
      Key: { repId },
    });

    const response = await docClient.send(command);
    return (response.Item as RepItem) || null;
  } catch (error) {
    console.error(`Error fetching rep ${repId}:`, error);
    throw error;
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserItem[]> {
  try {
    const command = new ScanCommand({
      TableName: "Users",
      Limit: 10000,
    });

    const response = await docClient.send(command);
    return (response.Items || []) as UserItem[];
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserItem | null> {
  try {
    const command = new GetCommand({
      TableName: "Users",
      Key: { UserId: userId },
    });

    const response = await docClient.send(command);
    return (response.Item as UserItem) || null;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
}

