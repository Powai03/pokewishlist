// Point d'entrée AWS Lambda : la MÊME application Hono, appelée par AWS au lieu d'un serveur HTTP.
//
//   navigateur ──HTTPS──▶ URL de la fonction (Function URL) ──événement JSON──▶ handler(event)
//                                                                     └─▶ app.fetch(Request) → Response
//
// `handle()` (adaptateur officiel de Hono) convertit l'événement Lambda en `Request` standard,
// puis la `Response` de l'app en réponse Lambda. Routes, CORS, langues : rien ne change.
//
// Le code hors du handler s'exécute UNE fois par conteneur (« démarrage à froid ») ; les appels suivants
// réutilisent l'app et la connexion à la base. Une seule connexion par conteneur (max: 1) : chaque
// conteneur Lambda ne traite qu'une requête à la fois, inutile d'en ouvrir plus vers Supabase.
import { handle } from 'hono/aws-lambda'
import { loadConfig } from './config.js'
import { createRuntime } from './runtime.js'

const { app } = createRuntime(loadConfig(), { max: 1 })

export const handler = handle(app)
