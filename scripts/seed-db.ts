import { sql } from '@vercel/postgres';

interface RegulationData {
  title: string;
  description: string;
  source_url: string;
  published_date: string;
  finlex_id: string;
  relevance_score: number;
  relevance_reasoning: string;
  impact_level: 'high' | 'medium' | 'low' | 'none';
  full_analysis: {
    impact_level: 'high' | 'medium' | 'low';
    executive_summary: string;
    key_changes: string[];
    affected_areas: string[];
    compliance_deadline: string;
    action_items: Array<{
      department: string;
      action: string;
      deadline: string | null;
      priority: 'high' | 'medium' | 'low';
    }>;
    estimated_effort: string;
    financial_impact: string;
    risks_if_ignored: string;
  };
}

const sampleRegulations: RegulationData[] = [
  {
    title: 'Chemical Safety Data Sheets Amendment (2023)',
    description: 'Updated requirements for Safety Data Sheets (SDS) for chemical substances and mixtures under REACH regulation. New format requirements and digital availability mandates.',
    source_url: 'https://finlex.fi/fi/laki/ajantasa/2006/20060696',
    published_date: '2023-06-15',
    finlex_id: 'FL-2023-06-696',
    relevance_score: 92,
    relevance_reasoning: 'Direct impact on Kemira product documentation. Water treatment chemicals require comprehensive SDS updates affecting compliance and customer communication.',
    impact_level: 'high',
    full_analysis: {
      impact_level: 'high',
      executive_summary: 'Mandatory update of all Safety Data Sheets to comply with new digital accessibility requirements. Affects product labeling, customer documentation, and compliance procedures.',
      key_changes: [
        'Digital SDS format must be accessible 24/7',
        'New hazard pictogram requirements',
        'Extended substance identification fields',
        'Updated precautionary statement language'
      ],
      affected_areas: ['Product Documentation', 'Quality Assurance', 'Customer Service', 'Regulatory Compliance'],
      compliance_deadline: '2024-03-15',
      action_items: [
        {
          department: 'Quality Assurance',
          action: 'Audit all existing SDS documents against new requirements',
          deadline: '2024-01-31',
          priority: 'high'
        },
        {
          department: 'Technical Documentation',
          action: 'Update SDS templates and reformat all product documentation',
          deadline: '2024-02-28',
          priority: 'high'
        },
        {
          department: 'IT Systems',
          action: 'Implement digital SDS delivery system with 24/7 availability',
          deadline: '2024-02-15',
          priority: 'high'
        },
        {
          department: 'Customer Service',
          action: 'Train team on new SDS format and digital delivery',
          deadline: '2024-03-01',
          priority: 'medium'
        }
      ],
      estimated_effort: 'High - approximately 500 hours of documentation work across teams',
      financial_impact: 'Moderate - Digital system implementation costs estimated at €15,000-25,000 plus 300+ internal labor hours',
      risks_if_ignored: 'Non-compliance penalties up to €50,000, inability to market products in EU, customer trust issues'
    }
  },
  {
    title: 'REACH Amendment for Water Treatment Chemicals (2024)',
    description: 'New restrictions on certain chemical substances in water treatment applications. Enhanced monitoring requirements for registered substances with bioaccumulative properties.',
    source_url: 'https://finlex.fi/fi/laki/ajantasa/2006/20061907',
    published_date: '2024-01-10',
    finlex_id: 'FL-2024-01-1907',
    relevance_score: 88,
    relevance_reasoning: 'Critical impact on Kemira product portfolio. Several water treatment chemicals may be affected by new restrictions and require reformulation or substitution.',
    impact_level: 'high',
    full_analysis: {
      impact_level: 'high',
      executive_summary: 'Significant regulatory changes affecting water treatment chemical formulations. New restrictions on 8 substance categories and enhanced dossier requirements for registered substances.',
      key_changes: [
        'Restrictions on certain antimicrobial substances in water applications',
        'Enhanced bioaccumulation testing requirements',
        'New substance registration deadlines',
        'Mandatory safety review for legacy products'
      ],
      affected_areas: ['R&D and Product Development', 'Manufacturing', 'Product Registration', 'Supply Chain Management'],
      compliance_deadline: '2024-12-31',
      action_items: [
        {
          department: 'R&D',
          action: 'Conduct substance review and identify affected products',
          deadline: '2024-02-28',
          priority: 'high'
        },
        {
          department: 'R&D',
          action: 'Develop alternative formulations for restricted substances',
          deadline: '2024-06-30',
          priority: 'high'
        },
        {
          department: 'Regulatory Affairs',
          action: 'Prepare and submit REACH registration dossiers for new formulations',
          deadline: '2024-10-31',
          priority: 'high'
        },
        {
          department: 'Manufacturing',
          action: 'Update production procedures and supplier agreements',
          deadline: '2024-11-30',
          priority: 'medium'
        },
        {
          department: 'Sales & Marketing',
          action: 'Prepare customer communication for product changes',
          deadline: '2024-12-01',
          priority: 'medium'
        }
      ],
      estimated_effort: 'Very High - approximately 1,200+ hours for reformulation, testing, and registration',
      financial_impact: 'High - R&D costs €80,000-150,000, REACH registration fees €25,000-50,000, production line adjustments €40,000-80,000',
      risks_if_ignored: 'Market access loss, customer supply disruptions, significant fines (up to 10% annual revenue), reputational damage'
    }
  },
  {
    title: 'Environmental Reporting Standards Update (2024)',
    description: 'Enhanced environmental impact reporting requirements for chemical manufacturers. New emissions monitoring, water discharge limits, and waste management documentation standards.',
    source_url: 'https://finlex.fi/fi/laki/ajantasa/2011/20110527',
    published_date: '2024-03-20',
    finlex_id: 'FL-2024-03-527',
    relevance_score: 72,
    relevance_reasoning: 'Moderate impact on Kemira operations. Affects environmental reporting procedures and monitoring systems at manufacturing facilities.',
    impact_level: 'medium',
    full_analysis: {
      impact_level: 'medium',
      executive_summary: 'New environmental reporting framework requiring enhanced monitoring and documentation of chemical manufacturing processes. Affects emissions, water discharge, and waste management reporting.',
      key_changes: [
        'Quarterly environmental impact reporting (was annual)',
        'Real-time emissions monitoring requirements',
        'Enhanced water discharge testing protocols',
        'Waste stream classification updates'
      ],
      affected_areas: ['Environmental Management', 'Operations', 'Compliance & Legal', 'Occupational Health & Safety'],
      compliance_deadline: '2024-09-30',
      action_items: [
        {
          department: 'Environmental Management',
          action: 'Upgrade environmental monitoring systems and implement real-time tracking',
          deadline: '2024-06-30',
          priority: 'high'
        },
        {
          department: 'Operations',
          action: 'Update facility procedures and train staff on new reporting requirements',
          deadline: '2024-07-31',
          priority: 'medium'
        },
        {
          department: 'Compliance',
          action: 'Create new reporting templates and implement quarterly submission schedule',
          deadline: '2024-08-15',
          priority: 'medium'
        }
      ],
      estimated_effort: 'Medium - approximately 400 hours for system upgrades and training',
      financial_impact: 'Moderate - Environmental system upgrades €30,000-50,000, consulting fees €10,000-15,000, no production impact',
      risks_if_ignored: 'Environmental violation fines €20,000-100,000, operational shutdowns possible, public disclosure of non-compliance'
    }
  }
];

async function seedDatabase() {
  console.log('🌱 Seeding database with sample regulations...');

  try {
    for (const reg of sampleRegulations) {
      console.log(`\n📝 Adding: ${reg.title}`);

      // Insert regulation
      const result = await sql`
        INSERT INTO regulations (
          title,
          description,
          source_url,
          published_date,
          finlex_id,
          relevance_score,
          relevance_reasoning,
          impact_level,
          full_analysis,
          analyzed_at,
          created_at,
          updated_at
        ) VALUES (
          ${reg.title},
          ${reg.description},
          ${reg.source_url},
          ${reg.published_date},
          ${reg.finlex_id},
          ${reg.relevance_score},
          ${reg.relevance_reasoning},
          ${reg.impact_level},
          ${JSON.stringify(reg.full_analysis)},
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const regulationId = result.rows[0].id;
      console.log(`   ✅ Regulation inserted with ID: ${regulationId}`);

      // Insert action items
      if (reg.full_analysis.action_items.length > 0) {
        for (const item of reg.full_analysis.action_items) {
          await sql`
            INSERT INTO action_items (
              regulation_id,
              department,
              action_description,
              deadline,
              priority,
              status,
              created_at
            ) VALUES (
              ${regulationId},
              ${item.department},
              ${item.action},
              ${item.deadline || null},
              ${item.priority},
              'pending',
              NOW()
            );
          `;
        }
        console.log(`   ✅ ${reg.full_analysis.action_items.length} action items added`);
      }
    }

    console.log('\n✅ Database seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   • ${sampleRegulations.length} regulations inserted`);
    console.log(`   • ${sampleRegulations.reduce((sum, r) => sum + r.full_analysis.action_items.length, 0)} action items created`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
