import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx';
import { RegulationWithAnalysis } from '@/types';

interface DOCXGeneratorOptions {
  companyName?: string;
  division?: string;
}

/**
 * Generate DOCX document for a regulation
 */
export async function generateDOCX(
  regulation: RegulationWithAnalysis,
  options?: DOCXGeneratorOptions
): Promise<Buffer> {
  const sections = [];

  // Header
  sections.push(
    new Paragraph({
      text: options?.companyName || 'Kemira Oyj',
      bold: true,
      size: 28,
      spacing: { after: 0 },
    }),
    new Paragraph({
      text: options?.division || 'Water Treatment Chemicals Division',
      size: 24,
      spacing: { after: 400 },
      color: '666666',
    })
  );

  // Title
  sections.push(
    new Paragraph({
      text: regulation.title,
      bold: true,
      size: 26,
      spacing: { after: 200 },
    })
  );

  // Metadata table
  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph('Published:')],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            shading: { fill: 'E5E5E5' },
          }),
          new TableCell({
            children: [
              new Paragraph(new Date(regulation.published_date).toLocaleDateString()),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          new TableCell({
            children: [new Paragraph('Impact Level:')],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            shading: { fill: 'E5E5E5' },
          }),
          new TableCell({
            children: [
              new Paragraph(
                new TextRun({
                  text: (regulation.impact_level || 'None').toUpperCase(),
                  bold: true,
                  color: getImpactColorHex(regulation.impact_level),
                })
              ),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph('Relevance Score:')],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            shading: { fill: 'E5E5E5' },
          }),
          new TableCell({
            children: [new Paragraph(`${regulation.relevance_score || 'N/A'}/100`)],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          new TableCell({
            children: [new Paragraph('Source:')],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            shading: { fill: 'E5E5E5' },
          }),
          new TableCell({
            children: [
              new Paragraph(
                new TextRun({
                  text: regulation.source_url,
                  color: '0066CC',
                  underline: {},
                })
              ),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
        ],
      }),
    ],
  });

  sections.push(metadataTable);
  sections.push(new Paragraph({ text: '' }));

  // Executive Summary
  if (regulation.parsed_analysis) {
    const analysis = regulation.parsed_analysis;

    sections.push(
      new Paragraph({
        text: 'Executive Summary',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: analysis.executive_summary,
        spacing: { after: 200 },
      })
    );

    // Key Changes
    sections.push(
      new Paragraph({
        text: 'Key Changes:',
        bold: true,
        size: 22,
        spacing: { after: 100 },
      })
    );

    for (const change of analysis.key_changes) {
      sections.push(
        new Paragraph({
          text: change,
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    }

    sections.push(new Paragraph({ text: '' }));

    // Affected Areas
    sections.push(
      new Paragraph({
        text: 'Affected Business Areas:',
        bold: true,
        size: 22,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const area of analysis.affected_areas) {
      sections.push(
        new Paragraph({
          text: area,
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    }

    // Impact Details
    sections.push(new Paragraph({ text: '' }));
    sections.push(
      new Paragraph({
        text: 'Impact Analysis',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: `Compliance Deadline: ${analysis.compliance_deadline || 'To be determined'}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Estimated Effort: ${analysis.estimated_effort}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Financial Impact: ${analysis.financial_impact}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Risks if Non-Compliant: ${analysis.risks_if_ignored}`,
        spacing: { after: 200 },
      })
    );

    // Action Items Table
    if (analysis.action_items.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Required Action Items',
          bold: true,
          size: 24,
          spacing: { before: 200, after: 100 },
        })
      );

      const actionRows = [
        new TableRow({
          cells: [
            new TableCell({
              children: [new Paragraph(new TextRun({ text: 'Department', bold: true }))],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: '003D7A' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
            new TableCell({
              children: [new Paragraph(new TextRun({ text: 'Action', bold: true }))],
              width: { size: 40, type: WidthType.PERCENTAGE },
              shading: { fill: '003D7A' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
            new TableCell({
              children: [new Paragraph(new TextRun({ text: 'Deadline', bold: true }))],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: '003D7A' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
            new TableCell({
              children: [new Paragraph(new TextRun({ text: 'Priority', bold: true }))],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: '003D7A' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
            }),
          ],
        }),
      ];

      for (const item of analysis.action_items) {
        const deadline = item.deadline
          ? new Date(item.deadline).toLocaleDateString('fi-FI')
          : 'TBD';

        actionRows.push(
          new TableRow({
            cells: [
              new TableCell({
                children: [new Paragraph(item.department)],
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
              new TableCell({
                children: [new Paragraph(item.action)],
                width: { size: 40, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
              new TableCell({
                children: [new Paragraph(deadline)],
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    new TextRun({
                      text: item.priority.toUpperCase(),
                      bold: true,
                      color: getPriorityColorHex(item.priority),
                    })
                  ),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
            ],
          })
        );
      }

      sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: actionRows }));
    }
  }

  // Footer
  sections.push(new Paragraph({ text: '' }));
  sections.push(
    new Paragraph({
      text: `Generated on ${new Date().toLocaleDateString()} by Regulatory Intelligence Engine`,
      italics: true,
      size: 18,
      spacing: { before: 200 },
      color: '999999',
    })
  );

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

function getImpactColorHex(level: string | null): string {
  switch (level) {
    case 'high':
      return 'DC2626'; // Red
    case 'medium':
      return 'F59E0B'; // Amber
    case 'low':
      return '10B981'; // Green
    default:
      return '9CA3AF'; // Gray
  }
}

function getPriorityColorHex(priority: string): string {
  switch (priority) {
    case 'high':
      return 'DC2626'; // Red
    case 'medium':
      return 'F59E0B'; // Amber
    case 'low':
      return '10B981'; // Green
    default:
      return '9CA3AF'; // Gray
  }
}
