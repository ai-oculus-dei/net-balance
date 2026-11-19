import { useState, type FormEvent } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/FormActions';
import { useAuth } from '../lib/auth/useAuth';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-svh flex items-center justify-center px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <form onSubmit={handleSubmit} className="card glow w-full max-w-sm flex flex-col gap-4 !p-6">
        <div className="text-center mb-2">
          <h1 className="logo text-[26px] m-0">
            net<b>balance</b>
          </h1>
          <p className="font-mono text-[11px] text-muted uppercase tracking-[0.14em] mt-1.5">gastos · ahorro · patrimonio</p>
        </div>
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Contraseña"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError>{error}</FormError>
        <Button type="submit" disabled={loading} className="mt-1">
          {loading && <span className="spin !w-4 !h-4" aria-hidden="true" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
