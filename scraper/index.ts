import "dotenv/config";
import { createBrowser, randomDelay } from "./browser";
import { searchDDG } from "./search";
import { getNextSearchPairs, saveSearchResults } from "./db";

const MIN_NEW_LEADS = 50; // objetivo diario de leads nuevos
const PAGES_PER_SEARCH = 3; // páginas de resultados por búsqueda
const BATCH_SIZE = 5; // pares por lote (para no recargar DB en cada búsqueda)
const MAX_SEARCHES = 20; // tope de seguridad (20 búsquedas × 3 páginas = 60 páginas máx.)

async function main() {
  console.log("🚀 Iniciando scraper de leads de Instagram");
  console.log(`   Fecha: ${new Date().toLocaleString("es-AR")}`);
  console.log(
    `   Objetivo: ${MIN_NEW_LEADS} leads nuevos · ${PAGES_PER_SEARCH} páginas/búsqueda · máx. ${MAX_SEARCHES} búsquedas\n`,
  );

  let totalNewLeads = 0;
  let totalSearches = 0;

  const { browser, context } = await createBrowser();

  try {
    while (totalNewLeads < MIN_NEW_LEADS && totalSearches < MAX_SEARCHES) {
      const pairs = await getNextSearchPairs(BATCH_SIZE);

      if (pairs.length === 0) {
        console.log("No hay más combinaciones disponibles.");
        break;
      }

      for (const { niche, location } of pairs) {
        if (totalNewLeads >= MIN_NEW_LEADS || totalSearches >= MAX_SEARCHES)
          break;

        const query = `site:instagram.com "${niche}" "${location}" -inurl:/p/ -inurl:/reel/ -inurl:/tv/`;
        console.log(
          `[${totalSearches + 1}/${MAX_SEARCHES}] ${niche} | ${location}`,
        );

        const profiles = await searchDDG(
          context,
          niche,
          location,
          PAGES_PER_SEARCH,
        );
        const newLeads = await saveSearchResults(
          profiles,
          niche,
          location,
          query,
        );

        totalNewLeads += newLeads;
        totalSearches++;

        console.log(`  Acumulados: ${totalNewLeads}/${MIN_NEW_LEADS} nuevos\n`);

        if (totalNewLeads >= MIN_NEW_LEADS || totalSearches >= MAX_SEARCHES)
          break;

        const wait = Math.floor(Math.random() * 8000) + 10000;
        console.log(
          `  Esperando ${Math.round(wait / 1000)}s antes de la próxima búsqueda...\n`,
        );
        await randomDelay(wait, wait + 2000);
      }
    }
  } finally {
    await browser.close();
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
  console.error("Error fatal:", err);
  process.exit(1);
});
