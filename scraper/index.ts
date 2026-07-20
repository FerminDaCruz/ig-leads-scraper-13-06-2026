import "dotenv/config";
import { randomDelay } from "./util";
import { searchGoogle, SearchBlockedError } from "./search";
import { getNextSearchPairs, saveSearchResults } from "./db";

const MIN_NEW_LEADS = 50; // objetivo diario de leads nuevos
const RESULTS_PER_SEARCH = 20; // resultados por búsqueda (2 páginas de la API de Google)
const BATCH_SIZE = 5; // pares por lote (para no recargar DB en cada búsqueda)
const MAX_SEARCHES = 20; // tope de seguridad (también cuida la cuota diaria de Google)

async function main() {
  console.log("🚀 Iniciando scraper de leads de Instagram (Google Search API)");
  console.log(`   Fecha: ${new Date().toLocaleString("es-AR")}`);
  console.log(
    `   Objetivo: ${MIN_NEW_LEADS} leads nuevos · ${RESULTS_PER_SEARCH} resultados/búsqueda · máx. ${MAX_SEARCHES} búsquedas\n`,
  );

  let totalNewLeads = 0;
  let totalSearches = 0;

  while (totalNewLeads < MIN_NEW_LEADS && totalSearches < MAX_SEARCHES) {
    const pairs = await getNextSearchPairs(BATCH_SIZE);

    if (pairs.length === 0) {
      console.log("No hay más combinaciones disponibles.");
      break;
    }

    for (const { niche, location } of pairs) {
      if (totalNewLeads >= MIN_NEW_LEADS || totalSearches >= MAX_SEARCHES) break;

      const query = `"${niche}" "${location}" site:instagram.com`;
      console.log(`[${totalSearches + 1}/${MAX_SEARCHES}] ${niche} | ${location}`);

      const profiles = await searchGoogle(niche, location, RESULTS_PER_SEARCH);
      const newLeads = await saveSearchResults(profiles, niche, location, query);

      totalNewLeads += newLeads ?? 0;
      totalSearches++;

      console.log(`  Acumulados: ${totalNewLeads}/${MIN_NEW_LEADS} nuevos\n`);

      if (totalNewLeads >= MIN_NEW_LEADS || totalSearches >= MAX_SEARCHES) break;

      // Pausa corta entre búsquedas (la API no necesita el anti-bot de antes).
      await randomDelay(1000, 2500);
    }
  }

  if (totalNewLeads >= MIN_NEW_LEADS) {
    console.log(
      `\n✅ Objetivo alcanzado: ${totalNewLeads} leads nuevos en ${totalSearches} búsquedas`,
    );
  } else {
    console.log(
      `\n⚠️  Fin sin alcanzar objetivo: ${totalNewLeads}/${MIN_NEW_LEADS} leads en ${totalSearches} búsquedas`,
    );
    console.log("   Considera agregar más nichos o ubicaciones al config.");
  }
}

main().catch((err) => {
  if (err instanceof SearchBlockedError) {
    // Bloqueo/cuota de Google: el step debe fallar en ROJO, no pasar como si nada.
    console.error(`\n⛔ Búsqueda bloqueada: ${err.message}`);
  } else {
    console.error("Error fatal:", err);
  }
  process.exit(1);
});
