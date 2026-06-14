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
        <div className="flex items-center justify-center gap-3 mb-8">
          <SiInstagram size={28} className="text-brand" />
          <span className="text-white font-bold text-2xl">IG Leads</span>
        </div>

        <form action={login} className="bg-navy-card border border-navy-border rounded-2xl p-8 flex flex-col gap-4">
          <h1 className="text-cream font-semibold text-lg mb-2">Iniciar sesión</h1>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              Usuario o contraseña incorrectos
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[#6b7280] text-sm font-medium" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="bg-navy border border-navy-border rounded-lg px-3 py-2.5 text-cream placeholder-[#6b7280] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#6b7280] text-sm font-medium" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="bg-navy border border-navy-border rounded-lg px-3 py-2.5 text-cream placeholder-[#6b7280] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-brand hover:bg-cyan-300 text-navy font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
