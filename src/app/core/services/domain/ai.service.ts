
import { Injectable, inject, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { DataService } from '../state/data.service';
import { UserService } from './user.service';
import { TaskService } from './task.service';
import { FinancialService } from './finance.service';
import { environment } from '../../../../environments/environment';
import { AI_PERSONA } from '../../config/ai-persona.config';

export interface ChatTurn {
  role: 'user' | 'model';
  parts: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private dataService = inject(DataService);
  private userService = inject(UserService);
  private taskService = inject(TaskService);
  private financeService = inject(FinancialService);
  private ai: GoogleGenAI;

  // Conversation history for multi-turn
  readonly conversationHistory = signal<ChatTurn[]>([]);
  readonly isProcessing = signal(false);

  // Quick actions
  readonly quickActions: QuickAction[] = [
    { icon: '📊', label: 'ملخص اليوم', prompt: 'أعطني ملخص شامل عن حالة المشروع اليوم: المهام، الأهداف، والأرقام المهمة' },
    { icon: '⚡', label: 'المهام العاجلة', prompt: 'ما هي المهام العاجلة المتأخرة أو المعلقة التي تحتاج اهتمام فوري؟' },
    { icon: '💰', label: 'تقرير مالي', prompt: 'أعطني تقرير سريع عن الوضع المالي: الإيرادات، المصروفات، والرصيد' },
    { icon: '🎯', label: 'تقدم الأهداف', prompt: 'ما هو تقدم الأهداف الاستراتيجية الحالية؟ هل هناك أهداف متأخرة؟' },
    { icon: '👥', label: 'حالة الفريق', prompt: 'كيف حال الفريق؟ من الأكثر انشغالاً ومن لديه سعة عمل؟' },
    { icon: '💡', label: 'اقتراحات', prompt: 'بناءً على بيانات المشروع الحالية، ما هي أهم 3 اقتراحات تحسين يمكنك تقديمها؟' }
  ];

  // Suggested prompts (shown at start)
  readonly suggestedPrompts = [
    'ما هي أولوياتي اليوم؟',
    'حلل أداء الفريق هذا الأسبوع',
    'اقترح تحسينات للمشروع',
    'لخص حالة المهام المتأخرة'
  ];

  constructor() {
    const apiKey = environment.apiKey || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async sendMessage(userMessage: string): Promise<string> {
    this.isProcessing.set(true);

    // Add user message to history
    this.conversationHistory.update(h => [...h, { role: 'user', parts: userMessage }]);

    try {
      let response: string;

      if (!environment.apiKey) {
        response = await this.mockResponse(userMessage);
      } else {
        response = await this.generateResponse(userMessage);
      }

      // Add model response to history
      this.conversationHistory.update(h => [...h, { role: 'model', parts: response }]);

      return response;
    } catch (error) {
      console.error('AI Error:', error);
      const errMsg = 'واجهت مشكلة في الاتصال. الرجاء المحاولة لاحقاً.';
      this.conversationHistory.update(h => [...h, { role: 'model', parts: errMsg }]);
      return errMsg;
    } finally {
      this.isProcessing.set(false);
    }
  }

  private async generateResponse(userMessage: string): Promise<string> {
    const context = this.buildRichContext();
    const history = this.conversationHistory();

    // Build conversation contents for multi-turn
    const conversationParts = history.slice(-10).map(turn => ({
      role: turn.role,
      parts: [{ text: turn.parts }]
    }));

    const systemPrompt = `
    ${AI_PERSONA.systemInstruction}

    ${AI_PERSONA.actionCapabilities || ''}

    CURRENT PROJECT STATE (Live Data):
    ${JSON.stringify(context, null, 0)}

    STRICT RULES:
    ${AI_PERSONA.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

    RESPONSE FORMAT:
    - Be concise but comprehensive
    - Use bullet points for lists
    - Use bold for emphasis (wrap with **)
    - Include relevant numbers and metrics
    - End with a suggestion or follow-up question when appropriate
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return response.text || 'عذراً، لم أستطع معالجة ذلك.';
  }

  private buildRichContext() {
    const stats = this.dataService.stats();
    const user = this.userService.currentUser();
    const tasks = this.taskService.tasks();
    const transactions = this.financeService.transactions();
    const objectives = this.dataService.objectives();
    const team = this.userService.availableUsers();

    // Summarize tasks by status
    const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high' || t.priority === 'Urgent' || t.priority === 'High');
    const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done' && t.status !== 'Done');

    // Financial summary
    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    return {
      currentUser: user ? { name: user.name, role: user.role } : null,
      teamSize: team.length,
      teamMembers: team.map(u => ({ name: u.name, role: u.role })),
      taskStats: {
        total: stats.totalTasks,
        todo: stats.todoTasks,
        doing: stats.doingTasks,
        done: stats.doneTasks,
        completion: stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0
      },
      urgentTasks: urgentTasks.slice(0, 5).map((t: any) => ({ title: t.title, status: t.status, assignee: t.assigneeId || t.assignee_id })),
      overdueTasks: overdueTasks.slice(0, 5).map((t: any) => ({ title: t.title, dueDate: t.dueDate || t.due_date })),
      objectives: objectives.map(o => ({ title: o.title, progress: o.progress, term: o.term })),
      finance: { income, expense, balance: income - expense },
      traceability: this.dataService.preflightReport()
    };
  }

  clearHistory() {
    this.conversationHistory.set([]);
  }

  private mockResponse(query: string): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        const q = query.toLowerCase();
        const stats = this.dataService.stats();
        const user = this.userService.currentUser();
        const greeting = user ? `${user.name}` : 'مدير';

        if (q.includes('ملخص') || q.includes('اليوم') || q.includes('حالة')) {
          resolve(`📊 **ملخص اليوم يا ${greeting}:**\n\n• المهام: ${stats.totalTasks} إجمالي (${stats.doneTasks} مكتملة، ${stats.doingTasks} قيد التنفيذ)\n• نسبة الإنجاز: ${stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0}%\n• ${stats.todoTasks} مهام في الانتظار\n\n💡 **اقتراح:** ركّز على المهام العاجلة أولاً لتحسين معدل الإنجاز.`);
        } else if (q.includes('مهام') || q.includes('عاجل')) {
          resolve(`⚡ **المهام العاجلة:**\n\n• لديك ${stats.doingTasks} مهام قيد التنفيذ\n• ${stats.todoTasks} مهام في الانتظار\n\nهل تريدني أن أسرد تفاصيل المهام المتأخرة؟`);
        } else if (q.includes('مالي') || q.includes('مال')) {
          resolve(`💰 **تقرير مالي سريع:**\n\n(ملاحظة: البيانات التفصيلية تحتاج تفعيل مفتاح API)\n\nيمكنك مراجعة التفاصيل في صفحة المالية.`);
        } else if (q.includes('فريق') || q.includes('أعضاء')) {
          const team = this.userService.availableUsers();
          resolve(`👥 **حالة الفريق:**\n\n• عدد الأعضاء: ${team.length}\n• ${team.map(u => u.name).join('، ')}\n\nهل تريد تحليل عبء العمل لكل عضو؟`);
        } else if (q.includes('اقتراح') || q.includes('تحسين')) {
          resolve(`💡 **اقتراحات التحسين:**\n\n1. **ترتيب الأولويات**: ركّز على المهام الأعلى أولوية\n2. **المتابعة اليومية**: خصص 15 دقيقة يومياً لمراجعة التقدم\n3. **توزيع العمل**: وازن المهام بين أعضاء الفريق\n\n(مفتاح API مطلوب للتحليل المتقدم)`);
        } else if (q.includes('مرحبا') || q.includes('هلا') || q.includes('السلام')) {
          resolve(`هلا بك يا ${greeting}! 👋\n\nأنا وشّاي، عقلك الرقمي. جاهز لمساعدتك.\n\nجرّب تسألني:\n• "ملخص اليوم"\n• "المهام العاجلة"\n• "اقتراحات للتحسين"`);
        } else {
          resolve(`شكراً يا ${greeting} على سؤالك! 🤔\n\n(تنبيه: مفتاح Gemini API غير مفعّل — هذا رد تجريبي)\n\nعند تفعيل المفتاح، سأتمكن من:\n• تحليل بياناتك بعمق\n• تقديم اقتراحات ذكية\n• إنشاء تقارير تلقائية`);
        }
      }, 800);
    });
  }
}
