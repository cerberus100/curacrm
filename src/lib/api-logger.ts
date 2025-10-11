/**
 * API Request/Response Logger
 * Logs all API calls with timing, status codes, and errors
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, generateRequestId } from "./logger";

export function withApiLogger(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  routeName: string
) {
  return async (request: NextRequest, context?: any) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;

    // Log incoming request
    logger.apiRequest(method, routeName, {
      requestId,
      url,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      // Log successful response
      logger.apiResponse(method, routeName, response.status, duration, {
        requestId
      });

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error(`API Error: ${method} ${routeName}`, error, {
        requestId,
        duration
      });

      // Return generic error response
      return NextResponse.json(
        { 
          error: "Internal server error",
          requestId 
        },
        { status: 500 }
      );
    }
  };
}

// Helper to add standard error handling to API routes
export function handleApiError(error: unknown, context?: string): NextResponse {
  if (error instanceof Error) {
    logger.error(`API Error${context ? ` (${context})` : ''}`, error);
    
    // Handle specific error types
    if (error.message.includes('Unauthorized') || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    if (error.message.includes('Not found') || error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    if (error.message.includes('Invalid') || error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
  
  logger.error(`Unknown error${context ? ` (${context})` : ''}`, error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
