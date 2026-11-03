// Point d'entrée AWS Lambda : la MÊME application Hono, appelée par AWS au lieu d'un serveur HTTP.
//
//   navigateur ──HTTPS──▶ API Gateway (HTTP API, limite de débit) ──événement JSON──▶ handler(event)
//                                                                         └─▶ app.fetch(Request) → Response
//
// `handle()` (adaptateur officiel de Hono) convertit l'événement Lambda en `Request` standard,
// puis la `Response` de l'app en réponse Lambda. Il comprend les événements d'API Gateway (HTTP API,
// format 2.0 ; REST API, format 1.0) et des Function URL. Routes, CORS, langues : rien ne change.
//
// Le code hors du handler s'exécute UNE fois par conteneur (« démarrage à froid ») ; les appels suivants
// réutilisent l'app et la connexion à la base.
import { handle } from 'hono/aws-lambda'
import { loadConfig } from './config.js'
import { createRuntime } from './runtime.js'

const { app } = createRuntime(loadConfig(), {
  // Un conteneur Lambda ne traite qu'une requête à la fois : une connexion suffit.
  max: 1,
  // Entre deux appels, le conteneur est GELÉ ; le pooler de Supabase peut couper une connexion restée
  // ouverte trop longtemps. On ferme donc vite une connexion inutilisée (réouverte au besoin),
  // et on renouvelle régulièrement les plus anciennes.
  idleTimeout: 20,
  maxLifetime: 5 * 60,
})

export const handler = handle(app)
