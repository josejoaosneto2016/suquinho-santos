# Publicação na conta do José João

Este é um projeto pessoal de aprendizado, compartilhado com amigos e familiares.

Importar `josejoaosneto2016/suquinho-santos`, branch `main`, na conta Vercel do filho (perfil JoseNeto, slug jose-neto4). Manter a conta do pai separada.

- Preset: Other; diretório raiz: ./.
- Build: npm run build; saída: dist; Node.js: 22.x. A configuração está em vercel.json.
- Configurar no servidor as variáveis de .env.example, usando os valores locais de .env.local. Não enviar .env.local ao GitHub nem publicar suas chaves no JavaScript do navegador.
- SUPABASE_SECRET_KEY e CHECKOUT_TOKEN_SECRET são segredos de servidor. Preservar CHECKOUT_TOKEN_SECRET para continuar aceitando comprovantes dos pedidos existentes.
- Não copiar APP_ORIGIN local para a Vercel. O backend usa VERCEL_PROJECT_PRODUCTION_URL em produção e VERCEL_URL nos previews. Manter as variáveis de sistema da Vercel habilitadas. Se usar domínio próprio depois, revisar APP_ORIGIN.
- O build copia apenas o front para dist. A API roda como função Node em /api e usa arquivos de server/.
- Validar página principal, /pages/painel.html, /api/health, /api/catalog e login depois do deploy. Conferir que /.env.local e /server/family-api.js retornam 404.
- A rodada permanece em rascunho até a família decidir abri-la no painel.

Publicado em 11/11/2026: https://suquinho-santos.vercel.app, conta jose-neto4, projeto prj_rhxi0G2q2sDWZlC7eadi1HXKOHua. GitHub conectado. Variáveis configuradas como segredos somente em Production; previews precisam de configuração própria para acessar o backend. O login da ferramenta fica separado em .vercel/child-auth, ignorado pelo Git e pelo deploy. Não compartilhar essa pasta.

Verificações no endereço público: home, painel, manifest, imagem e API retornam 200; health indica configured=true; catálogo possui três sabores e nenhuma rodada aberta; overview sem sessão retorna 401; .env.local, server/family-api.js e supabase/config.toml retornam 404. Login autenticado e uso em Android/iPhone ainda devem ser conferidos pela família.
