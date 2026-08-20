import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Loader2, FileText, RefreshCw, ChevronDown, ChevronUp,
  Search, Hash, BookOpen, Database, Copy, Check, Tag,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const ChunkCard: React.FC<{ chunk: CitationDto; index: number }> = ({ chunk, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const score = chunk.similarityScore != null ? chunk.similarityScore : null;
  const pct = score != null ? (score * 100).toFixed(1) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chunk.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      'border rounded-xl bg-[#1e293b] overflow-hidden group transition-all duration-200',
      expanded ? 'border-indigo-500/40' : 'border-[#334155] hover:border-[#475569]'
    )}>
      {/* Chunk header */}
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index badge */}
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/15 border border-indigo-500/25 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-indigo-400">#{chunk.chunkIndex ?? index}</span>
        </div>

        {/* File + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{chunk.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {chunk.pageNumber != null && (
              <span className="text-xs text-slate-500 flex items-center gap-0.5">
                <FileText className="w-2.5 h-2.5" /> p.{chunk.pageNumber}
              </span>
            )}
            <span className="text-xs text-slate-600 line-clamp-1 max-w-[180px]">
              {chunk.snippet.slice(0, 60)}…
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct != null && (
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
              {pct}%
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-all rounded"
            title="Copy chunk"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#334155]/60 animate-fade-in">
          {/* Full text */}
          <div className="mx-4 mt-3 mb-0">
            <div className="relative bg-[#0f172a] border border-[#334155] rounded-xl p-4">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-xs">{chunk.snippet}</p>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Metadata grid */}
          {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
            <div className="px-4 pt-3 pb-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1 font-medium">
                <Hash className="w-3 h-3" /> Metadata
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(chunk.metadata)
                  .filter(([k]) => !['snippet'].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="bg-[#0f172a] border border-[#334155] rounded-lg p-2">
                      <p className="text-[10px] text-slate-500 capitalize font-medium">{k.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-200 mt-0.5 truncate font-mono">{String(v)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChunksView: React.FC = () => {
  const { selectedDocumentId, documents } = useDocumentStore();
  const [chunks, setChunks] = useState<CitationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [textFilter, setTextFilter] = useState('');

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const loadChunks = useCallback(async (q = query) => {
    setIsLoading(true);
    try {
      const res = await chatApi.searchSimilarity({
        query: q.trim() || 'document content text data information',
        documentId: selectedDocumentId ?? undefined,
        topK: 50,
        similaritySearch: 0.0,
      });
      setChunks(res.data.matches);
      setHasLoaded(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load chunks');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentId, query]);

  useEffect(() => {
    if (selectedDocumentId) loadChunks();
    else { setChunks([]); setHasLoaded(false); }
  }, [selectedDocumentId, loadChunks]);

  const filtered = textFilter
    ? chunks.filter((c) =>
        c.snippet.toLowerCase().includes(textFilter.toLowerCase()) ||
        c.fileName.toLowerCase().includes(textFilter.toLowerCase())
      )
    : chunks;

  const uniqueFiles = [...new Set(chunks.map((c) => c.fileName))];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0f172a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e293b] flex-shrink-0 bg-[#111827]">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Vector Chunks</h2>
            {hasLoaded && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-[#1e293b] border border-[#334155] text-slate-300 px-2 py-0.5 rounded-full">
                  {filtered.length} / {chunks.length}
                </span>
                {uniqueFiles.length > 1 && (
                  <span className="text-xs text-slate-500">{uniqueFiles.length} files</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => loadChunks()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs border border-[#334155] hover:border-[#475569] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Vector query input */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-[#1e293b] border border-[#334155] rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
            <Database className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadChunks()}
              placeholder="Vector search query (leave blank for all)"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <button
            onClick={() => loadChunks()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-indigo-500/25"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Load
          </button>
        </div>

        {/* Text filter */}
        {hasLoaded && chunks.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1e293b] border border-[#334155] rounded-xl px-3 py-2 focus-within:border-indigo-500/30 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Filter chunks by text content…"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {textFilter && (
              <button onClick={() => setTextFilter('')} className="text-slate-500 hover:text-white text-xs">✕</button>
            )}
          </div>
        )}
      </div>

      {/* Chunk list */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasLoaded && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-[#1e293b] rounded-2xl flex items-center justify-center mb-5 border border-[#334155]">
              <Layers className="w-9 h-9 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Explore Vector Chunks</h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
              {selectedDoc
                ? `Browse the ${selectedDoc.filename} vector chunks stored in pgvector`
                : 'Select a document from the sidebar or click Load to browse all chunks'}
            </p>
            <button
              onClick={() => loadChunks()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-indigo-500/25"
            >
              <Layers className="w-4 h-4" /> Load All Chunks
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Fetching chunks from vector store…</p>
              <p className="text-xs text-slate-500 mt-1">Querying pgvector database</p>
            </div>
          </div>
        )}

        {hasLoaded && !isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Tag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">{textFilter ? 'No chunks match that filter' : 'No chunks found'}</p>
            <p className="text-sm text-slate-500 mt-1">
              {textFilter ? 'Try different filter text' : 'Upload and index documents to see chunks here'}
            </p>
          </div>
        )}

        {hasLoaded && !isLoading && filtered.length > 0 && (
          <div className="space-y-2.5">
            {filtered.map((chunk, i) => (
              <ChunkCard key={`${chunk.documentId}-${chunk.chunkIndex}-${i}`} chunk={chunk} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChunksView;
