import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return mock data for now
    const mockData = {
      totalDocuments: 0,
      totalStorage: 0,
      recentUploads: [],
      documentTypes: [],
      categories: [],
      departments: [],
      searchQueries: [],
      uploadTrends: []
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      message: 'Dashboard data (mock)'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, { status: 500 });
  }
}
