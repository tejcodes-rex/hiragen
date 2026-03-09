const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('hiragen_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('hiragen_token', token);
      } else {
        localStorage.removeItem('hiragen_token');
      }
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async login(email: string, password: string) {
    const res = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) this.setToken(res.data.token);
    return res;
  }

  async register(data: { email: string; password: string; name: string; role: string }) {
    const res = await this.request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.data?.token) this.setToken(res.data.token);
    return res;
  }

  async getMe() {
    return this.request<any>('/api/auth/me');
  }

  async updateProfile(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async connectWallet(walletAddress: string) {
    return this.request<any>('/api/auth/wallet', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress }),
    });
  }

  async getTasks(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/tasks${query}`);
  }

  async getTask(id: string) {
    return this.request<any>(`/api/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request<any>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptTask(id: string) {
    return this.request<any>(`/api/tasks/${id}/accept`, { method: 'POST' });
  }

  async assignAgentToTask(taskId: string, agentId: string) {
    return this.request<any>(`/api/tasks/${taskId}/assign/${agentId}`, { method: 'POST' });
  }

  async getMyOpenTasks() {
    return this.request<any>('/api/tasks?status=OPEN&mine=true');
  }

  async startTask(id: string) {
    return this.request<any>(`/api/tasks/${id}/start`, { method: 'POST' });
  }

  async submitTask(id: string, data: { resultDescription: string; resultUrl?: string }) {
    return this.request<any>(`/api/tasks/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveTask(id: string) {
    return this.request<any>(`/api/tasks/${id}/approve`, { method: 'POST' });
  }

  async cancelTask(id: string) {
    return this.request<any>(`/api/tasks/${id}/cancel`, { method: 'POST' });
  }

  async getAgents(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/agents${query}`);
  }

  async getAgent(id: string) {
    return this.request<any>(`/api/agents/${id}`);
  }

  async registerAgent(data: any) {
    return this.request<any>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserDashboard() {
    return this.request<any>('/api/dashboard/user');
  }

  async getAgentDashboard() {
    return this.request<any>('/api/dashboard/agent');
  }

  async updateTaskEscrow(taskId: string, escrowTxHash: string) {
    return this.request<any>(`/api/tasks/${taskId}/escrow`, {
      method: 'PUT',
      body: JSON.stringify({ escrowTxHash }),
    });
  }

  async updateTaskRelease(taskId: string, releaseTxHash: string) {
    return this.request<any>(`/api/tasks/${taskId}/release`, {
      method: 'PUT',
      body: JSON.stringify({ releaseTxHash }),
    });
  }

  async createReview(taskId: string, data: { rating: number; comment: string }) {
    return this.request<any>(`/api/reviews/task/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Applications
  async applyToTask(taskId: string, data: { message: string; bidPrice?: number }) {
    return this.request<any>(`/api/tasks/${taskId}/applications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTaskApplications(taskId: string) {
    return this.request<any>(`/api/tasks/${taskId}/applications`);
  }

  async acceptApplication(taskId: string, appId: string) {
    return this.request<any>(`/api/tasks/${taskId}/applications/${appId}/accept`, { method: 'POST' });
  }

  async rejectApplication(taskId: string, appId: string) {
    return this.request<any>(`/api/tasks/${taskId}/applications/${appId}/reject`, { method: 'POST' });
  }

  async withdrawApplication(taskId: string) {
    return this.request<any>(`/api/tasks/${taskId}/applications`, { method: 'DELETE' });
  }

  // Integrations
  async getIntegrations() {
    return this.request<any>('/api/integrations');
  }

  async saveIntegration(platform: string, config: any, label?: string) {
    return this.request<any>(`/api/integrations/${platform}`, {
      method: 'PUT',
      body: JSON.stringify({ config, label }),
    });
  }

  async deleteIntegration(platform: string) {
    return this.request<any>(`/api/integrations/${platform}`, { method: 'DELETE' });
  }

  async testIntegration(platform: string) {
    return this.request<any>(`/api/integrations/${platform}/test`);
  }

  // Platform stats (public)
  async getPlatformStats() {
    return this.request<any>('/api/platform/stats');
  }

  // Task templates
  async getTemplates() {
    return this.request<any>('/api/templates');
  }

  async getTemplate(id: string) {
    return this.request<any>(`/api/templates/${id}`);
  }

  async createTaskFromTemplate(templateId: string, data: any) {
    return this.request<any>(`/api/templates/${templateId}/use`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Deliverables
  async getDeliverables(taskId: string) {
    return this.request<any>(`/api/deliverables/${taskId}`);
  }

  // Developer portal
  async getDeveloperKeys() {
    return this.request<any>('/api/developer/keys');
  }

  async createDeveloperKey(data: { label: string; agentId?: string }) {
    return this.request<any>('/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeDeveloperKey(id: string) {
    return this.request<any>(`/api/developer/keys/${id}`, { method: 'DELETE' });
  }

  async getDeveloperWebhooks() {
    return this.request<any>('/api/developer/webhooks');
  }

  async createDeveloperWebhook(data: { url: string; events: string[]; agentId?: string }) {
    return this.request<any>('/api/developer/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerExternalAgent(data: any) {
    return this.request<any>('/api/developer/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDeveloperStats() {
    return this.request<any>('/api/developer/stats');
  }

  async getDeveloperLogs(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/developer/logs${query}`);
  }

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
