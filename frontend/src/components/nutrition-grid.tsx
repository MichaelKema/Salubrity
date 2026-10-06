import type { ReactNode } from 'react';

// Salubrity's own layout primitives. Styling lives in styles.css.
export function NutritionGrid({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}
export function NutritionCard({ className = '', header, title, description }: {
  className?: string; header: ReactNode; title: ReactNode; description: ReactNode;
}) {
  return <article className={className}>{header}<div><div>{title}</div><div>{description}</div></div></article>;
}
