'use client';

import { useState, useEffect } from 'react';
import { Regulation } from '@/types';
import { RegulationCard } from './components/RegulationCard';

export default function Home() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'impact' | 'relevance'>('newest');

  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filter !== 'all') params.append('impact_level', filter);
        if (search) params.append('search', search);
        params.append('sort', sort);

        const response = await fetch(`/api/regulations?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch regulations');
        }

        const data = await response.json();
        setRegulations(data.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load regulations';
        setError(message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRegulations, 300);
    return () => clearTimeout(timer);
  }, [filter, search, sort]);

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

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search regulations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Impact Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact Level
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">All Levels</option>
              <option value="high">High Impact</option>
              <option value="medium">Medium Impact</option>
              <option value="low">Low Impact</option>
              <option value="none">Not Relevant</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="impact">Highest Impact</option>
              <option value="relevance">Highest Relevance</option>
            </select>
          </div>
        </div>
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
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-600 mt-4">Loading regulations...</p>
        </div>
      ) : error ? (
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
            The Finlex RSS monitor will fetch regulations every 6 hours on Vercel.
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
