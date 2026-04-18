import { Injectable, signal, inject } from '@angular/core';
import { SharedRequest, RequestAttachment, RequestStatus, RelayStep } from '../../types';
import { SupabaseService } from '../infra/supabase.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { UiService } from '../state/ui.service';
import { ToastService } from '../state/toast.service';

@Injectable({ providedIn: 'root' })
export class RequestService {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService);
    private userService = inject(UserService);
    private uiService = inject(UiService);
    private toastService = inject(ToastService);

    readonly requests = signal<SharedRequest[]>([]);
    readonly loading = signal(false);

    async loadRequests() {
        if (!this.supabaseService.isConfigured) return;
        this.loading.set(true);
        try {
            await this.authService.ensureSession();
            const { data, error } = await this.supabaseService.client
                .from('shared_requests')
                .select('*, shared_request_attachments(*)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading requests:', error);
                this.toastService.show('خطأ في تحميل الطلبات', 'error');
                return;
            }

            const mapped = (data || []).map((r: any) => this.mapDbToRequest(r));
            this.requests.set(mapped);
        } finally {
            this.loading.set(false);
        }
    }
    async createRequest(
        title: string,
        description: string,
        type: string,
        notes: string,
        files: File[],
        isRelay: boolean = false,
        relaySteps: RelayStep[] = []
    ): Promise<SharedRequest | null> {
        if (!this.supabaseService.isConfigured) return null;

        const userId = await this.getAuthUserId();
        const userName = this.getCurrentUserName();

        if (!userId) {
            this.toastService.show('يجب تسجيل الدخول أولاً', 'error');
            return null;
        }

        const { data, error } = await this.supabaseService.client
            .from('shared_requests')
            .insert([{
                title,
                description,
                type,
                notes: notes || null,
                requester_id: userId,
                requester_name: userName,
                status: 'جديد',
                is_relay: isRelay,
                relay_steps: relaySteps,
                current_step_index: 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating request:', error);
            this.toastService.show('خطأ في إنشاء الطلب', 'error');
            return null;
        }

        // Upload attachments
        if (files.length > 0 && data) {
            await this.uploadFiles(data.id, files, 'input', userId);
        }

        // Notify
        this.uiService.addNotification(
            'طلب جديد',
            `${userName} أضاف طلب: ${title}`,
            'Info'
        );

        await this.loadRequests();
        this.toastService.show('تم إنشاء الطلب بنجاح', 'success');
        return this.mapDbToRequest({ ...data, shared_request_attachments: [] });
    }

    private async getAuthUserId(): Promise<string> {
        const session = await this.authService.ensureSession();
        return session?.user?.id || '';
    }

    private getCurrentUserName(): string {
        const profile = this.authService.activeProfile();
        if (profile?.name) return profile.name;
        const user = this.userService.currentUser();
        return user?.name || 'مستخدم';
    }

    async assignRequest(requestId: string): Promise<boolean> {
        if (!this.supabaseService.isConfigured) return false;

        const userId = await this.getAuthUserId();
        const userName = this.getCurrentUserName();

        if (!userId) {
            this.toastService.show('يجب تسجيل الدخول أولاً', 'error');
            return false;
        }

        const { error } = await this.supabaseService.client
            .from('shared_requests')
            .update({
                assignee_id: userId,
                assignee_name: userName,
                status: 'قيد التنفيذ',
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error assigning request:', error);
            this.toastService.show('خطأ في قبول الطلب', 'error');
            return false;
        }

        this.uiService.addNotification(
            'تم قبول الطلب',
            `${userName} بدأ العمل على الطلب`,
            'Info'
        );

        await this.loadRequests();
        this.toastService.show('تم قبول الطلب', 'success');
        return true;
    }

    async completeRelayStep(
        requestId: string,
        outputNotes: string,
        outputLink: string,
        outputFiles: File[]
    ): Promise<boolean> {
        if (!this.supabaseService.isConfigured) return false;

        const request = this.requests().find(r => r.id === requestId);
        if (!request || !request.relaySteps || !request.isRelay) return false;

        const userId = await this.getAuthUserId();
        if (!userId) {
            this.toastService.show('يجب تسجيل الدخول أولاً', 'error');
            return false;
        }

        // Upload output files
        if (outputFiles.length > 0) {
            await this.uploadFiles(requestId, outputFiles, 'output', userId);
        }

        const steps = [...request.relaySteps];
        const currentIndex = request.currentStepIndex || 0;
        const currentStep = steps[currentIndex];

        // Update current step
        currentStep.status = 'done';
        currentStep.completedAt = new Date().toISOString();
        currentStep.outputNotes = outputNotes;
        currentStep.assigneeId = userId;
        currentStep.assigneeName = this.getCurrentUserName();

        let nextIndex = currentIndex + 1;
        let finalStatus: RequestStatus = 'قيد التنفيذ';

        if (nextIndex < steps.length) {
            steps[nextIndex].status = 'active';
            // Notify next assignee if exists
            if (steps[nextIndex].assigneeId) {
                this.uiService.addNotification(
                    'مرحلة جديدة في تتابع',
                    `تم تحويل الطلب ${request.title} إليك لمرحلة: ${steps[nextIndex].label}`,
                    'Info'
                );
            }
        } else {
            finalStatus = 'مكتمل';
            this.uiService.addNotification(
                'تتابع مكتمل',
                `تم إكمال كافة مراحل الطلب: ${request.title}`,
                'celebrate'
            );
        }

        const { error } = await this.supabaseService.client
            .from('shared_requests')
            .update({
                relay_steps: steps,
                current_step_index: nextIndex,
                status: finalStatus,
                completed_at: finalStatus === 'مكتمل' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
                // Keep the last output info in main fields too for compatibility
                output_notes: outputNotes || null,
                output_link: outputLink || null,
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error advancing relay step:', error);
            this.toastService.show('خطأ في تحديث المرحلة', 'error');
            return false;
        }

        await this.loadRequests();
        this.toastService.show(nextIndex < steps.length ? 'تم إنجاز المرحلة والانتقال للتالي' : 'تم إكمال الطلب بنجاح', 'success');
        return true;
    }

    async completeRequest(
        requestId: string,
        outputNotes: string,
        outputLink: string,
        outputFiles: File[]
    ): Promise<boolean> {
        if (!this.supabaseService.isConfigured) return false;

        const userId = await this.getAuthUserId();
        if (!userId) {
            this.toastService.show('يجب تسجيل الدخول أولاً', 'error');
            return false;
        }

        // Upload output files FIRST (before marking complete)
        let uploadSuccess = true;
        if (outputFiles.length > 0) {
            uploadSuccess = await this.uploadFiles(requestId, outputFiles, 'output', userId);
        }

        if (!uploadSuccess) {
            this.toastService.show('فشل رفع بعض الملفات، يرجى المحاولة مرة أخرى', 'error');
            return false;
        }

        const { error } = await this.supabaseService.client
            .from('shared_requests')
            .update({
                status: 'مكتمل',
                output_notes: outputNotes || null,
                output_link: outputLink || null,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error completing request:', error);
            this.toastService.show('خطأ في إكمال الطلب', 'error');
            return false;
        }

        this.uiService.addNotification(
            'طلب مكتمل',
            `تم إكمال الطلب بنجاح ✅`,
            'Success'
        );

        await this.loadRequests();
        this.toastService.show('تم إكمال الطلب بنجاح 🎉', 'celebrate');
        return true;
    }

    async deleteRequest(requestId: string): Promise<boolean> {
        if (!this.supabaseService.isConfigured) return false;
        await this.authService.ensureSession();

        // Delete storage files first
        const request = this.requests().find(r => r.id === requestId);
        if (request && request.attachments.length > 0) {
            const filePaths = request.attachments.map(a => {
                const url = new URL(a.fileUrl);
                return url.pathname.split('/shared-requests/').pop() || '';
            }).filter(Boolean);
            if (filePaths.length > 0) {
                await this.supabaseService.client.storage
                    .from('shared-requests')
                    .remove(filePaths);
            }
        }

        const { error } = await this.supabaseService.client
            .from('shared_requests')
            .delete()
            .eq('id', requestId);

        if (error) {
            console.error('Error deleting request:', error);
            this.toastService.show('خطأ في حذف الطلب', 'error');
            return false;
        }

        await this.loadRequests();
        this.toastService.show('تم حذف الطلب', 'success');
        return true;
    }

    private async uploadFiles(requestId: string, files: File[], kind: 'input' | 'output', userId: string): Promise<boolean> {
        let allSuccess = true;
        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, '_');
            const filePath = `${requestId}/${kind}/${timestamp}_${safeName}`;

            console.log(`Uploading file: ${file.name} to ${filePath} by user ${userId}`);

            const { error: uploadError } = await this.supabaseService.client.storage
                .from('shared-requests')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading file:', file.name, uploadError);
                this.toastService.show(`فشل رفع الملف: ${file.name}`, 'error');
                allSuccess = false;
                continue;
            }

            const { data: urlData } = this.supabaseService.client.storage
                .from('shared-requests')
                .getPublicUrl(filePath);

            // Insert attachment record
            const insertData: any = {
                request_id: requestId,
                file_name: file.name,
                file_url: urlData.publicUrl,
                file_type: file.type || 'application/octet-stream',
                file_size: file.size,
                kind,
            };
            // Only set uploaded_by if userId is valid (non-empty)
            if (userId) {
                insertData.uploaded_by = userId;
            }

            const { error: insertError } = await this.supabaseService.client
                .from('shared_request_attachments')
                .insert([insertData]);

            if (insertError) {
                console.error('Error saving attachment record:', file.name, insertError);
                this.toastService.show(`فشل حفظ سجل الملف: ${file.name}`, 'error');
                allSuccess = false;
            } else {
                console.log(`File uploaded successfully: ${file.name}`);
            }
        }
        return allSuccess;
    }

    private mapDbToRequest(dbRecord: any): SharedRequest {
        const attachments: RequestAttachment[] = (dbRecord.shared_request_attachments || []).map((a: any) => ({
            id: a.id,
            requestId: a.request_id,
            fileName: a.file_name,
            fileUrl: a.file_url,
            fileType: a.file_type || '',
            fileSize: a.file_size || 0,
            kind: a.kind || 'input',
            uploadedBy: a.uploaded_by || '',
            createdAt: a.created_at,
        }));

        return {
            id: dbRecord.id,
            title: dbRecord.title,
            description: dbRecord.description || '',
            type: dbRecord.type || 'أخرى',
            status: dbRecord.status || 'جديد',
            notes: dbRecord.notes,
            requesterId: dbRecord.requester_id,
            requesterName: dbRecord.requester_name,
            assigneeId: dbRecord.assignee_id,
            assigneeName: dbRecord.assignee_name,
            completedAt: dbRecord.completed_at,
            outputNotes: dbRecord.output_notes,
            outputLink: dbRecord.output_link,
            isRelay: dbRecord.is_relay,
            relaySteps: dbRecord.relay_steps || [],
            currentStepIndex: dbRecord.current_step_index || 0,
            attachments,
            createdAt: dbRecord.created_at,
            updatedAt: dbRecord.updated_at,
        };
    }

    // Helpers
    getStatusColor(status: RequestStatus): string {
        switch (status) {
            case 'جديد': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'قيد التنفيذ': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'مكتمل': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    }

    getTypeColor(type: string): string {
        switch (type) {
            case 'تصميم': return 'bg-wushai-cocoa/20 text-wushai-sand';
            case 'برمجة': return 'bg-cyan-500/20 text-cyan-400';
            case 'محتوى': return 'bg-pink-500/20 text-pink-400';
            case 'تسويق': return 'bg-orange-500/20 text-orange-400';
            case 'إداري': return 'bg-indigo-500/20 text-wushai-olive';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    }

    getTypeIcon(type: string): string {
        switch (type) {
            case 'تصميم': return '🎨';
            case 'برمجة': return '💻';
            case 'محتوى': return '📝';
            case 'تسويق': return '📢';
            case 'إداري': return '📋';
            default: return '📌';
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatTimeAgo(isoString: string): string {
        const now = Date.now();
        const then = new Date(isoString).getTime();
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} ساعة`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `منذ ${days} يوم`;
        return new Date(isoString).toLocaleDateString('ar-SA');
    }
}
