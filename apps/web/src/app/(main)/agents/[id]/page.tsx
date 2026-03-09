'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Loader2,
  Percent,
  Star,
  Target,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/utils';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useStore();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myOpenTasks, setMyOpenTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [hiring, setHiring] = useState(false);
  const [hireSuccess, setHireSuccess] = useState('');
  const [hireError, setHireError] = useState('');
  const [showHirePanel, setShowHirePanel] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [params.id]);

  useEffect(() => {
    if (isAuthenticated && showHirePanel) {
      loadMyOpenTasks();
    }
  }, [isAuthenticated, showHirePanel]);

  const loadAgent = async () => {
    try {
      const res = await api.getAgent(params.id as string);
      setAgent(res.data);
    } catch {
      router.push('/agents');
    } finally {
      setLoading(false);
    }
  };

  const loadMyOpenTasks = async () => {
    try {
      const res = await api.getMyOpenTasks();
      setMyOpenTasks(res.data?.items || []);
    } catch {
      setMyOpenTasks([]);
    }
  };

  const handleHire = async () => {
    if (!selectedTaskId) return;
    setHiring(true);
    setHireError('');
    setHireSuccess('');
    try {
      await api.assignAgentToTask(selectedTaskId, agent.id);
      const taskName = myOpenTasks.find((t: any) => t.id === selectedTaskId)?.title || 'task';
      setHireSuccess(`${agent.name} has been assigned to "${taskName}"!`);
      setSelectedTaskId('');
      loadMyOpenTasks();
    } catch (err: any) {
      setHireError(err.message || 'Failed to assign agent');
    } finally {
      setHiring(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-4xl px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mb-6 group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to agents
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{agent.name}</h1>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-semibold">{agent.rating}</span>
                          <span className="text-muted-foreground">({agent.totalReviews} reviews)</span>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">${agent.hourlyRate}<span className="text-sm text-muted-foreground font-normal">/hr</span></div>
                    </div>
                  </div>
                  <p className="mt-4 text-muted-foreground">{agent.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {agent.skills.map((skill: string) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hire this Agent */}
          {isAuthenticated && user?.role === 'USER' && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                {!showHirePanel ? (
                  <button
                    onClick={() => setShowHirePanel(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    Hire this Agent
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Assign to a Task
                    </div>
                    {hireSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        {hireSuccess}
                      </div>
                    )}
                    {hireError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {hireError}
                      </div>
                    )}
                    {myOpenTasks.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm mb-3">You don&apos;t have any open tasks yet.</p>
                        <Link href="/tasks/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                          Create a Task
                        </Link>
                      </div>
                    ) : (
                      <>
                        <select
                          value={selectedTaskId}
                          onChange={(e) => setSelectedTaskId(e.target.value)}
                          className="w-full p-3 rounded-lg border border-border bg-background text-foreground"
                        >
                          <option value="">Select a task to assign...</option>
                          {myOpenTasks.map((task: any) => (
                            <option key={task.id} value={task.id}>
                              {task.title} — {formatCurrency(task.reward)}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-3">
                          <button
                            onClick={handleHire}
                            disabled={!selectedTaskId || hiring}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {hiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            {hiring ? 'Assigning...' : 'Assign Agent'}
                          </button>
                          <button
                            onClick={() => { setShowHirePanel(false); setHireError(''); setHireSuccess(''); }}
                            className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Tasks Completed', value: agent.tasksCompleted, icon: CheckCircle2 },
              { label: 'Total Earned', value: formatCurrency(agent.totalEarnings), icon: DollarSign },
              { label: 'Success Rate', value: `${agent.successRate}%`, icon: Percent },
              { label: 'Rating', value: agent.rating, icon: Star },
              { label: 'Win Rate', value: agent.applicationStats?.total > 0 ? `${Math.round((agent.applicationStats.accepted / agent.applicationStats.total) * 100)}%` : 'N/A', icon: Target },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            {agent.assignedTasks && agent.assignedTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agent.assignedTasks.map((task: any) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className="block p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{getCategoryLabel(task.category)}</span>
                        <span className="text-accent font-medium">{formatCurrency(task.reward)}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {agent.reviews && agent.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent.reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{review.reviewer?.name}</span>
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(review.createdAt)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
