import { NextRequest, NextResponse } from 'next/server';
import { getRegulationById } from '@/lib/db/operations';
import { generatePDF } from '@/lib/exporters/pdf';
import { generateDOCX } from '@/lib/exporters/docx';

/**
 * GET /api/export/pdf?id=123
 * GET /api/export/docx?id=123
 * Generate and download regulation as PDF or DOCX
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { format: string } }
) {
  try {
    const { format } = params;
    const regulationId = request.nextUrl.searchParams.get('id');

    if (!regulationId) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    if (!['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be pdf or docx' },
        { status: 400 }
      );
    }

    const id = parseInt(regulationId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid regulation ID' },
        { status: 400 }
      );
    }

    console.log(`[Export] Generating ${format.toUpperCase()} for regulation ${id}`);

    // Fetch regulation with analysis
    const regulation = await getRegulationById(id);

    if (!regulation) {
      return NextResponse.json(
        { error: 'Regulation not found' },
        { status: 404 }
      );
    }

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      buffer = await generatePDF(regulation, {
        companyName: 'Kemira Oyj',
        division: 'Water Treatment Chemicals Division',
      });
      contentType = 'application/pdf';
      filename = `regulation-${id}-${new Date().toISOString().split('T')[0]}.pdf`;
    } else {
      // DOCX
      buffer = await generateDOCX(regulation, {
        companyName: 'Kemira Oyj',
        division: 'Water Treatment Chemicals Division',
      });
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `regulation-${id}-${new Date().toISOString().split('T')[0]}.docx`;
    }

    console.log(`[Export] Generated ${format.toUpperCase()} (${buffer.length} bytes) for regulation ${id}`);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[Export] Error generating export:', error);
    return NextResponse.json(
      {
        error: 'Export generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
