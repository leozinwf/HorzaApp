import { Mail, HelpCircle, AtSign, Scissors, FileText, Shield, Users } from 'lucide-react';

import { Link } from 'react-router-dom';

import { HORZA_SUPPORT_EMAIL } from '../../constants/supportEmail';



export default function HorzaFooter({ className = '' }) {

  const year = new Date().getFullYear();



  return (

    <footer className={`w-full border-t border-border-line bg-surface/50 ${className}`}>

      <div className="max-w-4xl mx-auto px-6 py-10 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">

          <div className="flex items-start gap-3 max-w-sm">

            <div className="p-2 rounded-xl bg-brand/10 text-brand shrink-0">

              <Scissors size={20} />

            </div>

            <div>

              <p className="font-black text-text-base text-lg">Horza App</p>

              <p className="text-sm text-text-muted mt-1 leading-relaxed">

                Encontre barbearias, agende online e acumule pontos de fidelidade.

              </p>

            </div>

          </div>



          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">

            <div>

              <p className="font-bold text-text-base mb-2">Institucional</p>

              <div className="space-y-2">

                <Link to="/quem-somos" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <Users size={14} /> Quem somos

                </Link>

                <Link to="/contato" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <Mail size={14} /> Contato

                </Link>

              </div>

            </div>

            <div>

              <p className="font-bold text-text-base mb-2">Ajuda</p>

              <div className="space-y-2">

                <Link to="/suporte" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <HelpCircle size={14} /> Suporte

                </Link>

                <a

                  href={`mailto:${HORZA_SUPPORT_EMAIL}`}

                  className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors break-all"

                >

                  <Mail size={14} /> {HORZA_SUPPORT_EMAIL}

                </a>

              </div>

            </div>

            <div>

              <p className="font-bold text-text-base mb-2">Legal</p>

              <div className="space-y-2">

                <Link to="/termos" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <FileText size={14} /> Termos de uso

                </Link>

                <Link to="/privacidade" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <Shield size={14} /> Privacidade

                </Link>

                <Link to="/consentimento" className="flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors">

                  <Shield size={14} /> Consentimento

                </Link>

              </div>

            </div>

          </div>

        </div>



        <div className="mt-8 pt-6 border-t border-border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-muted">

          <p>© {year} Horza. Todos os direitos reservados.</p>

          <div className="flex flex-wrap gap-4">

            <Link to="/cadastro-barbearia" className="hover:text-brand transition-colors">

              Cadastrar barbearia

            </Link>

            <Link to="/area-cliente" className="hover:text-brand transition-colors">

              Minha conta

            </Link>

            <a

              href="https://instagram.com"

              target="_blank"

              rel="noopener noreferrer"

              className="flex items-center gap-1 hover:text-brand transition-colors"

            >

              <AtSign size={12} /> @horza.app

            </a>

          </div>

        </div>

      </div>

    </footer>

  );

}

