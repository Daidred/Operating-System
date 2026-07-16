import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, Bot, User, RefreshCw } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Which projects need immediate attention this week?",
  "Which suppliers have the best prices and are Thai FDA compliant?",
  "What are the import duty implications for our current quotations?",
  "Which follow-ups are overdue and what should I prioritize?",
  "Suggest a sourcing strategy for the Thai retail market this season",
  "Are there any certifications missing for exporting to EU markets from Thailand?",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-violet-100 text-violet-600'}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[80%] px-3 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm text-foreground'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AIAdvisor() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Sourcing Advisor, specialized in Thailand's seafood import & export market. I have access to your live CRM data — projects, suppliers, quotations, samples, and follow-ups. Ask me anything about your sourcing pipeline, Thai FDA requirements, import duties, certifications, or trade strategy." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const { data: projects = [] } = useQuery({ queryKey: ['sourcing-projects'], queryFn: () => base44.entities.SourcingProject.list('-created_date', 200) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 100) });
  const { data: quotations = [] } = useQuery({ queryKey: ['quotations'], queryFn: () => base44.entities.Quotation.list('-created_date', 100) });
  const { data: followups = [] } = useQuery({ queryKey: ['followups'], queryFn: () => base44.entities.FollowUp.list('-created_date', 100) });
  const { data: samples = [] } = useQuery({ queryKey: ['samples'], queryFn: () => base44.entities.Sample.list('-created_date', 100) });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildContext = () => {
    const activeProjects = projects.filter(p => !p.archived);
    const today = new Date().toISOString().split('T')[0];
    const overdueFollowups = followups.filter(f => f.next_followup_date && f.next_followup_date <= today && f.reply_status !== 'Replied');

    return `## Sourcing CRM Data Summary (as of today ${today})

### Active Sourcing Projects (${activeProjects.length} total):
${activeProjects.map(p => `- [${p.priority}] ${p.name} | ${p.product_category} | ${p.target_origin || 'N/A'} | Status: ${p.status} | Deadline: ${p.deadline || 'N/A'} | Target: ${p.target_price ? `${p.target_price} ${p.target_price_currency}` : 'N/A'} | Next Action: ${p.next_action || 'None'} | Follow-up: ${p.next_followup_date || 'N/A'}`).join('\n')}

### Suppliers (${suppliers.length} total):
${suppliers.slice(0, 30).map(s => `- ${s.name} | ${s.country} | Status: ${s.status} | Approval: ${s.approval_status} | Categories: ${s.product_categories || 'N/A'}`).join('\n')}

### Recent Quotations (${quotations.length} total):
${quotations.slice(0, 20).map(q => `- ${q.supplier_name} | ${q.product} | ${q.price} ${q.currency} ${q.incoterm || ''} | ${q.status} | Validity: ${q.validity_date || 'N/A'}`).join('\n')}

### Overdue Follow-ups (${overdueFollowups.length}):
${overdueFollowups.slice(0, 15).map(f => `- ${f.supplier_name} | ${f.project_name || 'N/A'} | Due: ${f.next_followup_date} | Status: ${f.reply_status} | Priority: ${f.priority}`).join('\n')}

### Samples (${samples.length} total):
${samples.slice(0, 15).map(s => `- ${s.supplier_name} | ${s.product} | ${s.evaluation_status} | Result: ${s.quality_result} | Decision: ${s.final_decision}`).join('\n')}`;
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const context = buildContext();
    const history = newMessages.slice(-8).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert AI Sourcing Advisor for Thammachart Seafood Retail, a Thai seafood company involved in both importing and exporting seafood products. You specialize in the Thai seafood trade context and have deep knowledge of:
- Thai FDA import/export regulations and documentation requirements (health certificates, import permits)
- Thai customs procedures: HS codes for seafood, import duties, VAT (7%), and excise considerations
- Key Thai seafood certifications: GMP/HACCP (Thai FDA), BRC, IFS, ASC, MSC, BAP, EU approval, US FDA registration
- Major Thai seafood processing and trade hubs: Samut Sakhon, Songkhla, Rayong, Chonburi
- ASEAN Free Trade Agreement benefits for seafood traded within ASEAN
- Typical Thai baht (THB) / USD price benchmarks for imported and exported seafood
- Seasonal availability and harvest cycles for key seafood species traded in Thailand
- Common Thai import origins: Vietnam, India, Indonesia, Ecuador, China, Norway
- Common Thai export destinations: Japan, EU, USA, China, Australia

You have access to live data from Thammachart's Sourcing CRM.

${context}

### Conversation so far:
${history}

Instructions:
- Be concise, practical, and actionable
- Always frame advice in the context of Thai import/export trade
- Reference Thai regulatory requirements when relevant (Thai FDA, customs, certifications)
- Use bullet points and structure when helpful
- Reference specific project names, supplier names, and dates from the data
- If asked about priorities, use deadlines, urgency levels, and overdue follow-ups
- If you don't have enough data to answer, say so and suggest what information to add
- Today's date is ${new Date().toISOString().split('T')[0]}

Respond to the latest user message.`,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const clearChat = () => setMessages([{
    role: 'assistant',
    content: "Chat cleared. How can I help you with your Thai seafood import/export sourcing pipeline?"
  }]);

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Sourcing Advisor</p>
            <p className="text-xs text-muted-foreground">Powered by your live CRM data</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Clear chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div className="bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span className="text-xs text-muted-foreground">Analyzing your data...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && !loading && (
        <div className="mt-4 shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors text-left">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-4 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about your projects, suppliers, quotations..."
          className="flex-1 h-9 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 bg-card"
          disabled={loading}
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}