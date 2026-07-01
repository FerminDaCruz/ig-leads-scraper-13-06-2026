import { redirect } from 'next/navigation'

// Reportes se fusionó con Métricas.
export default function StatsRedirect() {
  redirect('/metricas')
}
