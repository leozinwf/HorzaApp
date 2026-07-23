import { Link } from 'react-router-dom';
import HorzaFooter from '../layout/HorzaFooter';

export default function InstitutionalLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 md:py-14">
        <Link to="/" className="text-sm font-bold text-brand hover:underline mb-6 inline-block">
          ← Voltar ao início
        </Link>
        <h1 className="text-2xl md:text-3xl font-black text-text-base">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-2 leading-relaxed">{subtitle}</p>}
        <div className="mt-8 space-y-4 text-sm text-text-muted leading-relaxed">{children}</div>
      </div>
      <HorzaFooter />
    </div>
  );
}
