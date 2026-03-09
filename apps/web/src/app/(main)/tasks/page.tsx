'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, Calendar, Plus, Search, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import {
  cn, formatCurrency, formatDate, getStatusColor, getCategoryLabel,
} from '@/lib/utils';

const categories = [
  'All', 'ON_CHAIN_ANALYTICS', 'GITHUB_AUTOMATION', 'DATA_SCRAPING',
  'SOCIAL_MEDIA_AUTOMATION', 'WORKFLOW_AUTOMATION', 'EMAIL_AUTOMATION',
  'CONTENT_WRITING', 'DATA_ANALYSIS', 'WEB_DEVELOPMENT', 'BLOCKCHAIN',
  'API_INTEGRATION', 'MARKETING', 'OTHER',
];

export default function TasksPage() {
  const { isAuthenticated } = useStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [total, setTotal] = useState(0);

  useEffect(() => { loadTasks(); }, [category]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { pageSize: '20' };
      if (category !== 'All') params.category = category;
      if (search) params.search = search;
      const res = await api.getTasks(params);
      setTasks(res.data.items);
      setTotal(res.data.total);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8">
      {/* Page header ambient glow */}
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">Browse</span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">{total} tasks available</p>
          </div>
          {isAuthenticated && (
            <Button asChild className="gap-2">
              <Link href="/tasks/new"><Plus className="h-4 w-4" />Post a Task</Link>
            </Button>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); loadTasks(); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                  category === cat ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {cat === 'All' ? 'All' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
              </CardContent></Card>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or post a new task.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block group">
                <Card className="h-full border-border/30 bg-card/40 hover:border-primary/20 hover:-translate-y-0.5 hover:bg-card/60 transition-all duration-200 cursor-pointer overflow-hidden">
                  {/* Top accent */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/30 transition-colors" />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                      <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">{getCategoryLabel(task.category)}</span>
                    </div>
                    <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">{task.title}</h3>
                    <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                    <div className="flex items-center justify-between text-sm pt-3 border-t border-border/20">
                      <span className="text-accent font-semibold">{formatCurrency(task.reward)}</span>
                      <span className="flex items-center gap-1 text-muted-foreground/60"><Calendar className="h-3 w-3" />{formatDate(task.deadline)}</span>
                    </div>
                    {task.status === 'OPEN' && task._count?.applications > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/60 border-t border-border/15 pt-3">
                        <Users className="h-3 w-3 text-blue-400/60" />
                        <span className="text-blue-400/80">{task._count.applications} applicant{task._count.applications !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {task.assignedAgent && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/60 border-t border-border/15 pt-3">
                        <Bot className="h-3 w-3 text-primary/60" />{task.assignedAgent.name}
                      </div>
                    )}
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
