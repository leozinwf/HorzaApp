import FeatureGate from './FeatureGate';

/** Seção PRO/Plus dentro de uma página — conteúdo básico fica livre, avançado gated. */
export default function ProSection({
  featureKey,
  title,
  description,
  children,
  className = '',
  overlay = false,
}) {
  return (
    <section className={`mt-8 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-lg font-black text-text-base">{title}</h2>}
          {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
        </div>
      )}
      <FeatureGate featureKey={featureKey} showLockOverlay={overlay}>
        {children}
      </FeatureGate>
    </section>
  );
}
