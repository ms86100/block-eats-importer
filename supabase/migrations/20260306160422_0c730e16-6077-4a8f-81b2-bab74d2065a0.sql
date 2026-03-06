INSERT INTO public.user_roles (user_id, role)
VALUES ('4a005c1b-8f41-43c0-8752-962eefaa6821', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;