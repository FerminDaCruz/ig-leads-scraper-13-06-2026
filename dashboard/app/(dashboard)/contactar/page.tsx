import { redirect } from 'next/navigation'

// Contactar se integró al Pipeline: la etapa "Lead" son los calificados sin contactar.
export default function Contactar() {
  redirect('/pipeline?etapa=lead')
}
