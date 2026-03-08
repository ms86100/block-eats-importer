-- Allow admins to read all service_bookings
CREATE POLICY "Admins can read all service bookings"
ON public.service_bookings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));