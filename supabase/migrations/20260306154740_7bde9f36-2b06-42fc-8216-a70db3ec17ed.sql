-- Drop and recreate get_effective_society_features with updated return type
DROP FUNCTION IF EXISTS public.get_effective_society_features(uuid);

CREATE OR REPLACE FUNCTION public.get_effective_society_features(_society_id uuid)
RETURNS TABLE(feature_key text, is_enabled boolean, source text, society_configurable boolean, display_name text, description text, icon_name text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' SET statement_timeout TO '5s' AS $$
BEGIN
  RETURN QUERY
  WITH builder_for_society AS (
    SELECT bs.builder_id FROM builder_societies bs WHERE bs.society_id = _society_id LIMIT 1
  ),
  package_features AS (
    SELECT pf.feature_key, fpi.enabled AS is_enabled, pf.id AS feature_id, pf.is_core, pf.society_configurable, pf.display_name, pf.description, pf.icon_name
    FROM builder_for_society bfs
    JOIN builder_feature_packages bfp ON bfp.builder_id = bfs.builder_id AND (bfp.expires_at IS NULL OR bfp.expires_at > now())
    JOIN feature_package_items fpi ON fpi.package_id = bfp.package_id
    JOIN platform_features pf ON pf.id = fpi.feature_id
  ),
  overrides AS (
    SELECT sfo.feature_id, sfo.is_enabled FROM society_feature_overrides sfo WHERE sfo.society_id = _society_id
  )
  SELECT pf_agg.feature_key,
    CASE WHEN pf_agg.is_core THEN true WHEN o.feature_id IS NOT NULL THEN o.is_enabled ELSE pf_agg.is_enabled END,
    CASE WHEN pf_agg.is_core THEN 'core' WHEN o.feature_id IS NOT NULL THEN 'override' ELSE 'package' END,
    pf_agg.society_configurable, pf_agg.display_name, pf_agg.description, pf_agg.icon_name
  FROM (SELECT pff.feature_key, pff.feature_id, pff.is_core, pff.society_configurable, pff.display_name, pff.description, pff.icon_name, bool_or(pff.is_enabled) AS is_enabled FROM package_features pff GROUP BY pff.feature_key, pff.feature_id, pff.is_core, pff.society_configurable, pff.display_name, pff.description, pff.icon_name) pf_agg
  LEFT JOIN overrides o ON o.feature_id = pf_agg.feature_id
  UNION ALL
  SELECT pf2.feature_key, true, 'core', pf2.society_configurable, pf2.display_name, pf2.description, pf2.icon_name FROM platform_features pf2
  WHERE pf2.is_core = true AND NOT EXISTS (SELECT 1 FROM builder_for_society bfs2 JOIN builder_feature_packages bfp2 ON bfp2.builder_id = bfs2.builder_id JOIN feature_package_items fpi2 ON fpi2.package_id = bfp2.package_id AND fpi2.feature_id = pf2.id)
  UNION ALL
  SELECT pf3.feature_key,
    CASE WHEN pf3.is_core THEN true WHEN o3.feature_id IS NOT NULL THEN o3.is_enabled ELSE true END,
    CASE WHEN o3.feature_id IS NOT NULL THEN 'override' ELSE 'default' END,
    pf3.society_configurable, pf3.display_name, pf3.description, pf3.icon_name
  FROM platform_features pf3
  LEFT JOIN society_feature_overrides o3 ON o3.feature_id = pf3.id AND o3.society_id = _society_id
  WHERE NOT EXISTS (SELECT 1 FROM builder_for_society);
END;
$$;

-- Recreate is_feature_enabled_for_society since it depends on get_effective_society_features
CREATE OR REPLACE FUNCTION public.is_feature_enabled_for_society(_society_id uuid, _feature_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT ef.is_enabled FROM public.get_effective_society_features(_society_id) ef WHERE ef.feature_key = _feature_key LIMIT 1), true)
$$;