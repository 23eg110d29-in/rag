import React from 'react';
import GlassCard from './GlassCard';
import { Target, HelpCircle, Activity } from 'lucide-react';

const DebugPanel = ({ retrievedChunks, query, settings }) => {
  // Tokenize the query for term matching visualization (mirroring backend logic)
  const getQueryTokens = (text) => {
    if (!text) return [];
    const STOPWORDS = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
      'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
      'can', 'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
      'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have',
      'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him',
      'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
      'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
      'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
      'own', 'same', 'shannt', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such',
      'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres',
      'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
      'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent',
      'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom',
      'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
      'your', 'yours', 'yourself', 'yourselves'
    ]);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
    return Array.from(new Set(words));
  };

  const queryTokens = getQueryTokens(query);
  const expandedTokens = retrievedChunks?.[0]?.matchedQueryTokens || queryTokens;

  // Helper to highlight matching tokens in chunk text
  const highlightText = (text, tokens) => {
    if (!tokens || tokens.length === 0) return text;
    
    // Create regex matching any of the tokens (word boundaries)
    // Escaping regex chars
    const escapedTokens = tokens
      .map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .filter(Boolean);
      
    if (escapedTokens.length === 0) return text;
    
    const regex = new RegExp(`\\b(${escapedTokens.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      const isMatch = tokens.includes(part.toLowerCase());
      return isMatch ? (
        <span key={index} className="bg-cyan-500/20 text-cyan-300 font-semibold px-0.5 rounded border border-cyan-500/30">
          {part}
        </span>
      ) : (
        part
      );
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Target size={16} className="text-cyan-400" />
            Retrieval Debugger
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing chunk scores for query: <span className="font-mono text-cyan-400">"{query}"</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Mode', settings?.mode || retrievedChunks?.[0]?.retrievalConfig?.mode || retrievedChunks?.[0]?.retrievalMode || 'adaptive'],
          ['Top K', settings?.topK || retrievedChunks.length || 5],
          ['Pool', settings?.candidatePool || 30]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/5 border border-white/10 px-2 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-semibold">{label}</p>
            <p className="text-xs text-slate-200 font-mono mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        {[
          ['Hybrid', settings?.hybridEnabled],
          ['Rerank', settings?.rerankEnabled],
          ['Expansion', settings?.expansionEnabled]
        ].map(([label, enabled]) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
              enabled
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-slate-500'
            }`}
          >
            <Activity size={10} />
            {label}
          </span>
        ))}
      </div>

      {/* Query Token Analysis */}
      {expandedTokens.length > 0 && (
        <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/20">
          <p className="text-[10px] font-semibold uppercase text-cyan-400 tracking-wider mb-2">Matched / Expanded Terms</p>
          <div className="flex flex-wrap gap-2">
            {expandedTokens.map((token, idx) => (
              <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 font-mono">
                {token}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retrieval results list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {retrievedChunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
            <HelpCircle size={40} className="text-slate-700 mb-2" />
            <p className="font-bold text-slate-400 text-sm">No Chunks Retrieved</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Ask a question in the chat to see source chunk rankings.
            </p>
          </div>
        ) : (
          retrievedChunks.map((chunk, idx) => (
            <GlassCard key={idx} className="p-5 border border-white/5 space-y-4 hover:border-indigo-500/20 transition-colors">
              {/* Header metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 font-mono text-cyan-400 font-bold border border-white/5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-[250px]" title={chunk.source}>
                      {chunk.source}
                    </p>
                    <p className="text-[10px] text-slate-500">Chunk Index: {chunk.index || 'N/A'}</p>
                  </div>
                </div>
                {/* Ranking Score */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Score:</span>
                  <span className="font-mono text-white font-bold bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                    {(chunk.rerankScore ?? chunk.finalScore ?? chunk.score ?? 0).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Math breakdown */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-black/20 border border-white/5 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Semantic</span>
                    <span className="text-cyan-400">{(chunk.semanticScore || 0).toFixed(4)}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${(chunk.semanticScore || 0) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Raw sim: {(chunk.semanticScore || 0).toFixed(4)}</div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Keyword</span>
                    <span className="text-purple-400">{(chunk.keywordScore || 0).toFixed(4)}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400" style={{ width: `${(chunk.keywordScore || 0) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Raw match: {(chunk.keywordScore || 0).toFixed(4)}</div>
                </div>
              </div>

              {chunk.reranker && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Reranker: {chunk.reranker}
                  {typeof chunk.phraseScore === 'number' ? ` | Phrase: ${chunk.phraseScore.toFixed(4)}` : ''}
                  {typeof chunk.finalScore === 'number' ? ` | Hybrid: ${chunk.finalScore.toFixed(4)}` : ''}
                </div>
              )}

              {/* Text context with highlighting */}
              <div className="p-4 rounded-xl bg-darkBg/60 border border-white/5 text-xs leading-relaxed text-slate-300 max-h-40 overflow-y-auto font-sans">
                {highlightText(chunk.text, queryTokens)}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
