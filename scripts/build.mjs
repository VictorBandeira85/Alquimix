// Gera www/native.js a partir de src/native.js.
// As chaves vêm de variáveis de ambiente (no Codemagic: grupo "alquimix").
// Sem variáveis, usa os IDs de TESTE do Google e o RevenueCat fica desligado (compras simuladas).
import { build } from 'esbuild';

const env = (name, fallback = '') => JSON.stringify(process.env[name] || fallback);

await build({
  entryPoints: ['src/native.js'],
  bundle: true,
  format: 'iife',
  target: 'safari15',
  minify: true,
  outfile: 'www/native.js',
  define: {
    __REVENUECAT_IOS_KEY__: env('REVENUECAT_IOS_KEY'),
    __ADMOB_REWARDED_ID__: env('ADMOB_REWARDED_ID', 'ca-app-pub-3940256099942544/1712485313'),
    __ADMOB_INTERSTITIAL_ID__: env('ADMOB_INTERSTITIAL_ID', 'ca-app-pub-3940256099942544/4411468910'),
  },
});
console.log('www/native.js gerado' + (process.env.REVENUECAT_IOS_KEY ? ' (com chave RevenueCat)' : ' (sem chave RevenueCat: compras simuladas)'));
