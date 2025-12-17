import PDFDocument from 'pdfkit';
import { RegulationWithAnalysis, ActionItem } from '@/types';

const KEMIRA_BLUE = '#003D7A';
const KEMIRA_SECONDARY = '#0066CC';
const KEMIRA_ACCENT = '#00A3E0';
const DARK_GRAY = '#4A4A4A';
const LIGHT_GRAY = '#E5E5E5';

interface PDFGeneratorOptions {
  companyName?: string;
  division?: string;
}

/**
 * Generate PDF document for a regulation
 */
export async function generatePDF(
  regulation: RegulationWithAnalysis,
  options?: PDFGeneratorOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.on('error', (error) => {
        reject(error);
      });

      // Add content
      addHeader(doc, regulation, options);
      addExecutiveSummary(doc, regulation);
      addImpactAnalysis(doc, regulation);
      addActionItems(doc, regulation);
      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addHeader(
  doc: PDFKit.PDFDocument,
  regulation: RegulationWithAnalysis,
  options?: PDFGeneratorOptions
) {
  // Background color for header
  doc.rect(0, 0, doc.page.width, 100)
    .fill(KEMIRA_BLUE);

  // White text on blue background
  doc.fillColor('white');
  doc.fontSize(24)
    .font('Helvetica-Bold')
    .text(options?.companyName || 'Kemira Oyj', 40, 20);

  doc.fontSize(12)
    .font('Helvetica')
    .text(options?.division || 'Water Treatment Chemicals Division', 40, 50);

  // Reset text color
  doc.fillColor(DARK_GRAY);

  // Reset position
  doc.y = 120;

  // Title
  doc.fontSize(20)
    .font('Helvetica-Bold')
    .text(regulation.title, {
      align: 'left',
      width: doc.page.width - 80,
    });

  // Impact badge
  const impactColor = getImpactColor(regulation.impact_level);
  doc.rect(doc.page.width - 120, 120, 100, 30)
    .fill(impactColor);

  doc.fillColor('white')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(
      (regulation.impact_level || 'none').toUpperCase(),
      doc.page.width - 120,
      130,
      { width: 100, align: 'center' }
    );

  doc.fillColor(DARK_GRAY);
  doc.y = 180;

  // Metadata
  doc.fontSize(10)
    .font('Helvetica')
    .text(`Published: ${new Date(regulation.published_date).toLocaleDateString()}`, 40);

  doc.text(`Relevance Score: ${regulation.relevance_score || 'N/A'}/100`, 40);

  doc.text(`Source: ${regulation.source_url}`, 40, {
    link: regulation.source_url,
    underline: true,
    color: KEMIRA_SECONDARY,
  });

  doc.moveDown(2);
}

function addExecutiveSummary(
  doc: PDFKit.PDFDocument,
  regulation: RegulationWithAnalysis
) {
  if (!regulation.parsed_analysis) {
    return;
  }

  // Section title
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .text('Executive Summary', { underline: true });

  doc.moveDown(0.5);

  // Summary text
  doc.fontSize(11)
    .font('Helvetica')
    .text(regulation.parsed_analysis.executive_summary, {
      align: 'left',
    });

  doc.moveDown(1);

  // Key changes
  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text('Key Changes:');

  doc.fontSize(10)
    .font('Helvetica');

  for (const change of regulation.parsed_analysis.key_changes) {
    doc.text(`• ${change}`, 60);
  }

  doc.moveDown(1);
}

function addImpactAnalysis(
  doc: PDFKit.PDFDocument,
  regulation: RegulationWithAnalysis
) {
  if (!regulation.parsed_analysis) {
    return;
  }

  // Check if we need a new page
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
  }

  // Section title
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(DARK_GRAY)
    .text('Detailed Impact Analysis', { underline: true });

  doc.moveDown(0.5);

  const analysis = regulation.parsed_analysis;

  // Create a simple info box
  const sectionWidth = doc.page.width - 80;
  const sectionHeight = 30;

  // Affected Areas
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('Affected Business Areas:', 40);

  doc.fontSize(10)
    .font('Helvetica');

  for (const area of analysis.affected_areas) {
    doc.text(`• ${area}`, 60);
  }

  doc.moveDown(0.5);

  // Compliance Deadline
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('Compliance Deadline:', 40);

  doc.fontSize(10)
    .font('Helvetica')
    .text(analysis.compliance_deadline || 'To be determined', 60);

  doc.moveDown(0.5);

  // Estimated Effort
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('Estimated Implementation Effort:', 40);

  doc.fontSize(10)
    .font('Helvetica')
    .text(analysis.estimated_effort, 60);

  doc.moveDown(0.5);

  // Financial Impact
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('Financial Impact:', 40);

  doc.fontSize(10)
    .font('Helvetica')
    .text(analysis.financial_impact, 60);

  doc.moveDown(0.5);

  // Risks
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('Risks if Non-Compliant:', 40);

  doc.fontSize(10)
    .font('Helvetica')
    .text(analysis.risks_if_ignored, 60, {
      width: sectionWidth - 20,
    });

  doc.moveDown(1);
}

function addActionItems(
  doc: PDFKit.PDFDocument,
  regulation: RegulationWithAnalysis
) {
  if (!regulation.parsed_analysis || regulation.parsed_analysis.action_items.length === 0) {
    return;
  }

  // Check if we need a new page
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
  }

  // Section title
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(DARK_GRAY)
    .text('Required Action Items', { underline: true });

  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const col1 = 40;
  const col2 = 150;
  const col3 = 330;
  const col4 = 450;
  const rowHeight = 20;

  // Draw header background
  doc.rect(col1 - 5, tableTop - 5, doc.page.width - 80, rowHeight)
    .fill(KEMIRA_SECONDARY);

  // Header text
  doc.fillColor('white')
    .fontSize(10)
    .font('Helvetica-Bold');

  doc.text('Dept', col1, tableTop + 3);
  doc.text('Action', col2, tableTop + 3);
  doc.text('Deadline', col3, tableTop + 3);
  doc.text('Priority', col4, tableTop + 3);

  doc.moveDown(1.5);
  doc.fillColor(DARK_GRAY);

  // Table rows
  for (const item of regulation.parsed_analysis.action_items) {
    const y = doc.y;

    // Alternate row colors
    if (Math.floor((y - tableTop) / rowHeight) % 2 === 0) {
      doc.rect(col1 - 5, y - 5, doc.page.width - 80, rowHeight)
        .fill(LIGHT_GRAY);
      doc.fillColor(DARK_GRAY);
    }

    doc.fontSize(9)
      .font('Helvetica');

    // Ensure we don't go past the page
    if (doc.y > doc.page.height - 60) {
      doc.addPage();
    }

    const shortDeadline = item.deadline
      ? new Date(item.deadline).toLocaleDateString('fi-FI')
      : 'TBD';

    doc.text(item.department, col1);
    doc.fontSize(8);
    doc.text(item.action.substring(0, 40), col2, y, { width: 170 });
    doc.fontSize(9);
    doc.text(shortDeadline, col3, y);
    doc.text(item.priority.toUpperCase(), col4, y);

    doc.moveDown(1.2);
  }

  doc.moveDown(1);
}

function addFooter(doc: PDFKit.PDFDocument) {
  // Page number and date at bottom
  const pageCount = doc.bufferedPageRange().count;

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    doc.fontSize(9)
      .fillColor(DARK_GRAY)
      .text(
        `Generated on ${new Date().toLocaleDateString()}  |  Page ${i + 1} of ${pageCount}`,
        40,
        doc.page.height - 40,
        {
          align: 'center',
        }
      );
  }
}

function getImpactColor(level: string | null): string {
  switch (level) {
    case 'high':
      return '#DC2626'; // Red
    case 'medium':
      return '#F59E0B'; // Amber
    case 'low':
      return '#10B981'; // Green
    default:
      return '#9CA3AF'; // Gray
  }
}
