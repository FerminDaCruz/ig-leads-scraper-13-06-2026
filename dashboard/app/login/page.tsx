import { login } from '@/lib/auth'
import { SiInstagram } from 'react-icons/si'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <SiInstagram size={22} className="text-brand" />
          <span className="text-white font-bold text-xl tracking-tight">IG Leads</span>
        </div>

        {/* Double-bezel outer shell */}
        <div className="p-1 rounded-2xl border border-navy-border/50 bg-white/[0.03]">
          <form
            action={login}
            className="bg-navy-card rounded-xl p-8 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <h1 className="text-cream font-bold text-xl tracking-tight mb-1">Iniciar sesión</h1>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/30 border border-red-800/60 rounded-lg px-3 py-2">
                Usuario o contraseña incorrectos
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-muted text-sm font-medium" htmlFor="username">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="bg-navy border border-navy-border rounded-lg px-3 py-2.5 text-cream placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-[border-color,box-shadow] duration-150 ease-out"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted text-sm font-medium" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="bg-navy border border-navy-border rounded-lg px-3 py-2.5 text-cream placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-[border-color,box-shadow] duration-150 ease-out"
              />
            </div>

            <button
              type="submit"
              className="mt-2 bg-brand hover:bg-cyan-300 active:scale-[0.97] text-navy font-semibold rounded-lg py-2.5 text-sm transition-[transform,background-color] duration-150 ease-out"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
