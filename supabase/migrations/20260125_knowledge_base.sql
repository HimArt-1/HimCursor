-- ========================================
-- Knowledge Base & Wiki System
-- ========================================

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE,
  content text,
  content_html text,
  summary text,
  category text DEFAULT 'General',
  tags text[],
  status text CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  author_id uuid REFERENCES public.profiles(id),
  parent_id uuid REFERENCES public.documents(id),
  view_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document versions (Version Control)
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text,
  content_html text,
  change_summary text,
  author_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Document links (to tasks, projects, etc.)
CREATE TABLE IF NOT EXISTS public.document_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  linked_type text CHECK (linked_type IN ('task', 'project', 'objective', 'document')),
  linked_id uuid NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, linked_type, linked_id)
);

-- Document comments
CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Policies for documents
CREATE POLICY "Documents viewable by authenticated users"
  ON public.documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can manage documents"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for versions
CREATE POLICY "Versions viewable by authenticated users"
  ON public.document_versions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can create versions"
  ON public.document_versions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for links
CREATE POLICY "Links viewable by authenticated users"
  ON public.document_links FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can manage links"
  ON public.document_links FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for comments
CREATE POLICY "Comments viewable by authenticated users"
  ON public.document_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can manage comments"
  ON public.document_comments FOR ALL
  USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS documents_category_idx ON public.documents(category);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_author_idx ON public.documents(author_id);
CREATE INDEX IF NOT EXISTS documents_slug_idx ON public.documents(slug);
CREATE INDEX IF NOT EXISTS document_versions_doc_idx ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS document_links_doc_idx ON public.document_links(document_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS documents_search_idx ON public.documents 
  USING gin(to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Trigger for updated_at
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
