import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

export default function ProjectAIBrief({ project }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const prevDocCountRef = useRef(null);

  // Watch project documents — auto-refresh brief when new docs are uploaded
  const { data: docs = [] } = useQuery({
    queryKey: ['project-documents', project.id],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: project.id }, '-created_date', 50),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (prevDocCountRef.current !== null && docs.length > prevDocCountRef.current && brief) {
      generate();
    }
    prevDocCountRef.current = docs.length;
  }, [docs.length]);

  const generate = async () => {
    setLoading(true);
    setBrief(null);

    // Summarise uploaded documents as context
    const docContext = docs.length > 0
      ? `\n\nUploaded project documents (use these to cross-check information):\n${docs.map(d => `- ${d.name} (${d.document_category}): ${d.notes || 'no notes'}`).join('\n')}`
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a friendly sourcing advisor for Thammachart Seafood Retail, a Thai seafood importer. Write in a warm, conversational tone — like a knowledgeable colleague giving a quick briefing, not a formal report. Keep each section short and practical. Focus entirely on the Thai import market context.

Use web search to find current data where helpful.

Project details:
- Product: ${project.product_category} — ${project.product_specification || ''}
- Origin: ${project.target_origin || 'not specified'}
- Target price: ${project.target_price ? `${project.target_price} ${project.target_price_currency || 'USD'}` : 'not set'}
- Volume: ${project.target_volume || 'not set'}
- Certifications needed: ${project.required_certifications || 'none specified'}
- Request: ${project.customer_request || 'none'}
- Status: ${project.status} | Deadline: ${project.deadline || 'none'}
- Notes: ${project.notes || 'none'}${docContext}

Write a brief covering these 4 things (keep each section to 2–4 sentences max):
1. snapshot — A quick market snapshot: what's happening in Thailand right now for this product? Is there good supply? Any seasonality or news to be aware of?
2. price_verdict — Is our target price realistic for the Thai market right now? Give a rough price range if you can find one, and a simple verdict (good / a bit low / too high).
3. watch_out — What's the 1–2 most important things to watch out for when importing this into Thailand? (Thai FDA, duty rates, certification requirements, logistics, etc.)
4. next_steps — What should we do next — 2 or 3 simple action items based on where this project is right now.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          snapshot: { type: 'string' },
          price_verdict: { type: 'string' },
          watch_out: { type: 'string' },
          next_steps: { type: 'array', items: { type: 'string' } },
        },
        required: ['snapshot', 'price_verdict', 'watch_out', 'next_steps']
      }
    });
    setBrief(result);
    setLoading(false);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 cursor-pointer"
        onClick={() => brief && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-800">AI Sourcing Brief</span>
        </div>
        <div className="flex items-center gap-2">
          {brief && (
            <button onClick={e => { e.stopPropagation(); generate(); }} className="p-1 rounded hover:bg-violet-100 text-violet-500" title="Regenerate">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {!brief && !loading && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100" onClick={e => { e.stopPropagation(); generate(); }}>
              <Sparkles className="w-3 h-3 mr-1" /> Generate Brief
            </Button>
          )}
          {loading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
          {brief && (expanded ? <ChevronDown className="w-4 h-4 text-violet-400" /> : <ChevronRight className="w-4 h-4 text-violet-400" />)}
        </div>
      </div>

      {loading && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-400" />
          <p>Searching the web &amp; analyzing project data...</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Fetching live market prices, competitors &amp; trade data</p>
        </div>
      )}

      {brief && expanded && (
        <div className="px-4 py-4 space-y-3 text-sm">

          {/* Market Snapshot */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">🌏 Market Snapshot</p>
            <p className="text-sm text-slate-800 leading-relaxed">{brief.snapshot}</p>
          </div>

          {/* Price Verdict */}
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs font-semibold text-amber-600 mb-1">💰 Price Check</p>
            <p className="text-sm text-amber-900 leading-relaxed">{brief.price_verdict}</p>
          </div>

          {/* Watch Out */}
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <p className="text-xs font-semibold text-red-500 mb-1">⚠️ Things to Watch Out For</p>
            <p className="text-sm text-red-900 leading-relaxed">{brief.watch_out}</p>
          </div>

          {/* Next Steps */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-xs font-semibold text-emerald-600 mb-2">✅ Suggested Next Steps</p>
            <ol className="space-y-1.5">
              {brief.next_steps?.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          {docs.length > 0 && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
              <RefreshCw className="w-3 h-3" /> Auto-refreshes when documents are uploaded ({docs.length} doc{docs.length !== 1 ? 's' : ''} indexed)
            </p>
          )}
        </div>
      )}
    </div>
  );
}