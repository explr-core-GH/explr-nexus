-- Create a function to add user organization to locations table
CREATE OR REPLACE FUNCTION public.add_user_organization_to_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only add if we have valid coordinates and organization info
  IF NEW.organization_latitude IS NOT NULL 
     AND NEW.organization_longitude IS NOT NULL 
     AND NEW.organization_name IS NOT NULL 
     AND NEW.organization_address IS NOT NULL THEN
    
    -- Check if this exact location already exists (by address)
    IF NOT EXISTS (
      SELECT 1 FROM public.locations 
      WHERE address = NEW.organization_address
    ) THEN
      -- Insert the organization as a new location
      INSERT INTO public.locations (name, address, latitude, longitude)
      VALUES (
        NEW.organization_name,
        NEW.organization_address,
        NEW.organization_latitude,
        NEW.organization_longitude
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after profile insert or update
DROP TRIGGER IF EXISTS on_profile_organization_update ON public.profiles;

CREATE TRIGGER on_profile_organization_update
  AFTER INSERT OR UPDATE OF organization_name, organization_address, organization_latitude, organization_longitude
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_organization_to_locations();