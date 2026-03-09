'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, CheckCircle2, Clock, DollarSign, ListTodo,
  Loader2, Plus, Star, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export default function DashboardPage() {
  const { user, setUser } = useStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectingWallet, setConnectingWallet] = useState(false);

  const isAgent = user?.role === 'AGENT';

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const res = isAgent ? await api.getAgentDashboard() : await api.getUserDashboard();
        setDashboard(res.data);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [user]);

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setConnectingWallet(true);
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) {
          const res = await api.connectWallet(accounts[0]);
          setUser(res.data);
          toast({ title: 'Wallet connected!', variant: 'success' });
        }
      } catch (err: any) {
        toast({ title: 'Failed to connect wallet', description: err.message, variant: 'destructive' });
      } finally { setConnectingWallet(false); }
    } else {
      toast({ title: 'No wallet detected', description: 'Install MetaMask or another wallet', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="py-8"><div className="mx-auto max-w-7xl px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-60 w-full" />
      </div></div>
    );
  }

  const stats = !isAgent ? [
    { label: 'Total Tasks', value: dashboard?.totalTasks || 0, icon: ListTodo, color: 'text-primary' },
    { label: 'Active', value: dashboard?.activeTasks || 0, icon: Clock, color: 'text-yellow-400' },
    { label: 'Completed', value: dashboard?.completedTasks || 0, icon: CheckCircle2, color: 'text-accent' },
    { label: 'Total Spent', value: formatCurrency(dashboard?.totalSpent || 0), icon: DollarSign, color: 'text-primary' },
  ] : [
    { label: 'Total Earned', value: formatCurrency(dashboard?.totalEarnings || 0), icon: DollarSign, color: 'text-accent' },
    { label: 'Pending', value: formatCurrency(dashboard?.pendingEarnings || 0), icon: Clock, color: 'text-yellow-400' },
    { label: 'Completed', value: dashboard?.tasksCompleted || 0, icon: CheckCircle2, color: 'text-accent' },
    { label: 'Rating', value: dashboard?.rating || 0, icon: Star, color: 'text-yellow-400' },
  ];

  return (
    <div className="py-8">
      {/* Ambient glow */}
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">Overview</span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">{isAgent ? 'Agent' : ''} Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            {!user?.walletAddress ? (
              <Button variant="outline" className="gap-2" onClick={handleConnectWallet} disabled={connectingWallet}>
                {connectingWallet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-sm">
                <Wallet className="h-4 w-4 text-accent" />
                <span className="text-accent font-medium">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span>
              </div>
            )}
            {!isAgent && (
              <Button asChild className="gap-2">
                <Link href="/tasks/new"><Plus className="h-4 w-4" />Post Task</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/30 bg-card/40 hover:border-primary/15 hover:bg-card/60 transition-all duration-200 overflow-hidden">
              <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{stat.label}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.07]">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/30 bg-card/40 overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
          <CardHeader><CardTitle className="text-lg">Recent Tasks</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.recentTasks && dashboard.recentTasks.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recentTasks.map((task: any) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-muted/20 transition-colors duration-150 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${getStatusColor(task.status)} text-xs`}>{task.status.replace('_', ' ')}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-accent ml-4">{formatCurrency(task.reward)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No tasks yet</p>
                {!isAgent && (
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/tasks/new">Post your first task</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
