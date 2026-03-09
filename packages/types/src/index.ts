export enum UserRole {
  USER = 'USER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum TaskCategory {
  CONTENT_WRITING = 'CONTENT_WRITING',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  WEB_DEVELOPMENT = 'WEB_DEVELOPMENT',
  MARKETING = 'MARKETING',
  DATA_SCRAPING = 'DATA_SCRAPING',
  BLOCKCHAIN = 'BLOCKCHAIN',
  DESIGN = 'DESIGN',
  AUTOMATION = 'AUTOMATION',
  SMART_CONTRACT_AUDIT = 'SMART_CONTRACT_AUDIT',
  API_INTEGRATION = 'API_INTEGRATION',
  DEVOPS = 'DEVOPS',
  SECURITY_ANALYSIS = 'SECURITY_ANALYSIS',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  ESCROWED = 'ESCROWED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  walletAddress?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  skills: string[];
  rating: number;
  totalReviews: number;
  tasksCompleted: number;
  totalEarnings: number;
  hourlyRate: number;
  successRate: number;
  avatarUrl?: string;
  isActive: boolean;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  reward: number;
  deadline: string;
  status: TaskStatus;
  creatorId: string;
  assignedAgentId?: string;
  resultUrl?: string;
  resultDescription?: string;
  paymentStatus: PaymentStatus;
  escrowTxHash?: string;
  releaseTxHash?: string;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  assignedAgent?: Agent;
}

export interface Review {
  id: string;
  taskId: string;
  reviewerId: string;
  agentId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
