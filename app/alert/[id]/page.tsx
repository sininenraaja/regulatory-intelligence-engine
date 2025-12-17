import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRegulationById } from '@/lib/db/operations';
import { ImpactBadge } from '@/app/components/ImpactBadge';
import { ActionItemsTable } from '@/app/components/ActionItemsTable';
import { ExportButtons } from '@/app/components/ExportButtons';

export default async function DetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  const regulation = await getRegulationById(id);

  if (!regulation) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fi-FI', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">
          {regulation.title}
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-8 border-l-4 border-blue-600">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {regulation.title}
            </h1>
            <p className="text-gray-600">
              Published: {formatDate(regulation.published_date)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ImpactBadge level={regulation.impact_level} size="lg" />
          </div>
        </div>

        {/* Relevance Score */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Relevance Score
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {regulation.relevance_score !== null
                ? `${regulation.relevance_score}/100`
                : 'Not analyzed'}
            </span>
          </div>
          {regulation.relevance_score !== null && (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(regulation.relevance_score, 100)}%`,
                }}
              />
            </div>
          )}
          {regulation.relevance_reasoning && (
            <p className="text-sm text-gray-600 mt-4">
              {regulation.relevance_reasoning}
            </p>
          )}
        </div>

        {/* Links and Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-4">
          <a
            href={regulation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-4l8-8m0 0l-4 4m4-4v12" />
            </svg>
            View on Finlex
          </a>

          <div>
            <ExportButtons regulationId={regulation.id} />
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      {regulation.parsed_analysis ? (
        <div className="space-y-8">
          {/* Executive Summary */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              {regulation.parsed_analysis.executive_summary}
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Changes</h3>
            <ul className="space-y-2">
              {regulation.parsed_analysis.key_changes.map((change, idx) => (
                <li key={idx} className="flex gap-3 text-gray-700">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              Affected Business Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {regulation.parsed_analysis.affected_areas.map((area, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Impact Analysis */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Impact Analysis</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-1">Compliance Deadline</p>
                <p className="text-xl font-bold text-blue-600">
                  {regulation.parsed_analysis.compliance_deadline || 'To be determined'}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900 font-medium mb-1">Estimated Effort</p>
                <p className="text-lg font-semibold text-purple-600">
                  {regulation.parsed_analysis.estimated_effort}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-medium mb-2">Financial Impact</p>
                <p className="text-gray-700">{regulation.parsed_analysis.financial_impact}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900 font-medium mb-2">Risks if Non-Compliant</p>
                <p className="text-gray-700">{regulation.parsed_analysis.risks_if_ignored}</p>
              </div>
            </div>

            {regulation.parsed_analysis.kemira_specific_considerations && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 font-medium mb-2">Kemira-Specific Considerations</p>
                <p className="text-gray-700">
                  {regulation.parsed_analysis.kemira_specific_considerations}
                </p>
              </div>
            )}
          </div>

          {/* Action Items */}
          {regulation.parsed_analysis.action_items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Required Action Items</h2>
              <ActionItemsTable items={regulation.action_items} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-800 font-medium">Not yet analyzed</p>
          <p className="text-blue-600 text-sm mt-2">
            This regulation has not been analyzed by the AI system yet. It will be analyzed automatically when added to the system.
          </p>
        </div>
      )}

      {/* Regulation Details */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Regulation Details</h2>

        <div className="space-y-4 text-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-600">Description</p>
            <p className="mt-2">{regulation.description || 'No description available'}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-600">Finlex ID</p>
            <p className="mt-2 font-mono text-sm">{regulation.finlex_id}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-600">Published Date</p>
            <p className="mt-2">{formatDate(regulation.published_date)}</p>
          </div>

          {regulation.analyzed_at && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-600">Analyzed Date</p>
              <p className="mt-2">{formatDate(regulation.analyzed_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Back to Home */}
      <div className="text-center py-8">
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Regulations
        </Link>
      </div>
    </div>
  );
}
