// Los números se cargan a mano y vienen de mil formas: "0351 15 123-4567",
// "+54 9 351 1234567", "(351) 123 4567", "351 15 1234567". wa.me los quiere en
// formato internacional, solo dígitos: 549 + área + abonado (10 dígitos en AR).
//
// Reglas argentinas:
//   - el 0 inicial (larga distancia) y el 15 (móvil) son prefijos LOCALES: no van
//   - el 9 después del 54 marca "móvil" y sí va
//   - área + abonado = 10 dígitos siempre (11 4444 5555 / 351 123 4567)
const AR_NSN = 10

/** Número listo para wa.me (ej. "5493511234567"), o null si no se entiende. */
export function waNumero(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/\D/g, '')
  if (!d) return null

  // Prefijo de salida internacional: 00 54 ... → 54 ...
  if (d.startsWith('00')) d = d.slice(2)

  // Ya viene con país: saco el 54 y el 9 de móvil (lo reponemos al final).
  if (d.startsWith('54')) {
    d = d.slice(2)
    if (d.startsWith('9')) d = d.slice(1)
  }

  // Prefijo de larga distancia nacional.
  if (d.startsWith('0')) d = d.slice(1)

  // El 15 va después del área (2 a 4 dígitos): sacarlo deja los 10 de siempre.
  if (d.length === AR_NSN + 2) {
    for (const i of [2, 3, 4]) {
      if (d.slice(i, i + 2) === '15') {
        d = d.slice(0, i) + d.slice(i + 2)
        break
      }
    }
  }

  // Si no quedan 10 dígitos, no lo entendimos: mejor no ofrecer un link roto.
  if (d.length !== AR_NSN) return null
  return `549${d}`
}

/** Link de WhatsApp, o null si el número no se puede normalizar. */
export function waLink(raw: string | null | undefined): string | null {
  const n = waNumero(raw)
  return n ? `https://wa.me/${n}` : null
}

/** Link de llamada. Más permisivo: el teléfono del sistema tolera casi cualquier cosa. */
export function telLink(raw: string | null | undefined): string | null {
  if (!raw) return null
  const n = waNumero(raw)
  if (n) return `tel:+${n}`
  const d = raw.replace(/[^\d+]/g, '')
  return d ? `tel:${d}` : null
}
