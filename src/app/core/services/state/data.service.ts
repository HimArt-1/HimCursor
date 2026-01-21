
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../infra/supabase.service';
import { ConfettiService } from './confetti.service';
import { ToastService } from './toast.service';

// New Services
import { UiService } from './ui.service';
import { UserService } from '../domain/user.service';
import { AuthService } from '../domain/auth.service';
import { TaskService } from '../domain/task.service';
import { FinancialService } from '../domain/finance.service';
import { StrategyService, Objective } from '../domain/strategy.service';
import { AuditService } from '../infra/audit.service';

// Re-export Types
export type {
  Status, Priority, Domain, TraceStatus, EntityType, AuditAction,
  User, AuditLogEntry, Notification, SystemAlert, Design,
  Requirement, TestCase, Task, Asset, Campaign, Idea, Transaction,
  DevCommit, Milestone, Comment, KnowledgeArticle
} from '../../types';

// Types
import {
  Status, Priority, Domain, TraceStatus, EntityType, AuditAction,
  User, AuditLogEntry, Notification, SystemAlert, Design,
  Requirement, TestCase, Task, Asset, Campaign, Idea, Transaction,
  DevCommit, Milestone, Comment, KnowledgeArticle
} from '../../types';

// Re-export Objective from StrategyService to avoid conflict/duplication
export type { Objective };

@Injectable({ providedIn: 'root' })
export class DataService {
  private router = inject(Router);

  // Inject new domain services
  public ui = inject(UiService);
  public user = inject(UserService);
  public auth = inject(AuthService);
  public task = inject(TaskService);
  public finance = inject(FinancialService);
  public strategy = inject(StrategyService);
  public audit = inject(AuditService);

  // Legacy injections kept for direct access if needed
  private supabaseService = inject(SupabaseService);
  private confettiService = inject(ConfettiService);
  private toastService = inject(ToastService);

  // --- Entity Signals ---

  // Delegated to StrategyService
  readonly objectives = this.strategy.objectives;

  readonly designs = signal<Design[]>([]);
  readonly requirements = signal<Requirement[]>([]);
  readonly testCases = signal<TestCase[]>([]);
  readonly assets = signal<Asset[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly ideas = signal<Idea[]>([]);
  readonly milestones = signal<Milestone[]>([]);
  readonly commits = signal<DevCommit[]>([]);
  readonly comments = signal<Comment[]>([]);
  readonly knowledgeArticles = signal<KnowledgeArticle[]>([]);

  // Proxy Signals (Backward Compatibility)
  readonly tasks = this.task.tasks;
  readonly stats = this.task.stats;
  readonly currentUser = this.user.currentUser;
  readonly availableUsers = this.user.availableUsers;
  readonly darkMode = this.ui.darkMode;
  readonly showNotifications = this.ui.showNotifications;
  readonly notifications = this.ui.notifications;
  readonly auditLogs = this.audit.auditLogs;
  readonly systemAlerts = this.ui.systemAlerts;
  readonly transactions = this.finance.transactions;
  readonly isMobileMenuOpen = this.ui.isMobileMenuOpen;
  readonly isAiAssistantOpen = this.ui.isAiAssistantOpen;

  readonly activeAlert = computed(() => {
    const uid = this.currentUser()?.id || null;
    if (!uid) return null;
    return this.ui.systemAlerts().find(a => (a.targetUser === 'All' || a.targetUser === uid) && !a.seenBy.includes(uid)) || null;
  });

  constructor() {
    this.loadOtherData(); // Load legacy local data
    this.task.initSupabase(); // Initialize Task Service
  }

  // --- Facade Methods ---

  // Auth
  login(email: string, password: string) { this.auth.loginWithEmailPassword(email, password); }
  logout() { this.auth.logout(); }
  updateUserProfile(id: string, upt: Partial<User>) { this.user.updateUserProfile(id, upt); }
  addUser(u: User) { this.user.addUser(u); }
  deleteUser(id: string) { this.user.deleteUser(id); }

  // UI
  toggleDarkMode() { this.ui.toggleDarkMode(); }
  toggleNotifications() { this.ui.toggleNotifications(); }
  toggleMobileMenu() { this.ui.toggleMobileMenu(); }
  closeMobileMenu() { this.ui.closeMobileMenu(); }
  toggleAiAssistant() { this.ui.toggleAiAssistant(); }
  addNotification(t: string, m: string, type: Notification['type'] = 'Info') { this.ui.addNotification(t, m, type); }
  markAllNotificationsRead() { this.ui.markAllNotificationsRead(); }
  deleteNotification(id: string) { this.ui.deleteNotification(id); }
  sendSystemAlert(msg: string, target: string = 'All') { this.ui.sendSystemAlert(msg, 'Admin', target); }
  markAlertSeen(id: string, uid: string) { this.ui.markAlertSeen(id, uid); }

  // Tasks
  addTask(t: Task) { return this.task.addTask(t); }
  updateTask(id: string, updates: Partial<Task>) { return this.task.updateTask(id, updates); }
  deleteTask(id: string) { return this.task.deleteTask(id); }
  toggleTaskStatus(id: string, status: 'Todo' | 'Doing' | 'Done') { return this.task.toggleTaskStatus(id, status); }

  // Finance
  addTransaction(tx: Transaction) { this.finance.addTransaction(tx); }

  // Objectives (Delegated)
  addObjective(obj: Objective) { this.strategy.addObjective(obj); }
  updateObjective(id: string, updates: Partial<Objective>) { this.strategy.updateObjective(id, updates); }

  // --- Legacy Methods / Entities ---

  private loadOtherData() {
    const otherData = localStorage.getItem('himcontrol_other_data');
    if (otherData) {
      const p = JSON.parse(otherData);
      // objectives handled by StrategyService
      this.requirements.set(p.requirements || []);
      this.comments.set(p.comments || []);
      this.knowledgeArticles.set(p.knowledgeArticles || []);
      // Designs, Assets, etc.
      if (p.designs) this.designs.set(p.designs);
      if (p.testCases) this.testCases.set(p.testCases);
      if (p.assets) this.assets.set(p.assets);
      if (p.campaigns) this.campaigns.set(p.campaigns);
      if (p.ideas) this.ideas.set(p.ideas);
      if (p.milestones) this.milestones.set(p.milestones);
    }

    // Auto-Save Effect for legacy data
    effect(() => {
      localStorage.setItem('himcontrol_other_data', JSON.stringify({
        // objectives handled by StrategyService
        requirements: this.requirements(),
        comments: this.comments(),
        knowledgeArticles: this.knowledgeArticles(),
        designs: this.designs(),
        testCases: this.testCases(),
        assets: this.assets(),
        campaigns: this.campaigns(),
        ideas: this.ideas(),
        milestones: this.milestones()
      }));
    });
  }

  // Simple CRUD for remaining entities

  addRequirement(req: Requirement) { this.requirements.update(curr => [req, ...curr]); }
  updateRequirement(id: string, updates: Partial<Requirement>) { this.requirements.update(curr => curr.map(r => r.id === id ? { ...r, ...updates } : r)); }
  deleteRequirement(id: string) { this.requirements.update(curr => curr.filter(r => r.id !== id)); }

  addKnowledgeArticle(ka: KnowledgeArticle) { this.knowledgeArticles.update(curr => [ka, ...curr]); }
  updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>) { this.knowledgeArticles.update(curr => curr.map(k => k.id === id ? { ...k, ...updates } : k)); }
  deleteKnowledgeArticle(id: string) { this.knowledgeArticles.update(curr => curr.filter(k => k.id !== id)); }
  addDesign(des: Design) { this.designs.update(curr => [des, ...curr]); }
  updateDesign(id: string, updates: Partial<Design>) { this.designs.update(curr => curr.map(d => d.id === id ? { ...d, ...updates } : d)); }
  addTestCase(tc: TestCase) { this.testCases.update(curr => [tc, ...curr]); }
  updateTestCase(id: string, updates: Partial<TestCase>) { this.testCases.update(curr => curr.map(tc => tc.id === id ? { ...tc, ...updates } : tc)); }
  addAsset(asset: Asset) { this.assets.update(curr => [asset, ...curr]); }
  deleteAsset(id: string) { this.assets.update(curr => curr.filter(a => a.id !== id)); }
  addCampaign(camp: Campaign) { this.campaigns.update(curr => [camp, ...curr]); }

  addIdea(text: string, owner: string) {
    const idea: Idea = { id: `IDA-${Date.now()}`, text, owner, votes: 0 };
    this.ideas.update(curr => [idea, ...curr]);
  }
  voteForIdea(id: string) {
    this.ideas.update(curr => curr.map(i => i.id === id ? { ...i, votes: i.votes + 1 } : i).sort((a, b) => b.votes - a.votes));
  }

  addMilestone(milestone: Milestone) {
    this.milestones.update(curr => [milestone, ...curr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }

  addComment(taskId: string, text: string) {
    const user = this.user.currentUser();
    if (!user) return;
    const comment: Comment = { id: `CMT-${Date.now()}`, taskId, userId: user.id, text, timestamp: new Date().toISOString() };
    this.comments.update(c => [...c, comment]);
    this.ui.addNotification('تعليق جديد', `${user.name} commented on task`, 'Info');
  }

  // Traceability Logic
  readonly preflightReport = computed(() => {
    const reqs = this.requirements(); let orphans = 0; let incomplete = 0; let gaps = 0; let verifiedCount = 0;
    const errors: string[] = []; const warnings: string[] = [];
    reqs.forEach(req => {
      let isBlocked = false; let isGap = false;
      if (!req.objectiveIds || req.objectiveIds.length === 0) { orphans++; isBlocked = true; errors.push(`المتطلب ${req.id} يتيم.`); }
      if (!req.acceptanceCriteria?.trim()) { incomplete++; isBlocked = true; errors.push(`المتطلب ${req.id} لا يحتوي على معايير قبول.`); }
      if (!isBlocked && (!req.testCaseIds || req.testCaseIds.length === 0)) { gaps++; isGap = true; warnings.push(`المتطلب ${req.id} لم يتم تغطيته باختبار.`); }
      if (!isBlocked && !isGap) { verifiedCount++; }
    });
    let globalStatus: TraceStatus = 'Verified';
    if (orphans > 0 || incomplete > 0) { globalStatus = 'Blocked'; } else if (gaps > 0) { globalStatus = 'WithGaps'; }
    return { status: globalStatus, orphans, incomplete, gaps, verifiedCount, total: reqs.length, errors, warnings };
  });

  resetData() { localStorage.clear(); window.location.reload(); }

  exportDatabase() {
    return JSON.stringify({
      objectives: this.objectives(),
      requirements: this.requirements(),
      comments: this.comments(),
      knowledgeArticles: this.knowledgeArticles(),
      designs: this.designs(),
      testCases: this.testCases(),
      assets: this.assets(),
      campaigns: this.campaigns(),
      ideas: this.ideas(),
      milestones: this.milestones(),
      tasks: this.tasks(),
      transactions: this.transactions()
    });
  }

  importDatabase(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.objectives) this.strategy.objectives.set(data.objectives);
      if (data.requirements) this.requirements.set(data.requirements);
      if (data.comments) this.comments.set(data.comments);
      if (data.knowledgeArticles) this.knowledgeArticles.set(data.knowledgeArticles);
      if (data.designs) this.designs.set(data.designs);
      if (data.testCases) this.testCases.set(data.testCases);
      if (data.assets) this.assets.set(data.assets);
      if (data.campaigns) this.campaigns.set(data.campaigns);
      if (data.ideas) this.ideas.set(data.ideas);
      if (data.milestones) this.milestones.set(data.milestones);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}