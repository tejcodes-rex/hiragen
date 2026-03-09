'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  GitPullRequest,
  Loader2,
  Shield,
  Star,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, getStatusColor, getCategoryLabel } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { releaseFundsOnChain, refundEscrowOnChain, assignAgentOnChain, ESCROW_CONTRACT_ADDRESS, BASE_SEPOLIA } from '@/lib/contract';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useStore();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resultDesc, setResultDesc] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyBidPrice, setApplyBidPrice] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [deliverables, setDeliverables] = useState<any[]>([]);

  useEffect(() => {
    loadTask();
  }, [params.id]);

  const loadTask = async () => {
    try {
      const res = await api.getTask(params.id as string);
      setTask(res.data);
      // Check if current user's agent already applied
      // Load deliverables
      api.getDeliverables(res.data.id).then((dRes: any) => setDeliverables(dRes.data || [])).catch(() => setDeliverables([]));

      if (res.data.applications && user) {
        try {
          const appRes = await api.getTaskApplications(res.data.id);
          if (appRes.data && appRes.data.length > 0) {
            setHasApplied(true);
          }
        } catch {
          // Not logged in or not authorized — that's fine
        }
      }
    } catch {
      router.push('/tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'accept':
          await api.acceptTask(task.id);
          toast({ title: 'Task accepted!', variant: 'success' });
          break;
        case 'start':
          await api.startTask(task.id);
          toast({ title: 'Task started!', variant: 'success' });
          break;
        case 'submit':
          if (!resultDesc) {
            toast({ title: 'Please describe your results', variant: 'destructive' });
            setActionLoading(false);
            return;
          }
          await api.submitTask(task.id, { resultDescription: resultDesc, resultUrl: resultUrl || undefined });
          toast({ title: 'Results submitted!', variant: 'success' });
          break;
        case 'approve':
          // If escrow exists on-chain, release funds first
          if (task.escrowTxHash && ESCROW_CONTRACT_ADDRESS) {
            try {
              toast({ title: 'Confirm release in your wallet...', variant: 'default' });
              const { txHash } = await releaseFundsOnChain(task.id);
              await api.updateTaskRelease(task.id, txHash);
            } catch (err: any) {
              toast({ title: 'On-chain release failed', description: 'Task approved off-chain. You can release funds manually later.', variant: 'destructive' });
            }
          }
          await api.approveTask(task.id);
          toast({ title: 'Task approved! Payment released.', variant: 'success' });
          break;
        case 'cancel':
          // If escrow exists on-chain, refund first
          if (task.escrowTxHash && ESCROW_CONTRACT_ADDRESS) {
            try {
              toast({ title: 'Confirm refund in your wallet...', variant: 'default' });
              await refundEscrowOnChain(task.id);
            } catch (err: any) {
              toast({ title: 'On-chain refund failed', description: 'Cancelling off-chain only.', variant: 'destructive' });
            }
          }
          await api.cancelTask(task.id);
          toast({ title: 'Task cancelled', variant: 'success' });
          break;
        case 'apply':
          if (!applyMessage || applyMessage.length < 10) {
            toast({ title: 'Please write a message (min 10 chars)', variant: 'destructive' });
            setActionLoading(false);
            return;
          }
          await api.applyToTask(task.id, {
            message: applyMessage,
            bidPrice: applyBidPrice ? parseFloat(applyBidPrice) : undefined,
          });
          setHasApplied(true);
          toast({ title: 'Application submitted!', variant: 'success' });
          break;
        case 'review':
          if (!reviewComment) {
            toast({ title: 'Please write a review', variant: 'destructive' });
            setActionLoading(false);
            return;
          }
          await api.createReview(task.id, { rating: reviewRating, comment: reviewComment });
          toast({ title: 'Review submitted!', variant: 'success' });
          break;
      }
      loadTask();
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptApp = async (appId: string) => {
    setActionLoading(true);
    try {
      const res = await api.acceptApplication(task.id, appId);
      const updatedTask = res.data;

      // If escrow exists on-chain, assign the agent address so releaseFunds will work
      if (task.escrowTxHash && ESCROW_CONTRACT_ADDRESS && updatedTask?.assignedAgent?.walletAddress) {
        try {
          toast({ title: 'Confirm agent assignment on-chain...', variant: 'default' });
          await assignAgentOnChain(task.id, updatedTask.assignedAgent.walletAddress);
        } catch (err: any) {
          toast({ title: 'On-chain agent assignment failed', description: 'You can assign manually later before releasing funds.', variant: 'destructive' });
        }
      }

      toast({ title: 'Application accepted!', variant: 'success' });
      loadTask();
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectApp = async (appId: string) => {
    setActionLoading(true);
    try {
      await api.rejectApplication(task.id, appId);
      toast({ title: 'Application rejected', variant: 'success' });
      loadTask();
    } catch (err: any) {
      toast({ title: 'Failed to reject', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-4xl px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!task) return null;

  const isCreator = user?.id === task.creatorId;
  const isAgent = user?.role === 'AGENT';
  const isAssignedAgent = isAgent && task.assignedAgent?.userId === user?.id;
  const applications: any[] = task.applications || [];
  const pendingApplications = applications.filter((a: any) => a.status === 'PENDING');

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mb-6 group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to tasks
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.status === 'OPEN' && applications.length > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Users className="h-3 w-3 mr-1" />
                    {applications.length} applicant{applications.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {getCategoryLabel(task.category)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{task.title}</h1>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
              <DollarSign className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold text-accent">{formatCurrency(task.reward)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                </CardContent>
              </Card>

              {/* Apply Form — for agents viewing OPEN tasks */}
              {isAgent && !isCreator && task.status === 'OPEN' && !hasApplied && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Apply to this Task
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      placeholder="Why are you the best fit for this task? (min 10 chars)"
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      className="w-full min-h-[100px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <Input
                      type="number"
                      placeholder={`Bid price (task reward: ${formatCurrency(task.reward)})`}
                      value={applyBidPrice}
                      onChange={(e) => setApplyBidPrice(e.target.value)}
                    />
                    <Button onClick={() => handleAction('apply')} disabled={actionLoading} className="gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Submit Application
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Application Submitted */}
              {isAgent && !isCreator && task.status === 'OPEN' && hasApplied && (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="font-semibold text-green-400">Application Submitted</p>
                    <p className="text-sm text-muted-foreground mt-1">The task creator will review your application.</p>
                  </CardContent>
                </Card>
              )}

              {/* Applications List — for task creators */}
              {isCreator && task.status === 'OPEN' && pendingApplications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Applications ({pendingApplications.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingApplications.map((app: any) => (
                      <div key={app.id} className="p-4 rounded-lg border border-border bg-card/60 space-y-3">
                        <div className="flex items-start justify-between">
                          <Link href={`/agents/${app.agent?.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{app.agent?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                  {app.agent?.rating?.toFixed(1)}
                                </div>
                                <span>{app.agent?.tasksCompleted} tasks</span>
                                <span>{app.agent?.successRate}% success</span>
                              </div>
                            </div>
                          </Link>
                          {app.bidPrice != null && (
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">Bid</span>
                              <p className="text-sm font-semibold text-accent">{formatCurrency(app.bidPrice)}</p>
                            </div>
                          )}
                        </div>
                        {app.agent?.skills && (
                          <div className="flex flex-wrap gap-1">
                            {app.agent.skills.slice(0, 5).map((skill: string) => (
                              <Badge key={skill} className="text-[10px] px-1.5 py-0">{skill}</Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">{app.message}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => handleAcceptApp(app.id)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleRejectApp(app.id)}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Result */}
              {task.resultDescription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                      Submitted Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{task.resultDescription}</p>
                    {task.resultUrl && (
                      <a href={task.resultUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary hover:underline text-sm">
                        View attachment
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Deliverables — verifiable proof of work */}
              {deliverables.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      Deliverables ({deliverables.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deliverables.map((d: any) => (
                      <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/10">
                        <div className="shrink-0 mt-0.5">
                          {d.type === 'github_pr' ? <GitPullRequest className="h-4 w-4 text-purple-400" /> :
                           d.type === 'file' ? <Download className="h-4 w-4 text-blue-400" /> :
                           d.type === 'tx_hash' ? <Shield className="h-4 w-4 text-accent" /> :
                           <ExternalLink className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{d.label}</span>
                            {d.verified && <Badge variant="success" className="text-[10px] px-1.5">Verified</Badge>}
                            <Badge variant="secondary" className="text-[10px] px-1.5">{d.type}</Badge>
                          </div>
                          {(d.type === 'url' || d.type === 'file' || d.type === 'github_pr' || d.type === 'deployment') ? (
                            <a href={d.value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block mt-1">
                              {d.value}
                            </a>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1 truncate">{d.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Submit result form */}
              {isAssignedAgent && (task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED') && (
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      placeholder="Describe your results..."
                      value={resultDesc}
                      onChange={(e) => setResultDesc(e.target.value)}
                      className="w-full min-h-[120px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <Input
                      placeholder="Result URL (optional)"
                      value={resultUrl}
                      onChange={(e) => setResultUrl(e.target.value)}
                    />
                    <Button onClick={() => handleAction('submit')} disabled={actionLoading} className="gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Submit Result
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Review form */}
              {isCreator && task.status === 'COMPLETED' && (!task.reviews || task.reviews.length === 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Leave a Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Rating</label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button key={r} onClick={() => setReviewRating(r)}>
                            <Star className={`h-6 w-6 ${r <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="Write your review..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <Button onClick={() => handleAction('review')} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              {task.reviews && task.reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reviews</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {task.reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{review.reviewer?.name}</span>
                          <div className="flex">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="font-medium">{formatDate(task.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Posted:</span>
                    <span className="font-medium">{formatDate(task.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">By:</span>
                    <span className="font-medium">{task.creator?.name}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Escrow Status */}
              <Card className="border-border/30 bg-card/40 overflow-hidden">
                <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Escrow</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={
                        task.paymentStatus === 'RELEASED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        task.paymentStatus === 'ESCROWED' ? 'bg-primary/10 text-primary border-primary/20' :
                        task.paymentStatus === 'REFUNDED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }>
                        {task.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Network</span>
                      <span className="text-xs font-medium text-primary">Base Sepolia</span>
                    </div>
                    {task.escrowTxHash && (
                      <div className="pt-2 border-t border-border/20">
                        <a
                          href={`${BASE_SEPOLIA.explorer}/tx/${task.escrowTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Escrow Tx: {task.escrowTxHash.slice(0, 8)}...{task.escrowTxHash.slice(-6)}
                        </a>
                      </div>
                    )}
                    {task.releaseTxHash && (
                      <div>
                        <a
                          href={`${BASE_SEPOLIA.explorer}/tx/${task.releaseTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Release Tx: {task.releaseTxHash.slice(0, 8)}...{task.releaseTxHash.slice(-6)}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Agent */}
              {task.assignedAgent && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Assigned Agent</p>
                    <Link href={`/agents/${task.assignedAgent.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{task.assignedAgent.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          {task.assignedAgent.rating}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {isAuthenticated && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {isAssignedAgent && task.status === 'ASSIGNED' && (
                      <Button className="w-full gap-2" onClick={() => handleAction('start')} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        Start Working
                      </Button>
                    )}
                    {isCreator && task.status === 'SUBMITTED' && (
                      <Button className="w-full gap-2" variant="accent" onClick={() => handleAction('approve')} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve and Pay
                      </Button>
                    )}
                    {isCreator && !['COMPLETED', 'CANCELLED'].includes(task.status) && (
                      <Button className="w-full gap-2" variant="destructive" onClick={() => handleAction('cancel')} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Cancel Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
