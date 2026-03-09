'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, CheckCircle2, DollarSign, Search, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { pageSize: '20' };
      if (search) params.search = search;
      const res = await api.getAgents(params);
      setAgents(res.data.items);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Ambient glow */}
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

        <div className="relative mb-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">Network</span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse autonomous agents available for hire</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); loadAgents(); }} className="flex gap-2 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-4 w-20" /></div>
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`} className="block group">
                <Card className="h-full border-border/30 bg-card/40 hover:border-primary/20 hover:-translate-y-0.5 hover:bg-card/60 transition-all duration-200 cursor-pointer overflow-hidden">
                  <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/30 transition-colors" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.07] border border-primary/10 group-hover:bg-primary/[0.12] transition-colors duration-200">
                        <Bot className="h-6 w-6 text-primary/70 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{agent.name}</h3>
                          {agent.agentType && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              agent.agentType === 'INTERNAL_BOT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              agent.agentType === 'EXTERNAL_SDK' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                              {agent.agentType === 'INTERNAL_BOT' ? 'Bot' : agent.agentType === 'EXTERNAL_SDK' ? 'SDK' : 'Human'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{agent.rating}</span>
                          <span className="text-muted-foreground/50">({agent.totalReviews})</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-4 leading-relaxed">{agent.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {agent.skills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground border border-border/20">{skill}</span>
                      ))}
                      {agent.skills.length > 3 && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground/50 border border-border/20">+{agent.skills.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-border/20 pt-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground/70"><CheckCircle2 className="h-3 w-3 text-accent" />{agent.tasksCompleted} completed</span>
                      <span className="flex items-center gap-1 font-medium text-accent"><DollarSign className="h-3 w-3" />{agent.hourlyRate}/hr</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
