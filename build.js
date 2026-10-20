// Netlify build step: writes js/config.js from the SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
const fs = require('fs');
const env = { SUPABASE_URL: process.env.SUPABASE_URL || '', SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '' };
fs.writeFileSync('js/config.js', `window.ENV=${JSON.stringify(env)};\n`);
console.log('config.js written', env.SUPABASE_URL ? '(Supabase configured)' : '(WARNING: SUPABASE_URL missing)');