-- Signup bonus: new users receive ₹100 wallet balance (2 free conversions at ₹50 each).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, wallet_balance)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    100
  );
  RETURN NEW;
END;
$$;
