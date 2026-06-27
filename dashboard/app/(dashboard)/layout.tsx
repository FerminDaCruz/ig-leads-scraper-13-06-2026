import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[1] min-h-[100dvh] lg:flex bg-background">
      <Sidebar />
      {/* Offset para barras móviles flotantes (arriba/abajo) y respiro lateral */}
      <div className="flex-1 min-w-0 pt-[4.75rem] pb-28 lg:pt-3 lg:pb-3 lg:pr-3 lg:pl-0">
        {children}
      </div>
    </div>
  )
}
