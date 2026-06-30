// Ubicaciones conocidas (para filtros y para asignar a leads sin ubicación)
export const LOCATIONS = [
  'Argentina', 'Bariloche', 'Buenos Aires', 'CABA', 'Cafayate', 'Cordoba',
  'El Bolson', 'El Calafate', 'Las Grutas', 'Mar del Plata', 'Mendoza',
  'Miramar', 'Monte Hermoso', 'Necochea', 'Pinamar', 'Puerto Iguazu',
  'Puerto Madryn', 'Salta', 'San Bernardo', 'San Martin de los Andes',
  'San Rafael', 'Tandil', 'Tilcara', 'Ushuaia', 'Villa Carlos Paz',
  'Villa Gesell', 'Villa La Angostura',
]

// Ubicaciones ocultadas por defecto en Calificar y Contactar.
// Los leads se siguen guardando; solo se esconden de las listas salvo que
// se filtre explícitamente por esa ubicación.
export const HIDDEN_BY_DEFAULT = ['Bariloche']
