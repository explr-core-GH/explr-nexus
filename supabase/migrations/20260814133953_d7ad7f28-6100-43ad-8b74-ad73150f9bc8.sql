-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROJECT MATERIALS
CREATE TABLE public.project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_items TO authenticated;
GRANT ALL ON public.project_items TO service_role;

ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project items"
  ON public.project_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage project items"
  ON public.project_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_project_items_updated_at
  BEFORE UPDATE ON public.project_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROJECT CURRICULUM
CREATE TABLE public.project_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'link' CHECK (type IN ('link','file')),
  url text,
  file_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_curriculum TO authenticated;
GRANT ALL ON public.project_curriculum TO service_role;

ALTER TABLE public.project_curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view curriculum"
  ON public.project_curriculum FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage curriculum"
  ON public.project_curriculum FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_project_curriculum_updated_at
  BEFORE UPDATE ON public.project_curriculum
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REQUESTS CAN REFERENCE A PROJECT
ALTER TABLE public.item_requests
  ALTER COLUMN item_id DROP NOT NULL,
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN project_name text;

-- RESERVED HOLDS
CREATE TABLE public.item_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.item_requests(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','fulfilled','released')),
  reserved_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_reservations_item ON public.item_reservations (item_id) WHERE status = 'reserved';
CREATE INDEX idx_item_reservations_request ON public.item_reservations (request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_reservations TO authenticated;
GRANT ALL ON public.item_reservations TO service_role;

ALTER TABLE public.item_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reservations"
  ON public.item_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reservations for their own requests"
  ON public.item_reservations FOR INSERT TO authenticated
  WITH CHECK (
    reserved_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.item_requests r
      WHERE r.id = request_id AND (r.requester_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY "Admins can update reservations"
  ON public.item_reservations FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins or owners can delete reservations"
  ON public.item_reservations FOR DELETE TO authenticated
  USING (public.is_admin() OR reserved_by = auth.uid());

CREATE TRIGGER update_item_reservations_updated_at
  BEFORE UPDATE ON public.item_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();