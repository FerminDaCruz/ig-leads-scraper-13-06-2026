import { redirect } from 'next/navigation'

// Calificar se integró al Pipeline (tab "Sin calificar").
export default function Home() {
  redirect('/pipeline')
}
