import { useMemo } from 'react';
import { useCategoryConfigs } from '@/hooks/useCategoryBehavior';
import { CategoryConfig } from '@/types/categories';

export interface CategoryFeatureFlags {
  hasServiceLayout: boolean;
  supportsAddons: boolean;
  supportsRecurring: boolean;
  supportsStaffAssignment: boolean;
  showVegToggle: boolean;
  showDurationField: boolean;
}

const EMPTY_FLAGS: CategoryFeatureFlags = {
  hasServiceLayout: false,
  supportsAddons: false,
  supportsRecurring: false,
  supportsStaffAssignment: false,
  showVegToggle: false,
  showDurationField: false,
};

/**
 * Resolves feature flags for a single category from the cached category_config.
 */
export function useCategoryFlags(category: string | null): CategoryFeatureFlags {
  const { configs } = useCategoryConfigs();

  return useMemo(() => {
    if (!category) return EMPTY_FLAGS;
    const config = configs.find(c => c.category === category);
    if (!config) return EMPTY_FLAGS;
    return configToFlags(config);
  }, [configs, category]);
}

/**
 * Resolves merged feature flags across multiple categories.
 * Returns true for a flag if ANY of the given categories has it enabled.
 */
export function useSellerCategoryFlags(categories: string[]): CategoryFeatureFlags {
  const { configs } = useCategoryConfigs();

  return useMemo(() => {
    if (!categories.length) return EMPTY_FLAGS;
    const matched = configs.filter(c => categories.includes(c.category));
    if (!matched.length) return EMPTY_FLAGS;

    return {
      hasServiceLayout: matched.some(c => c.layoutType === 'service'),
      supportsAddons: matched.some(c => (c as any).behavior?.supportsAddons ?? lookupRaw(c, 'supports_addons')),
      supportsRecurring: matched.some(c => lookupRaw(c, 'supports_recurring')),
      supportsStaffAssignment: matched.some(c => lookupRaw(c, 'supports_staff_assignment')),
      showVegToggle: matched.some(c => c.formHints.showVegToggle),
      showDurationField: matched.some(c => c.formHints.showDurationField),
    };
  }, [configs, categories]);
}

function configToFlags(config: CategoryConfig): CategoryFeatureFlags {
  return {
    hasServiceLayout: config.layoutType === 'service',
    supportsAddons: lookupRaw(config, 'supports_addons'),
    supportsRecurring: lookupRaw(config, 'supports_recurring'),
    supportsStaffAssignment: lookupRaw(config, 'supports_staff_assignment'),
    showVegToggle: config.formHints.showVegToggle,
    showDurationField: config.formHints.showDurationField,
  };
}

/**
 * The CategoryConfig type doesn't expose every DB column.
 * These flags exist on the raw row but aren't mapped into the typed config.
 * We access them via the original object which retains all properties at runtime.
 */
function lookupRaw(config: any, key: string): boolean {
  return config[key] === true;
}
