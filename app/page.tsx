import { Regulation } from '@/types';
import { RegulationCard } from './components/RegulationCard';
import { getAllRegulations } from '@/lib/db/operations';

export default async function Home() {
  // Regulatory Intelligence Engine - Kemira Dashboard
  // Server-side rendering for Netlify compatibility
  let regulations: Regulation[] = [];
  let error: string | null = null;

  try {
    const result = await getAllRegulations({
      sort: 'newest',
      limit: 100,
      offset: 0,
    });
    regulations = result.regulations;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load regulations';
    console.error('Database fetch error:', err);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Regulatory Intelligence Engine
        </h1>
        <p className="text-xl text-gray-600">
          Finnish chemical industry regulations monitored and analyzed for Kemira Oyj
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Regulations</p>
          <p className="text-2xl font-bold text-gray-900">{regulations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">High Impact</p>
          <p className="text-2xl font-bold text-red-600">
            {regulations.filter((r) => r.impact_level === 'high').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Medium Impact</p>
          <p className="text-2xl font-bold text-amber-600">
            {regulations.filter((r) => r.impact_level === 'medium').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Analyzed</p>
          <p className="text-2xl font-bold text-blue-600">
            {regulations.filter((r) => r.analyzed_at).length}
          </p>
        </div>
      </div>

      {/* Regulations List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            Make sure the database is initialized and seed data is available.
          </p>
        </div>
      ) : regulations.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 font-medium">No regulations found</p>
          <p className="text-blue-600 text-sm mt-2">
            The Finlex RSS monitor will fetch regulations automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regulations.map((regulation) => (
            <RegulationCard key={regulation.id} regulation={regulation} />
          ))}
        </div>
      )}
    </div>
  );
}
