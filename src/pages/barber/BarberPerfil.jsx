import { useAuth } from '../../context/AuthContext';
import FormularioPerfil from '../../components/shared/FormularioPerfil';

export default function BarberPerfil() {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-text-base">Meu Perfil</h2>
        <p className="text-sm text-text-muted mt-1">Atualize seus dados pessoais e preferências.</p>
      </div>
      <FormularioPerfil user={user} profile={profile} />
    </div>
  );
}
