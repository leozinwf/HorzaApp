import { X, MapPin, Phone, Building2, ExternalLink, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlanBadgeClass, getPlanLabel } from '../../constants/planDisplay';

export default function MasterEmpresaQuickModal({ empresa, onClose, onEdit }) {
  if (!empresa) return null;

  const slugPlano = empresa.status === 'pendente' ? 'pending' : (empresa.plan_slug || 'free');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-border-line w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto horza-scroll">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-base">
          <X size={20} />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-brand/10 text-brand shrink-0">
            <Building2 size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-text-base truncate">{empresa.nome}</h2>
            <p className="text-sm text-text-muted">/{empresa.slug}</p>
            <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${getPlanBadgeClass(slugPlano)}`}>
              {getPlanLabel(slugPlano, empresa.plan_nome)}
            </span>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <InfoRow label="Status" value={empresa.status} />
          <InfoRow label="CNPJ" value={empresa.cnpj || '—'} />
          <InfoRow label="Telefone" value={empresa.telefone || '—'} icon={<Phone size={14} />} />
          <InfoRow
            label="Endereço"
            value={
              empresa.cidade
                ? `${empresa.rua || ''}${empresa.numero ? `, ${empresa.numero}` : ''} — ${empresa.bairro || ''}, ${empresa.cidade} - ${empresa.estado}`
                : 'Não informado'
            }
            icon={<MapPin size={14} />}
          />
          <InfoRow label="Membros" value={empresa.usuarios?.[0]?.count ?? 0} />
          <InfoRow label="Agendamentos" value={empresa.agendamentos?.[0]?.count ?? 0} />
          {empresa.criado_em && (
            <InfoRow label="Cadastro" value={new Date(empresa.criado_em).toLocaleDateString('pt-BR')} />
          )}
        </dl>

        <div className="mt-8 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => { onEdit(empresa); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-background border border-border-line font-bold text-sm hover:border-brand flex items-center justify-center gap-2"
          >
            <Edit size={16} /> Editar completo
          </button>
          {empresa.status !== 'pendente' && (
            <Link
              to={`/${empresa.slug}/admin`}
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} /> Abrir painel
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border-line/60">
      <dt className="text-text-muted font-bold shrink-0">{label}</dt>
      <dd className="text-text-base font-bold text-right flex items-center justify-end gap-1.5">
        {icon}
        {value}
      </dd>
    </div>
  );
}
