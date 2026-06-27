import { login } from '@/lib/auth'
import { SiInstagram } from 'react-icons/si'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="dark relative min-h-[100dvh] bg-navy-dark flex items-center justify-center px-4">
      <div className="relative z-[1] w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-foreground text-background">
            <SiInstagram size={18} />
          </span>
          <span className="text-foreground font-semibold text-xl tracking-tight">IG Leads</span>
        </div>

        <div className="rounded-3xl glass-island p-1.5">
          <form
            action={login}
            className="rounded-[1.35rem] bg-card/40 p-8 flex flex-col gap-4"
          >
            <h1 className="text-cream font-bold text-xl tracking-tight mb-1">Iniciar sesión</h1>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/30 border border-red-800/60 rounded-lg px-3 py-2">
                Usuario o contraseña incorrectos
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-muted">Usuario</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-muted">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="mt-2 w-full">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
