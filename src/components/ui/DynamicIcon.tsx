import { icons, LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicIconProps extends LucideProps {
  /** Lucide icon name (PascalCase) or emoji string */
  name: string;
  /** Fallback if icon not found */
  fallback?: string;
}

/**
 * Renders a Lucide icon by name or an emoji string.
 * If `name` matches a Lucide icon (PascalCase, e.g. "ChefHat"), renders the SVG icon.
 * Otherwise renders the string as-is (emoji).
 */
export function DynamicIcon({ name, fallback = '📦', size = 20, className, ...props }: DynamicIconProps) {
  if (!name) return <span className={className}>{fallback}</span>;

  // Check if it's a Lucide icon name (PascalCase, no spaces, no emoji)
  const LucideIcon = (icons as Record<string, any>)[name];
  if (LucideIcon) {
    return <LucideIcon size={size} className={className} {...props} />;
  }

  // Otherwise render as emoji/text
  return <span className={cn('inline-flex items-center justify-center', className)} style={{ fontSize: size }}>{name}</span>;
}

/**
 * Returns style props for a color that could be a hex/rgb value or a Tailwind class.
 * If hex/rgb → returns { style: { backgroundColor, color } }
 * If Tailwind class → returns { className }
 */
export function resolveColorProps(color: string | null | undefined): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (!color) return {};

  // Hex color or rgb/hsl
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
    return {
      style: {
        backgroundColor: `${color}20`, // 12% opacity
        color: color,
      },
    };
  }

  // Tailwind class
  return { className: color };
}
