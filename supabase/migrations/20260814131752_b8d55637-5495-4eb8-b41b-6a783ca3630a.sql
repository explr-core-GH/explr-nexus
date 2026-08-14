ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS contents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_contents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS item_tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name)
SELECT c FROM unnest(ARRAY[
  '3D Printing & Fabrication',
  'Microcontrollers & Circuits',
  'Coding & Computer Science',
  'STEM Kits & Curriculum',
  'Drones & Aerial',
  'Audio/Visual & Photography',
  'Computers & Tablets',
  'VR/AR',
  'Science & Lab Equipment',
  'Batteries & Power',
  'Cables & Adapters',
  'Storage & Cases',
  'Games & Manipulatives',
  'Outdoor & Field Equipment'
]) AS c
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tags (name)
SELECT t FROM unnest(ARRAY[
  'micro:bit',
  'Arduino',
  'Raspberry Pi',
  'LEGO',
  'Sphero',
  'Ozobot',
  'classroom-set',
  'single-unit',
  'requires-training',
  'fragile',
  'elementary',
  'middle-school',
  'high-school',
  'charging-required',
  'kit-with-contents'
]) AS t
ON CONFLICT (name) DO NOTHING;