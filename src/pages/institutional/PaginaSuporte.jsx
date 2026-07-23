import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Send, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import InstitutionalLayout from '../../components/layout/InstitutionalLayout';
import { createSupportTicket, SUPPORT_CATEGORIES } from '../../services/supportService';
import { HORZA_SUPPORT_EMAIL } from '../../constants/supportEmail';

export default function PaginaSuporte() {
  const { user, profile } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    email: user?.email || '',
    assunto: '',
    categoria: 'geral',
    mensagem: '',
  });

  useEffect(() => {
    if (profile?.nome || user?.email) {
      setForm((f) => ({
        ...f,
        nome: f.nome || profile?.nome || '',
        email: f.email || user?.email || '',
      }));
    }
  }, [profile?.nome, user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await createSupportTicket(form);
      toast.success('Mensagem enviada! Responderemos em breve.');
      setForm((f) => ({ ...f, assunto: '', mensagem: '' }));
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <InstitutionalLayout
      title="Suporte Horza"
      subtitle="Envie sua dúvida ou problema. Nossa equipe responde pelo app (com conta) ou por e-mail."
    >
      <div className="bg-surface border border-border-line rounded-2xl p-5 flex items-start gap-4 not-prose">
        <div className="p-3 rounded-xl bg-brand/10 text-brand shrink-0">
          <Mail size={22} />
        </div>
        <div>
          <p className="font-bold text-text-base text-sm">E-mail de suporte</p>
          <a href={`mailto:${HORZA_SUPPORT_EMAIL}`} className="text-brand font-black hover:underline">
            {HORZA_SUPPORT_EMAIL}
          </a>
          <p className="text-xs text-text-muted mt-2">
            Horário de resposta: dias úteis, em até 48 horas.
          </p>
        </div>
      </div>

      {user ? (
        <p className="text-sm text-text-base bg-brand/5 border border-brand/20 rounded-xl p-4 not-prose">
          Você está logado. Acompanhe respostas em{' '}
          <Link to="/area-cliente" className="font-bold text-brand hover:underline">
            Minha conta → Suporte
          </Link>.
        </p>
      ) : (
        <p className="text-sm text-text-muted not-prose">
          Para acompanhar respostas dentro do app, faça login antes de enviar ou crie uma conta gratuita.
        </p>
      )}

      <form onSubmit={handleSubmit} className="not-prose space-y-4 bg-surface border border-border-line rounded-2xl p-6">
        <h2 className="font-black text-text-base flex items-center gap-2">
          <MessageCircle size={20} className="text-brand" /> Formulário de suporte
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Nome</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">E-mail</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            >
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Assunto</label>
            <input
              required
              value={form.assunto}
              onChange={(e) => setForm({ ...form, assunto: e.target.value })}
              placeholder="Resumo do problema"
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Mensagem</label>
          <textarea
            required
            rows={5}
            value={form.mensagem}
            onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
            placeholder="Descreva o que aconteceu com o máximo de detalhes..."
            className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand resize-y min-h-[120px]"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center justify-center gap-2 bg-brand text-white px-6 py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50"
        >
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Enviar mensagem
        </button>
      </form>
    </InstitutionalLayout>
  );
}
