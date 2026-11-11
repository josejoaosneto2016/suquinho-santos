# Supabase conectado — 11/11/2026

## Estado confirmado

- Projeto ssvygtexophpkjttgiff, organização Suquinho Santos; pasta C:\Users\Junior\Desktop\suquinho-santos vinculada pela CLI.
- CLI 2.104.0 não recuperava a autenticação no Windows. A versão 3.1.0 recuperou o login existente e enxerga as três organizações. Usar `npx --yes supabase@3.1.0`; não houve alteração da instalação global. O plugin continua conectado à SynerTech.
- Duas migrações aplicadas e registradas: estrutura inicial e restrição de execução da função do RLS automático.
- Sete tabelas com RLS: family_members, products, delivery_cycles, orders, order_items, cash_entries e payment_receipts.
- Três sabores cadastrados a R$ 12 por garrafa.
- Bucket pix-receipts privado, limitado a JPEG/PNG/PDF de até 5 MB; sem acesso público a objetos. Upload ainda não implementado.
- Conta administrativa criada pelo responsável e autorizada em family_members. A senha foi definida diretamente no Supabase; não está no projeto.
- Primeiro login confirmado pelo usuário e observado no painel pelo navegador.

## Executar no computador

Na pasta do projeto: `npm run dev`. Abrir `http://127.0.0.1:5173/pages/painel.html`. Entrar com a conta autorizada. Não é necessário instalar dependências. Usar Node.js 22.20 ou superior. Se a porta estiver ocupada pela execução anterior, encerrar aquela instância primeiro.

.env.local contém apenas URL do projeto, chave publicável e APP_ORIGIN; o Git ignora o arquivo. Não foram copiadas chaves privilegiadas para o app. APP_ORIGIN precisa coincidir com o endereço usado no navegador.

O backend valida a sessão no Supabase e a associação ativa em cada consulta. Sessão em cookie HttpOnly, SameSite=Strict e Secure em HTTPS, de até uma hora; após expirar, entrar novamente. Não há renovação automática nesta primeira versão. Sair remove o cookie e tenta encerrar a sessão no provedor.

## Verificações executadas

- 12 testes do backend com respostas simuladas do provedor.
- Testes no banco real: visitante sem privilégios de leitura de pedidos/caixa/comprovantes; conta sem associação não vê registros; familiar ativo vê dados de teste; revogação bloqueia acesso. Dados de teste revertidos por rollback.
- RLS automático continua protegendo tabelas novas após a correção da função; tabela de teste revertida por rollback.
- API pública: catálogo HTTP 200, três sabores; pedidos, caixa e comprovantes HTTP 401 sem autenticação.
- Servidor local: health HTTP 200 e configured=true; sessão sem login HTTP 401; .env, .git, código do servidor e config Supabase HTTP 404.
- Advisor de segurança após correção: nenhum aviso ou erro.
- Primeiro login real funcionou e exibiu o painel sem rodadas cadastradas.

Os testes SQL estão em supabase/tests e foram executados com CLI 3.1.0, destino remoto explícito e confirmação de mudança, pois criam dados transitórios antes do rollback.

## Ainda falta

A área administrativa é de consulta. Falta cadastrar/editar rodadas, receber encomendas, disponibilizar Pix e upload, conferir pagamento e registrar movimentos pela interface. Nenhuma rodada de venda ou pedido real foi criado nesta etapa.

Antes de publicar: revisar cadastro público/recuperação e limites de login no Auth; preparar saída pública de build e funções na hospedagem; HTTPS, APP_ORIGIN correto, teste de saída/expiração e teste em celulares reais. O adaptador api/[...route].js existe, mas o deploy não foi configurado nem publicado.

Projeto permanece local, sem commit ou envio das alterações ao GitHub nesta etapa.


## Atualização — fluxo de encomendas implementado em 11/11/2026

O registro vigente desta etapa está em [ENTREGA_ENCOMENDAS.md](ENTREGA_ENCOMENDAS.md). Rodadas, reserva, Pix, anexo privado, confirmação e entrada única no caixa foram conectados e testados no navegador com dados fictícios, removidos ao final. Os detalhes antigos sobre ausência de upload ou painel apenas de consulta ficam substituídos por esse registro. Publicação, despesas/estornos e ensaio em celulares reais continuam pendentes.
