
CREATE POLICY "Admins can insert attribute blocks"
ON public.attribute_block_library
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update attribute blocks"
ON public.attribute_block_library
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete attribute blocks"
ON public.attribute_block_library
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));
