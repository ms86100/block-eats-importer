CREATE OR REPLACE FUNCTION public.check_seller_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _status text;
BEGIN
  SELECT verification_status INTO _status 
  FROM public.seller_profiles WHERE id = NEW.seller_id;
  
  IF _status IS NULL THEN 
    RAISE EXCEPTION 'Seller profile not found'; 
  END IF;
  
  -- Allow draft/pending sellers to manage products during onboarding
  -- Only block rejected sellers
  IF _status = 'rejected' THEN 
    RAISE EXCEPTION 'Seller not approved (status: %)', _status; 
  END IF;
  
  RETURN NEW;
END;
$$;