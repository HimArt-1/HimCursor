// Domain Types
export type Status = 'Draft' | 'Incomplete' | 'Ready' | 'InProgress' | 'Done';
export type Priority = 'High' | 'Medium' | 'Low';
export type Domain = 'Design' | 'Development' | 'Marketing' | 'Store' | 'Operations';
export type TraceStatus = 'Verified' | 'WithGaps' | 'Blocked';
export type EntityType = 'Objective' | 'Requirement' | 'TestCase' | 'Design' | 'Task';
export type AuditAction = 'Create' | 'Update' | 'Delete' | 'Vote' | 'Import' | 'Login' | 'Logout' | 'Comment';

export interface User {
  id: string;
  name: string;
  email: string; // Added for Auth
  role: string;
  avatarColor?: string;
  avatarUrl?: string;
  pin?: string; // Deprecated for email/password auth
  password?: string; // Used only for admin-create/reset
  isActive?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String
  user: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt?: string;
}

export interface Permission {
  key: string;
  label: string;
  category: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'Success' | 'Info' | 'Warning' | 'celebrate';
  category?: string;
  actionUrl?: string;
  groupedKey?: string;
}

export interface SystemAlert {
  id: string;
  message: string;
  sender: string;
  targetUser: string | 'All'; // 'All' for broadcast, or User ID
  timestamp: string;
  seenBy: string[]; // List of user IDs who closed it
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: Status;
}

export interface Design {
  id: string;
  title: string;
  url: string;
  status: Status;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  source: string;
  owner: string;
  priority: Priority;
  status: Status;
  acceptanceCriteria: string; // Must not be empty
  objectiveIds: string[]; // Must have at least one
  testCaseIds: string[];
  designIds: string[];
}

export interface TestCase {
  id: string;
  title: string;
  status: 'Pass' | 'Fail' | 'NotRun';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  domain: Domain;
  owner: string;
  priority: Priority;
  status: 'Todo' | 'Doing' | 'Done';
  dueDate: string;
  tags: string[];
}

export interface Asset {
  id: string;
  title: string;
  type: 'Image' | 'Font' | 'Guide' | 'Mockup';
  url: string; // Base64 or URL
  tag: string;
  size?: string;
}

export interface Campaign {
  id: string;
  title: string;
  platform: 'Instagram' | 'TikTok' | 'Snapchat' | 'Email';
  status: 'Scheduled' | 'Active' | 'Completed';
  date: string;
  brief: string;
}

export interface Idea {
  id: string;
  text: string;
  owner: string;
  votes: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Expense' | 'Income';
  category: 'Marketing' | 'Server' | 'Tools' | 'Sales' | 'Salaries';
}

export interface DevCommit {
  id: string;
  message: string;
  author: string;
  date: string;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  type: 'Launch' | 'Event' | 'Update';
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  timestamp: string; // ISO String
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'project';
  icon: string;
  createdBy?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
}

export interface ChatChannelMember {
  id: string;
  channelId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  channelId: string;
  status?: 'sending' | 'sent' | 'error';
  messageType: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyToMessage?: ChatMessage;
  isPinned?: boolean;
  reactions?: Record<string, string[]>; // emoji -> userId[]
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string; // Markdown
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  authorId: string;
}

// Shared Requests (الطلبات المشتركة)
export type RequestType = 'تصميم' | 'برمجة' | 'محتوى' | 'تسويق' | 'إداري' | 'أخرى';
export type RequestStatus = 'جديد' | 'قيد التنفيذ' | 'مكتمل';

export interface SharedRequest {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  status: RequestStatus;
  notes?: string;
  requesterId: string;
  requesterName?: string;
  assigneeId?: string;
  assigneeName?: string;
  completedAt?: string;
  outputNotes?: string;
  outputLink?: string;
  attachments: RequestAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  kind: 'input' | 'output';
  uploadedBy: string;
  createdAt: string;
}
