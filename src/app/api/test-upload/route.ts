import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test upload endpoint called');
    
    // Just return a simple success response
    return NextResponse.json({
      success: true,
      message: 'Test upload endpoint is working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test upload failed'
    }, { status: 500 });
  }
}
