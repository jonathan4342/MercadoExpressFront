/**
 * Inyecta las variables de entorno del proveedor (Vercel/Netlify) en los
 * archivos de environment ANTES del build.
 *
 * Variables leídas:
 *   API_URL → URL base de la API (ej. https://mercadoexpress-api.onrender.com/api)
 *
 * Sobrescribe TANTO environment.prod.ts COMO environment.ts, de modo que
 * funciona aunque angular.json no tenga fileReplacements configurado.
 * En local no afecta: solo se ejecuta en el build (npm run build), no en ng serve.
 */
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const apiUrl = process.env.API_URL ?? 'http://localhost:3000/api';

const file = (production) => `// ARCHIVO GENERADO por scripts/set-env.js — no editar a mano
export const environment = {
  production: ${production},
  apiUrl: '${apiUrl}'
};
`;

const dir = join(__dirname, '..', 'src', 'environments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'environment.prod.ts'), file(true));
writeFileSync(join(dir, 'environment.ts'), file(true));

console.log(`[set-env] environments generados con apiUrl = ${apiUrl}`);
if (!process.env.API_URL) {
  console.warn('[set-env] AVISO: API_URL no está definida; se usó el fallback de localhost.');
}
