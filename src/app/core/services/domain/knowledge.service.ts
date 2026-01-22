import { Injectable, signal, computed, inject } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from './auth.service';
import { AiService } from './ai.service';
import { UiService } from '../state/ui.service';

export interface Document {
    id: string;
    title: string;
    slug?: string;
    content: string;
    contentHtml?: string;
    summary?: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
    authorId?: string;
    authorName?: string;
    parentId?: string;
    viewCount: number;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    versions?: DocumentVersion[];
    links?: DocumentLink[];
}

export interface DocumentVersion {
    id: string;
    documentId: string;
    versionNumber: number;
    title: string;
    content: string;
    changeSummary?: string;
    authorId?: string;
    authorName?: string;
    createdAt: string;
}

export interface DocumentLink {
    id: string;
    documentId: string;
    linkedType: 'task' | 'project' | 'objective' | 'document';
    linkedId: string;
    linkedTitle?: string;
    createdAt: string;
}

export interface DocumentComment {
    id: string;
    documentId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
    private supabase = supabaseClient;
    private authService = inject(AuthService);
    private aiService = inject(AiService);
    private uiService = inject(UiService);

    readonly documents = signal<Document[]>([]);
    readonly loading = signal(false);
    readonly selectedDocument = signal<Document | null>(null);
    readonly searchResults = signal<Document[]>([]);
    readonly aiSuggestions = signal<Document[]>([]);

    readonly categories = computed(() => {
        const cats = new Set(this.documents().map(d => d.category));
        return ['All', ...Array.from(cats)];
    });

    readonly pinnedDocs = computed(() => 
        this.documents().filter(d => d.isPinned && d.status === 'published')
    );

    readonly recentDocs = computed(() => 
        this.documents()
            .filter(d => d.status === 'published')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 10)
    );

    constructor() {
        this.loadDocuments();
    }

    async loadDocuments() {
        if (!isSupabaseConfigured || !this.supabase) {
            this.loadLocalDocuments();
            return;
        }

        this.loading.set(true);
        const { data, error } = await this.supabase
            .from('documents')
            .select(`
                *,
                profiles:author_id(name)
            `)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading documents:', error.message);
            this.loadLocalDocuments();
        } else if (data) {
            this.documents.set(data.map(this.mapDbToDocument));
        }
        this.loading.set(false);
    }

    async getDocument(id: string): Promise<Document | null> {
        if (!isSupabaseConfigured || !this.supabase) {
            return this.documents().find(d => d.id === id) || null;
        }

        const { data, error } = await this.supabase
            .from('documents')
            .select(`
                *,
                profiles:author_id(name),
                document_versions(*),
                document_links(*)
            `)
            .eq('id', id)
            .single();

        if (error || !data) return null;

        // Increment view count
        await this.supabase
            .from('documents')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', id);

        const doc = this.mapDbToDocument(data);
        this.selectedDocument.set(doc);
        return doc;
    }

    async createDocument(doc: Partial<Document>): Promise<Document | null> {
        const profile = this.authService.activeProfile();
        if (!profile) return null;

        const slug = this.generateSlug(doc.title || 'untitled');
        
        if (!isSupabaseConfigured || !this.supabase) {
            const newDoc: Document = {
                id: `doc-${Date.now()}`,
                title: doc.title || 'مستند جديد',
                slug,
                content: doc.content || '',
                contentHtml: this.markdownToHtml(doc.content || ''),
                summary: doc.summary || '',
                category: doc.category || 'General',
                tags: doc.tags || [],
                status: doc.status || 'draft',
                authorId: profile.id,
                authorName: profile.name,
                viewCount: 0,
                isPinned: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.documents.update(docs => [newDoc, ...docs]);
            this.saveLocal();
            return newDoc;
        }

        const { data, error } = await this.supabase
            .from('documents')
            .insert([{
                title: doc.title,
                slug,
                content: doc.content,
                content_html: this.markdownToHtml(doc.content || ''),
                summary: doc.summary,
                category: doc.category || 'General',
                tags: doc.tags || [],
                status: doc.status || 'draft',
                author_id: profile.id,
                parent_id: doc.parentId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating document:', error.message);
            this.uiService.addNotification('خطأ', 'فشل إنشاء المستند', 'Warning');
            return null;
        }

        const newDoc = this.mapDbToDocument(data);
        this.documents.update(docs => [newDoc, ...docs]);
        this.uiService.addNotification('تم بنجاح', 'تم إنشاء المستند', 'Success');
        return newDoc;
    }

    async updateDocument(id: string, updates: Partial<Document>, changeSummary?: string): Promise<boolean> {
        const profile = this.authService.activeProfile();
        if (!profile) return false;

        if (!isSupabaseConfigured || !this.supabase) {
            this.documents.update(docs => docs.map(d => 
                d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
            ));
            this.saveLocal();
            return true;
        }

        // Create version before updating
        const currentDoc = this.documents().find(d => d.id === id);
        if (currentDoc) {
            await this.createVersion(id, currentDoc, changeSummary);
        }

        const { error } = await this.supabase
            .from('documents')
            .update({
                title: updates.title,
                content: updates.content,
                content_html: updates.content ? this.markdownToHtml(updates.content) : undefined,
                summary: updates.summary,
                category: updates.category,
                tags: updates.tags,
                status: updates.status,
                is_pinned: updates.isPinned,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating document:', error.message);
            return false;
        }

        this.documents.update(docs => docs.map(d => 
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        ));
        this.uiService.addNotification('تم الحفظ', 'تم تحديث المستند', 'Success');
        return true;
    }

    async deleteDocument(id: string): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) {
            this.documents.update(docs => docs.filter(d => d.id !== id));
            this.saveLocal();
            return true;
        }

        const { error } = await this.supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting document:', error.message);
            return false;
        }

        this.documents.update(docs => docs.filter(d => d.id !== id));
        this.uiService.addNotification('تم الحذف', 'تم حذف المستند', 'Success');
        return true;
    }

    // Version Control
    async createVersion(docId: string, doc: Document, changeSummary?: string): Promise<void> {
        if (!isSupabaseConfigured || !this.supabase) return;

        const profile = this.authService.activeProfile();
        const versions = await this.getVersions(docId);
        const nextVersion = versions.length + 1;

        await this.supabase
            .from('document_versions')
            .insert([{
                document_id: docId,
                version_number: nextVersion,
                title: doc.title,
                content: doc.content,
                content_html: doc.contentHtml,
                change_summary: changeSummary || `الإصدار ${nextVersion}`,
                author_id: profile?.id
            }]);
    }

    async getVersions(docId: string): Promise<DocumentVersion[]> {
        if (!isSupabaseConfigured || !this.supabase) return [];

        const { data, error } = await this.supabase
            .from('document_versions')
            .select(`*, profiles:author_id(name)`)
            .eq('document_id', docId)
            .order('version_number', { ascending: false });

        if (error || !data) return [];

        return data.map(v => ({
            id: v.id,
            documentId: v.document_id,
            versionNumber: v.version_number,
            title: v.title,
            content: v.content,
            changeSummary: v.change_summary,
            authorId: v.author_id,
            authorName: v.profiles?.name,
            createdAt: v.created_at
        }));
    }

    async restoreVersion(docId: string, version: DocumentVersion): Promise<boolean> {
        return this.updateDocument(docId, {
            title: version.title,
            content: version.content
        }, `استعادة الإصدار ${version.versionNumber}`);
    }

    // Search
    async search(query: string): Promise<Document[]> {
        if (!query.trim()) {
            this.searchResults.set([]);
            return [];
        }

        if (!isSupabaseConfigured || !this.supabase) {
            const results = this.documents().filter(d =>
                d.title.toLowerCase().includes(query.toLowerCase()) ||
                d.content.toLowerCase().includes(query.toLowerCase()) ||
                d.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
            );
            this.searchResults.set(results);
            return results;
        }

        // Full-text search
        const { data, error } = await this.supabase
            .from('documents')
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .eq('status', 'published')
            .limit(20);

        if (error || !data) {
            this.searchResults.set([]);
            return [];
        }

        const results = data.map(this.mapDbToDocument);
        this.searchResults.set(results);
        return results;
    }

    // AI Suggestions
    async getAiSuggestions(context: string): Promise<Document[]> {
        if (!context.trim()) return [];

        // Use AI to find relevant documents
        const allDocs = this.documents().filter(d => d.status === 'published');
        if (allDocs.length === 0) return [];

        // Simple keyword matching for now
        const keywords = context.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const scored = allDocs.map(doc => {
            let score = 0;
            keywords.forEach(kw => {
                if (doc.title.toLowerCase().includes(kw)) score += 3;
                if (doc.content.toLowerCase().includes(kw)) score += 1;
                if (doc.tags.some(t => t.toLowerCase().includes(kw))) score += 2;
            });
            return { doc, score };
        });

        const suggestions = scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(s => s.doc);

        this.aiSuggestions.set(suggestions);
        return suggestions;
    }

    async generateSummary(content: string): Promise<string> {
        try {
            const summary = await this.aiService.sendMessage(
                `لخص هذا النص باختصار في جملتين أو ثلاث:\n\n${content.substring(0, 2000)}`
            );
            return summary;
        } catch {
            return content.substring(0, 200) + '...';
        }
    }

    // Document Links
    async linkDocument(docId: string, linkedType: string, linkedId: string): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;

        const profile = this.authService.activeProfile();
        const { error } = await this.supabase
            .from('document_links')
            .insert([{
                document_id: docId,
                linked_type: linkedType,
                linked_id: linkedId,
                created_by: profile?.id
            }]);

        return !error;
    }

    async unlinkDocument(linkId: string): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;

        const { error } = await this.supabase
            .from('document_links')
            .delete()
            .eq('id', linkId);

        return !error;
    }

    // Helpers
    private mapDbToDocument(db: any): Document {
        return {
            id: db.id,
            title: db.title,
            slug: db.slug,
            content: db.content || '',
            contentHtml: db.content_html,
            summary: db.summary,
            category: db.category || 'General',
            tags: db.tags || [],
            status: db.status || 'draft',
            authorId: db.author_id,
            authorName: db.profiles?.name,
            parentId: db.parent_id,
            viewCount: db.view_count || 0,
            isPinned: db.is_pinned || false,
            createdAt: db.created_at,
            updatedAt: db.updated_at,
            versions: db.document_versions?.map((v: any) => ({
                id: v.id,
                versionNumber: v.version_number,
                title: v.title,
                content: v.content,
                changeSummary: v.change_summary,
                createdAt: v.created_at
            })),
            links: db.document_links
        };
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '-' + Date.now().toString(36);
    }

    private markdownToHtml(md: string): string {
        // Basic Markdown to HTML conversion
        return md
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    private loadLocalDocuments() {
        const saved = localStorage.getItem('himcontrol_documents');
        if (saved) {
            try {
                this.documents.set(JSON.parse(saved));
            } catch {}
        }
    }

    private saveLocal() {
        localStorage.setItem('himcontrol_documents', JSON.stringify(this.documents()));
    }
}
