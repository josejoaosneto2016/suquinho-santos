# Funcionalidades e decisões

## Confirmado

- Marca: Suquinhos Santos. Identidade verde e laranja. Logo oficial fornecida pela família.
- Sabores: laranja; laranja com acerola; acerola.
- Preço: R$ 12,00 por garrafa.
- Rotina: receber encomendas ao longo da semana; compras no sábado; organização no domingo; produção e entregas na segunda.
- Produção sob encomenda, sem estoque de suco pronto.
- Painel administrativo familiar: pedidos e caixa/finanças em primeiro plano; relatórios, metas, clientes, exportações e backup.

## Protótipo atual

A página inicial apresenta o cardápio e um carrinho com ajuste de quantidades e salvamento local de sabores e quantidades, quando permitido pelo navegador. Ainda não recebe pedidos, pagamentos, endereço ou contato. A página administrativa descreve o escopo e não armazena dados.

## Decisões para conversar antes de integrar serviços

- Como o cliente envia/confirma uma encomenda e qual é o prazo semanal?
- Região, taxa e forma de entrega/retirada.
- Formas de pagamento e quando o pedido é considerado pago.
- Nome/contato comercial que deve aparecer no site.
- Quais familiares podem ver pedidos, clientes e finanças?
- Onde armazenar dados, por quanto tempo e como executar backups seguros?
- Preço fixo ou variação conforme embalagem/tamanho? O tamanho da garrafa ainda não foi informado.

## Decisões de 11/11/2026

- App instalável pelo link (PWA), focado em Android e iPhone.
- Fechamento: sexta-feira às 18h (America/Sao_Paulo). Entrega: segunda-feira.
- Cliente sem conta, com nome e telefone; pagamento registrado manualmente.
- Filho desenvolve o front principal; pai e filho desenvolvem painel e backend.
- Supabase e Vercel são a arquitetura proposta; domínio próprio é opcional.
- Ver PLANO_DO_APP.md para etapas e CONTRATO_API.md para a integração. Questões antigas sobre canal e prazo ficam substituídas por estas decisões.
