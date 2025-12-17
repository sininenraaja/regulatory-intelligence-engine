import Link from 'next/link';
import { Regulation } from '@/types';
import { ImpactBadge } from './ImpactBadge';

interface RegulationCardProps {
  regulation: Regulation;
}

export function RegulationCard({ regulation }: RegulationCardProps) {
  const truncatedDescription = regulation.description
    ?.substring(0, 120)
    .concat('...')
    || 'No description available';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fi-FI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/alert/${regulation.id}`}>
      <div className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 p-5 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {regulation.title}
          </h3>
          <div className="ml-2 flex-shrink-0">
            <ImpactBadge level={regulation.impact_level} size="sm" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {truncatedDescription}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Relevance:</span>
            <span className="font-semibold text-gray-900">
              {regulation.relevance_score !== null
                ? `${regulation.relevance_score}/100`
                : 'Not analyzed'}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(regulation.relevance_score || 0, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>{formatDate(regulation.published_date)}</span>
          <span className="text-blue-600 font-medium hover:text-blue-800">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
