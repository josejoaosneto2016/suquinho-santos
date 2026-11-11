# Contexto do projeto e roadmap

> Guia de retomada para familiares e assistentes de IA. Leia este arquivo, `README.md`, `CONTRIBUTING.md` e `docs/funcionalidades.md` antes de alterar o projeto. Confirme o estado real dos arquivos e do Git antes de assumir que uma tarefa está pronta.

## 1. Resumo

**Suquinhos Santos** é um projeto familiar para apresentar e receber encomendas de sucos naturais. A primeira entrega é um site estático; depois poderá ganhar um fluxo confiável de pedidos e um painel administrativo privado. O objetivo deste roadmap é conduzir o projeto até uma publicação segura, sem apresentar o protótipo atual como sistema de pedidos pronto.

- Repositório: https://github.com/josejoaosneto2016/suquinho-santos
- Visibilidade atual do repositório: público.
- Branch principal: `main`.
- Colaboração: projeto desenvolvido pelo filho e pelo pai. O usuário GitHub do pai informado é `jjsjunior3`; a confirmação do convite deve ser verificada no GitHub.
- Idioma do produto e da documentação: português do Brasil.

## 2. Requisitos confirmados pela família

- Marca: Suquinhos Santos; usar a logo oficial em `assets/images/logo.png`.
- Cores da marca: laranja e verde.
- Sabores: laranja, laranja com acerola e acerola.
- Preço informado: R$ 12,00 por garrafa.
- Receber encomendas durante a semana.
- Comprar as frutas no sábado, com base nos pedidos.
- Organizar a produção no domingo.
- Produzir e fazer as entregas na segunda-feira.
- Não manter estoque de suco pronto; produzir por encomenda.
- Futuro painel familiar: prioridade para pedidos e caixa/finanças; também incluir relatórios, metas, clientes, exportação e backup.
- Papéis previstos: adulto responsável administra acesso e finanças; filho(a) colabora no catálogo, interface e registro de pedidos. As permissões exatas ainda precisam ser combinadas.

Não alterar preço, sabores, agenda, política de entrega ou forma de pagamento sem decisão da família.

## 3. Estado atual — protótipo

A base é HTML, CSS e JavaScript sem dependências externas. A página inicial mostra o cardápio e tem um carrinho demonstrativo com ajuste de quantidades e salvamento local. O servidor local serve os arquivos, mas não compila nem atualiza automaticamente a página: após editar, atualize o navegador.

**Ainda não está pronto para receber pedidos reais.** O carrinho agora tenta recuperar sabores e quantidades ao recarregar; se o navegador bloquear o armazenamento, funciona apenas durante a sessão da página. Não há envio de encomenda, confirmação ao cliente, pagamento, banco de dados, autenticação, controle de acesso, persistência de pedidos no servidor, relatórios funcionais, exportação ou backup. `pages/admin.html` é apenas um esboço descritivo, sem proteção. Não inserir dados reais de clientes, senhas, chaves ou informações financeiras no protótipo nem no repositório.

A branch `main` já contém o commit inicial no GitHub. Como o repositório é público, tudo que for enviado ao GitHub pode ser visto por qualquer pessoa. O convite de `jjsjunior3` precisa ser confirmado na página de colaboradores do GitHub.

## 4. Estrutura e como executar

```text
index.html                  Página inicial e cardápio
pages/admin.html            Rascunho do escopo administrativo
css/style.css               Identidade visual e layout responsivo
js/app.js                   Carrinho com salvamento local e ajuste de quantidades
assets/images/logo.png      Logo oficial
scripts/dev-server.js        Servidor HTTP local simples
README.md                    Visão geral e instruções
CONTRIBUTING.md              Combinados de colaboração familiar
docs/funcionalidades.md       Requisitos confirmados e decisões pendentes
docs/planejamento.md          Etapas resumidas do projeto
docs/trello.md                Listas e cartões prontos para o Trello
docs/CONTEXTO_E_ROADMAP.md    Este guia de retomada
```

No terminal, abra a pasta que contém `package.json` e execute:

```bash
npm run dev
```

Depois abra `http://localhost:5173`. O script não exige pacotes adicionais, mas o comando acima exige Node.js com npm instalado e disponível no terminal. Alternativa com Node.js disponível:

```bash
node scripts/dev-server.js
```

Pare o servidor com `Ctrl+C`. O servidor escuta apenas em `127.0.0.1`; ele é para desenvolvimento local, não para hospedar publicamente.

## 5. Roadmap para colocar no ar

### Fase 0 — Decisões de operação

- [ ] Definir tamanho, volume e embalagem da garrafa.
- [ ] Confirmar se R$ 12,00 vale para todos os sabores e se há taxa de entrega.
- [ ] Definir bairros/região atendida e entrega ou retirada.
- [ ] Definir prazo semanal para encomendas, limite de produção e regra de cancelamento.
- [ ] Definir como o cliente envia o pedido e recebe confirmação.
- [ ] Definir formas de pagamento e quando o pedido passa a contar como pago.
- [ ] Revisar textos, fotos e descrição dos sabores com a família.
- [ ] Confirmar no GitHub que `jjsjunior3` foi convidado e aceitou.

**Pronto quando:** as regras de venda e entrega estão registradas em `docs/funcionalidades.md` e aprovadas pela família.

### Fase 1 — Site público informativo

- [ ] Revisar navegação, textos, logo e contraste em celular e computador.
- [ ] Adicionar informações comerciais aprovadas e canal de contato para encomendas.
- [ ] Tornar explícitos agenda, área atendida, preço, tamanho da garrafa e instruções para pedir.
- [ ] Conferir acessibilidade básica: textos alternativos, teclado, foco visível, títulos e rótulos.
- [ ] Conferir links e estado sem JavaScript.
- [ ] Selecionar domínio/serviço de hospedagem e responsável adulto pela conta.

**Pronto quando:** a página informa com clareza como encomendar, não promete estoque pronto e está revisada em telas pequenas.

### Fase 2 — Fluxo de pedidos reais

- [ ] Escolher armazenamento/backend seguro e ambiente de hospedagem compatível.
- [ ] Criar formulário de pedido com sabor, quantidade, contato, data e observações necessárias.
- [ ] Mostrar resumo, total, agenda de produção e condições de entrega antes do envio.
- [ ] Validar os dados e confirmar o recebimento do pedido ao cliente.
- [ ] Organizar estados do pedido: recebido, confirmado, pago (se aplicável), produção, entregue e cancelado.
- [ ] Gerar totais por sabor para orientar compras de sábado.
- [ ] Definir política de privacidade, acesso e retenção antes de guardar dados de clientes.

**Pronto quando:** pedidos podem ser recebidos, localizados e atualizados sem depender do carrinho local do navegador.

### Fase 3 — Painel administrativo familiar

- [ ] Implementar login e permissões; não deixar dados de pedidos, clientes ou finanças em páginas públicas.
- [ ] Fazer visão diária/semanal de pedidos e quantidades por sabor.
- [ ] Criar caixa com valores recebidos, pendentes, custos, despesas e saldo, evitando contar pedido não pago como receita recebida.
- [ ] Adicionar cadastro/histórico de clientes com acesso restrito.
- [ ] Implementar relatórios e metas com períodos e definições claras.
- [ ] Implementar exportação e backups automatizados; documentar como restaurar e testar recuperação.
- [ ] Revisar papéis pai/filho e limitar acesso conforme combinado.

**Pronto quando:** cada membro autorizado consegue executar suas tarefas e os dados podem ser exportados e restaurados com segurança.

### Fase 4 — Preparação e publicação

- [ ] Separar configuração de desenvolvimento e produção; guardar segredos fora do GitHub.
- [ ] Definir domínio, HTTPS, hospedagem e, se necessário, banco/backend.
- [ ] Revisar privacidade, formulários, segurança, cópias de segurança e acessibilidade.
- [ ] Conferir funcionamento em celular, computador e navegador moderno.
- [ ] Fazer um ensaio com pedidos fictícios e verificar resumo de compras, pagamento e entrega.
- [ ] Ter revisão final do pai e do filho; publicar com responsável adulto pela conta e faturamento.
- [ ] Monitorar os primeiros pedidos e corrigir problemas antes de ampliar o uso.

**Pronto quando:** fluxo publicado foi testado, responsáveis sabem operar e existe plano de suporte, backup e recuperação.

## 6. Diretrizes para a próxima IA ou pessoa

1. Leia este guia e os documentos relacionados antes de editar.
2. Confira a branch, o `git status`, o commit mais recente e os arquivos reais; este documento pode ficar desatualizado.
3. Faça uma etapa pequena por vez, explique o que mudou e atualize o roadmap quando houver progresso.
4. Preserve HTML, CSS e JavaScript sem dependências até haver motivo e aprovação para mudar a stack.
5. Nunca invente telefone, endereço, preço/tamanho, disponibilidade, regra de pagamento ou decisão familiar.
6. Não coloque dados de clientes, finanças, credenciais, tokens ou variáveis secretas em commits.
7. Trate `pages/admin.html` como rascunho. Não apresente nem publique operações administrativas reais sem autenticação e armazenamento seguros.
8. Antes de qualquer lançamento, confirme que o site descreve corretamente a operação e que a família aprovou o resultado.
9. Para colaborar no GitHub, use mudanças pequenas e Pull Requests revisados em família, conforme `CONTRIBUTING.md`.

## 7. Próxima ação recomendada

Começar pela Fase 0: conversar sobre garrafa, entregas, prazo, pagamento e contato comercial. Depois concluir a Fase 1 e publicar primeiro um site informativo. O formulário de encomenda e o painel com dados reais vêm depois de escolher e proteger o armazenamento.

## Atualização de 11/11/2026 — plano vigente

As decisões e etapas mais recentes estão em [PLANO_DO_APP.md](PLANO_DO_APP.md). Esse plano substitui a sequência antiga onde houver divergência. O cliente fará encomendas pelo app, sem conta, para entrega segunda, com fechamento sexta às 18h. Pagamento manual. Filho cuida do front público; pai e filho, do painel/backend. A base PWA está adicionada. Banco, Auth e API ainda não foram implementados. Não houve publicação ou provisionamento em nuvem.
