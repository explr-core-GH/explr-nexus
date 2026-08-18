-- Optional mailing address for a teacher, entered manually by an admin.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS address text;
