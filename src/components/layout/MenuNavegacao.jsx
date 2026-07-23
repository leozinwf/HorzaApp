import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdminUser } from './SuperAdminRoute';
import { canAccessBarbeariaAdmin, canAccessBarbeiroPanel } from '../../constants/roles';
import { supabase } from '../../services/supabaseClient';
import { 
  Scissors, LogOut, LayoutDashboard, LogIn, 
  Calendar, Home, Clock, User, Shield, Compass, Sun, Moon 
} from 'lucide-react';

export default function MenuNavegacao({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [slugDaEmpresa, setSlugDaEmpresa] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('horza_theme') || 'light');

  const getInicial = () => {
    const nome = profile?.nome || user?.user_metadata?.nome;
    if (nome) return nome.charAt(0).toUpperCase();
    return user?.email?.charAt(0).toUpperCase() || 'Eu';
  };

  const getPrimeiroNome = () => {
    const nome = profile?.nome || user?.user_metadata?.nome || 'Usuário';
    return nome.split(' ')[0];
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('horza_theme', theme);
    window.dispatchEvent(new Event('themeChange'));
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('horza_theme') || 'light');
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('horza_theme', newTheme);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isSuperAdmin = isSuperAdminUser(user, profile);
  const podePainelBarbearia = canAccessBarbeariaAdmin(user, profile);
  const podePainelBarbeiro = canAccessBarbeiroPanel(user, profile) && profile?.role !== 'super_admin';
  const linkPerfil = '/area-cliente?tab=perfil';

  useEffect(() => {
    async function buscarSlugDaEmpresa() {
      if (profile?.barbearia_id) {
        const cacheKey = `horza_slug_${profile.barbearia_id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) setSlugDaEmpresa(cached);

        const { data } = await supabase
          .from('barbearias')
          .select('slug')
          .eq('id', profile.barbearia_id)
          .single();

        if (data?.slug) {
          setSlugDaEmpresa(data.slug);
          localStorage.setItem(cacheKey, data.slug);
        }
        return;
      }

      if (isSuperAdmin) {
        const cacheMaster = localStorage.getItem('horza_slug_master');
        if (cacheMaster) setSlugDaEmpresa(cacheMaster);

        const { data } = await supabase
          .from('barbearias')
          .select('slug')
          .not('slug', 'is', null)
          .order('criado_em', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data?.slug) {
          setSlugDaEmpresa(data.slug);
          localStorage.setItem('horza_slug_master', data.slug);
        }
      }
    }

    if (podePainelBarbearia || podePainelBarbeiro) {
      buscarSlugDaEmpresa();
    }
  }, [profile, podePainelBarbearia, podePainelBarbeiro, isSuperAdmin]);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isRotaGlobal = pathParts.length > 0 && ['master', 'area-cliente'].includes(pathParts[0]);
  const slugNaUrl = (!isRotaGlobal && pathParts.length > 0) ? pathParts[0] : null;
  const slugPainel = slugDaEmpresa || slugNaUrl;

  const linkInicio = slugNaUrl ? `/${slugNaUrl}` : '/';
  const linkAgendar = slugNaUrl ? `/${slugNaUrl}/agendar` : '/';

  return (
    <>
      {/* 🖥️ MENU DESKTOP */}
      <header className="hidden md:flex bg-menu backdrop-blur-xl border-b border-border-line px-8 py-3 items-center sticky top-0 z-50 shadow-lg transition-all">
        
        <div className="flex-1 flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2 text-brand font-black text-xl cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-brand text-white p-1.5 rounded-xl shadow-sm">
              <Scissors size={20} />
            </div>
            <span className="hidden lg:block">Horza</span>
          </Link>

          {slugNaUrl && (
            <Link 
              to="/" 
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand transition-all bg-background border border-border-line px-3.5 py-1.5 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Compass size={14} /> Explorar Central
            </Link>
          )}
        </div>

        <nav className="flex items-center justify-center gap-2">
          {slugNaUrl && (
            <Link to={linkInicio} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-bold transition-all">
              <Home size={18} /> A Barbearia
            </Link>
          )}
          
          <Link to={linkAgendar} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-bold transition-all">
            <Calendar size={18} /> Agendar
          </Link>

          {isSuperAdmin && (
            <Link to="/master" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-sm font-bold transition-all shadow-sm">
              <Shield size={18} /> Painel Master
            </Link>
          )}
          
          {user && podePainelBarbearia && slugPainel && (
            <Link to={`/${slugPainel}/admin`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all shadow-sm">
              <LayoutDashboard size={18} /> Painel Admin
            </Link>
          )}

          {user && podePainelBarbeiro && slugPainel && (
            <Link to={`/${slugPainel}/barbeiro`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all shadow-sm">
              <Clock size={18} /> Painel Barbeiro
            </Link>
          )}
        </nav>

        <div className="flex-1 flex items-center justify-end gap-3">
          
          <button 
            onClick={toggleTheme} 
            className="p-2.5 text-text-muted hover:text-brand rounded-xl hover:bg-surface border border-transparent hover:border-border-line transition-all cursor-pointer" 
            title="Alternar Tema"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {user ? (
            <div className="flex items-center gap-4 animate-fadeIn ml-2">
              <Link to={linkPerfil} className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border-line hover:border-brand transition-all group shadow-sm">
                <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-black group-hover:bg-brand group-hover:text-white transition-colors">
                  {getInicial()}
                </div>
                <span className="text-sm font-bold text-text-base">
                  {getPrimeiroNome()}
                </span>
              </Link>
              
              <button onClick={handleLogout} className="p-2.5 text-text-muted hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors cursor-pointer" title="Sair">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenLogin} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand text-white text-sm font-bold hover:bg-opacity-90 shadow-md shadow-brand/20 transition-all cursor-pointer ml-2">
              <LogIn size={18} /> Entrar
            </button>
          )}
        </div>
      </header>


      {/* 📱 MENU MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-menu backdrop-blur-xl border-t border-border-line px-2 pt-2 pb-safe flex justify-around items-center z-50 shadow-xl">
        
        <Link to="/" className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${!slugNaUrl && !isRotaGlobal ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
          <Compass size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-wider">Explorar</span>
        </Link>
        
        {slugNaUrl && (
          <Link to={linkInicio} className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${location.pathname === `/${slugNaUrl}` ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Unidade</span>
          </Link>
        )}
        
        <Link to={linkAgendar} className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${location.pathname.includes('/agendar') ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
          <Calendar size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-wider">Agendar</span>
        </Link>

        {isSuperAdmin && (
          <Link to="/master" className="flex flex-col items-center gap-1.5 text-red-500 transition-colors cursor-pointer p-2 w-16">
            <Shield size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Master</span>
          </Link>
        )}

        {user && podePainelBarbearia && slugPainel && (
          <Link to={`/${slugPainel}/admin`} className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${location.pathname.includes('/admin') ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
            <LayoutDashboard size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Painel</span>
          </Link>
        )}

        {user && podePainelBarbeiro && slugPainel && (
          <Link to={`/${slugPainel}/barbeiro`} className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${location.pathname.includes('/barbeiro') ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
            <Clock size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Barbeiro</span>
          </Link>
        )}

        {user ? (
          <Link to={linkPerfil} className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer p-2 w-16 ${location.pathname.includes('/area-cliente') ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
            <User size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Conta</span>
          </Link>
        ) : (
          <button onClick={onOpenLogin} className="flex flex-col items-center gap-1.5 text-text-muted hover:text-brand transition-colors cursor-pointer bg-transparent border-none outline-none p-2 w-16">
            <LogIn size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Entrar</span>
          </button>
        )}
      </nav>
    </>
  );
}