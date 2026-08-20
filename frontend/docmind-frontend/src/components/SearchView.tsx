import React, { useState } from 'react';
import {
  Search, Loader2, FileText, ChevronDown, ChevronUp,
  AlertCircle, Layers, SlidersHorizontal, Tag,
  BarChart2,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { CitationDto, SearchResultDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SEARCH_TYPES = [
  { label: 'All', icon: '🔍', placeholder: 'Search any concept, topic or keyword…', color: 'indigo' },
  { label: 'Clauses', icon: '📜', placeholder: 'Find specific clauses or provisions…', color: 'blue' },
  { label: 'Facts & Data', icon: '📊', placeholder: 'Find facts, figures and statistics…', color: 'emerald' },
  { label: 'Definitions', icon: '📚', placeholder: 'Look up defined terms…', color: 'purple' },
];

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-600 text-white',
  blue: 'bg-blue-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  purple: 'bg-purple-600 text-white',
};

function getScoreColor(score: number) {
  if (score >= 0.8) return { bar: 'bg-emerald-500', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', label: 'High' };
  if (score >= 0.6) return { bar: 'bg-amber-500', badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20', label: 'Med' };
  return { bar: 'bg-red-500', badge: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Low' };
}

const ResultCard: React.FC<{ match: CitationDto; index: number }> = ({ match, index }) => {
  const [expanded, setExpanded] = useState(false);
  const score = match.similarityScore ?? 0;
  const pct = (score * 100).toFixed(1);
  const { bar, badge, label } = getScoreColor(score);

  return (
    <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#1e293b] hover:border-[#475569] transition-all duration-200 animate-fade-in group">
      {/* Top color accent strip */}
      <div className={clsx('h-0.5 w-full', bar)} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-7 h-7 bg-[#0f172a] border border-[#334155] rounded-lg flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-indigo-500/40 transition-colors">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-white truncate max-w-xs">{match.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {match.pageNumber && (
                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                      <FileText className="w-3 h-3" /> p.{match.pageNumber}
                    </span>
                  )}
                  {match.chunkIndex != null && (
                    <span className="text-xs text-slate-500">chunk #{match.chunkIndex}</span>
                  )}
                </div>
              </div>
              {/* Score badge */}
              <div className="text-right flex-shrink-0">
                <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border', badge)}>
                  {label} · {pct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Similarity bar */}
        <div className="w-full bg-[#0f172a] rounded-full h-1 mb-3">
          <div className={clsx('h-1 rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
        </div>

        {/* Snippet */}
        <p className={clsx('text-sm text-slate-300 leading-relaxed', !expanded && 'line-clamp-3')}>
          {match.snippet}
        </p>

        {match.snippet.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
          </button>
        )}

        {/* Metadata pills */}
        {match.metadata && Object.keys(match.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#334155]/60">
            {Object.entries(match.metadata)
              .filter(([k]) => !['documentId', 'fileName', 'snippet'].includes(k))
              .slice(0, 5)
              .map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 text-xs bg-[#0f172a] text-slate-400 px-2 py-0.5 rounded-full border border-[#334155]">
                  <Tag className="w-2.5 h-2.5" />
                  <span className="text-slate-500">{k}:</span> {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SearchView: React.FC = () => {
  const { selectedDocumentId, documents } = useDocumentStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultDto | null>(null);
  const [topK, setTopK] = useState(10);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [selectedType, setSelectedType] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await chatApi.searchSimilarity({
        query: query.trim(),
        documentId: selectedDocumentId ?? undefined,
        topK,
        similaritySearch: minSimilarity,
      });
      setResults(res.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const EXAMPLE_QUERIES = [
    'payment terms', 'termination clause', 'liability cap', 'force majeure',
    'intellectual property', 'governing law', 'warranty',
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0f172a]">
      {/* Search header */}
      <div className="px-6 py-4 border-b border-[#1e293b] flex-shrink-0 bg-[#111827]">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Semantic Search</h2>
            {selectedDoc && (
              <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/25">
                {selectedDoc.filename}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
              showFilters
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                : 'border-[#334155] text-slate-400 hover:text-white'
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Filters {showFilters && '✓'}
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5 no-scrollbar">
          {SEARCH_TYPES.map((type, i) => (
            <button
              key={i}
              onClick={() => setSelectedType(i)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                selectedType === i
                  ? COLOR_MAP[type.color] + ' shadow-sm'
                  : 'bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-white'
              )}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#1e293b] border border-[#334155] rounded-xl px-4 py-2.5 focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={SEARCH_TYPES[selectedType].placeholder}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white transition-colors">
                <ChevronUp className="w-3.5 h-3.5 rotate-180" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-indigo-500/30"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-[#0f172a] rounded-xl border border-[#334155] animate-fade-in">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-slate-400 font-medium">Top Results</label>
                  <span className="text-xs font-bold text-indigo-400">{topK}</span>
                </div>
                <input
                  type="range" min={1} max={25} value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full h-1.5 accent-indigo-500 bg-[#334155] rounded-full"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                  <span>1</span><span>25</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-slate-400 font-medium">Min Similarity</label>
                  <span className="text-xs font-bold text-indigo-400">{(minSimilarity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05} value={minSimilarity}
                  onChange={(e) => setMinSimilarity(Number(e.target.value))}
                  className="w-full h-1.5 accent-indigo-500 bg-[#334155] rounded-full"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                  <span>0%</span><span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Example chips */}
        {!results && !isSearching && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-slate-600">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-xs bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 px-2.5 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {!results && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-[#1e293b] rounded-2xl flex items-center justify-center mb-5 border border-[#334155]">
              <Search className="w-9 h-9 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Search your documents</h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Use vector similarity search to find relevant clauses, concepts, facts, and definitions across all your indexed documents.
            </p>
          </div>
        )}

        {isSearching && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Searching vector store…</p>
              <p className="text-xs text-slate-500 mt-1">Running similarity search across document embeddings</p>
            </div>
          </div>
        )}

        {results && !isSearching && (
          <div>
            {/* Results summary bar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-white">
                    {results.totalMatches} result{results.totalMatches !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-slate-500 text-sm">for</span>
                <span className="text-sm font-semibold text-indigo-400">"{results.query}"</span>
              </div>

              <div className="flex items-center gap-2">
                {results.totalMatches === 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> No matches
                  </div>
                ) : (
                  <button
                    onClick={() => setResults(null)}
                    className="text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {results.totalMatches === 0 ? (
              <div className="text-center py-16">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No matching chunks found</p>
                <p className="text-sm text-slate-500 mt-1">Try a different query or reduce the similarity threshold in filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.matches.map((match, i) => (
                  <ResultCard key={i} match={match} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
