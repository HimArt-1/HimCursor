
import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { DataService } from '../state/data.service';
import { environment } from '../../config/environment';
import { AI_PERSONA } from '../../config/ai-persona.config';

@Injectable({ providedIn: 'root' })
export class AiService {
  private dataService = inject(DataService);
  private ai: GoogleGenAI;

  constructor() {
    // Initialize GenAI - Fallback handling for demo environment without key
    const apiKey = environment.apiKey || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async sendMessage(userMessage: string): Promise<string> {
    if (!environment.apiKey) {
      // Mock response for demo purposes if no key is present
      return this.mockResponse(userMessage);
    }

    try {
      const context = this.buildContext();

      const systemPrompt = `
      ${AI_PERSONA.systemInstruction}

      CURRENT PROJECT STATE (JSON):
      ${JSON.stringify(context)}

      STRICT RULES:
      ${AI_PERSONA.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      return response.text || 'عذراً، لم أستطع فهم ذلك.';
    } catch (error) {
      console.error('AI Error', error);
      return 'واجهت مشكلة في الاتصال بالدماغ الرقمي. الرجاء المحاولة لاحقاً.';
    }
  }

  private buildContext() {
    return {
      tasks: this.dataService.tasks(),
      objectives: this.dataService.objectives(),
      campaigns: this.dataService.campaigns(),
      stats: this.dataService.stats(),
      traceability: this.dataService.preflightReport(),
      currentUser: this.dataService.currentUser(),
      team: this.dataService.availableUsers()
    };
  }

  private mockResponse(query: string): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        const q = query.toLowerCase();
        if (q.includes('مهام') || q.includes('tasks')) {
          const stats = this.dataService.stats();
          resolve(`لديك حالياً ${stats.doingTasks} مهام قيد التنفيذ و ${stats.todoTasks} في الانتظار. هل تريدني أن أسرد المهام العاجلة؟`);
        } else if (q.includes('حملة') || q.includes('campaign')) {
          resolve('أرى أن هناك حملة "إطلاق مجموعة الشتاء" نشطة حالياً. هل تريد اقتراحات لتحسينها؟');
        } else if (q.includes('مرحبا') || q.includes('هلا')) {
          resolve('هلا بك! أنا مساعد وشّى الذكي. آمرني؟');
        } else {
          resolve('(ملاحظة: هذا رد تجريبي لأن مفتاح API غير موجود). سأقوم بتحليل بيانات المشروع والإجابة عليك بدقة عند تفعيل المفتاح.');
        }
      }, 1000);
    });
  }
}
