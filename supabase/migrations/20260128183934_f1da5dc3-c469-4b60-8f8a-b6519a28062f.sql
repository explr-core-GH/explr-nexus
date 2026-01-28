-- Add organization fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN organization_name TEXT,
ADD COLUMN position TEXT,
ADD COLUMN organization_address TEXT;