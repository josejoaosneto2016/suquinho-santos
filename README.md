# Suquinhos Santos

Projeto pessoal de aprendizado de TI do José João, desenvolvido com o apoio do pai e experimentado por amigos e familiares. O app organiza encomendas de sucos e foi pensado para usar no celular. O cliente escolhe os sabores, faz o Pix e envia o comprovante. A família confere o crédito, organiza a produção e acompanha o caixa em um painel com login.

## Como abrir no computador

Com Node.js 22.20 ou superior, abra o terminal na pasta do projeto e execute:

~~~bash
npm run dev
~~~

- Site dos clientes: http://127.0.0.1:5173/
- Painel da família: http://127.0.0.1:5173/pages/painel.html
- Testes: npm test

Use o servidor para testar; abrir index.html diretamente não conecta o backend. A configuração fica em .env.local, que não deve ir para o GitHub. Não é necessário instalar pacotes para executar o app atual.

## Regras combinadas

- Garrafas de 500 ml; laranja, laranja com acerola e acerola.
- Preço atual: R$ 12,00 por garrafa; entrega sem taxa, combinada com a família.
- Encomendas até sexta às 18h, horário de Brasília; produção e entrega na segunda.
- Pix na encomenda; comprovante privado, com conferência manual do crédito.
- Comprovante enviado não significa pagamento confirmado.
- Produção sob encomenda; sem estoque de suco pronto.
- Público inicial: parentes e amigos próximos. Compartilhar o link não impede tecnicamente que outra pessoa o abra.

## Nosso combinado de trabalho

| Quem | Responsabilidade |
| --- | --- |
| Filho | Melhorar as telas dos clientes e do painel, fotos, textos, botões e navegação no celular |
| Pai e filho, juntos | Revisar cada mudança, testar o fluxo inteiro e decidir novas funcionalidades |
| Pai, com participação do filho | Backend, banco, acesso, dados de clientes, pagamentos e publicação |

O objetivo é aprender fazendo uma melhoria pequena por vez. Antes de alterar preço, Pix, agenda, login ou regras financeiras, combinar em família.

## Missão do front: deixar fácil de entender e de usar

Experiência do usuário é o que acontece quando alguém tenta fazer uma tarefa. Uma tela bonita ajuda, mas o teste principal é: a pessoa consegue pedir ou organizar os sucos sem precisar que a gente explique?

Escolha uma tarefa abaixo, faça a mudança e teste antes de passar para a próxima. As caixas são sugestões de trabalho; ainda não foram marcadas como concluídas.

### Página principal: ajudar a pessoa a fazer uma encomenda

- [ ] **Explicar a compra logo no começo.** Mostrar que a garrafa tem 500 ml, o preço, a próxima entrega e quando os pedidos fecham. Pronto quando um familiar entende essas informações sem procurar no rodapé. Usar a data real recebida da API.
- [ ] **Deixar os sabores fáceis de comparar.** Padronizar o tamanho das fotos e mostrar nome, volume e preço perto de cada botão. Pronto quando nenhum sabor parece ter preço ou tamanho diferente por causa do layout.
- [ ] **Facilitar o carrinho.** Dar destaque às quantidades, ao total e ao próximo passo. Pronto quando alguém consegue escolher 2 laranjas e 1 acerola, ver R$ 36 e tirar um item sem limpar tudo.
- [ ] **Evitar sustos ao continuar.** Mostrar a data da entrega e o total antes do Pix; deixar o telefone e o local combinado fáceis de preencher. Pronto quando uma pessoa consegue revisar o pedido sem voltar ao cardápio para lembrar o que escolheu.
- [ ] **Explicar as etapas do Pix.** Organizar “1. Confira o total”, “2. Faça o Pix”, “3. Envie o comprovante”. Mostrar o nome real do recebedor e dar retorno ao copiar a chave. Pronto quando o cliente sabe que deve voltar ao app depois de pagar.
- [ ] **Cuidar do envio de arquivo.** Explicar os formatos e o limite de tamanho antes da escolha; mostrar que está enviando e o que fazer se falhar. Pronto quando um erro não faz a pessoa pensar que precisa pagar de novo.
- [ ] **Dar uma confirmação clara.** Exibir o protocolo e “Aguardando conferência da família” depois do comprovante. Pronto quando a tela não diz “Pago” ou “Confirmado” antes da conferência real.
- [ ] **Caprichar nos estados sem pedido.** Melhorar as mensagens de carrinho vazio, rodada fechada e conexão indisponível. Pronto quando cada mensagem diz o que a pessoa pode fazer em seguida.
- [ ] **Explicar a instalação no celular.** Deixar as instruções curtas para Android e iPhone. Pronto quando alguém adiciona à tela inicial sem precisar criar conta ou instalar pela loja.

### Área dele: ajudar a cuidar do negócio

- [ ] **Mostrar o que precisa de atenção primeiro.** Destacar comprovantes para conferir e pedidos da entrega escolhida. Pronto quando ele identifica o próximo trabalho ao abrir o painel.
- [ ] **Organizar cada pedido como um cartão legível.** Separar nome, sabores, quantidades, total e situação. Pronto quando ele entende uma encomenda em poucos segundos, sem abrir vários lugares.
- [ ] **Diferenciar as situações com palavras e cores.** Usar textos como “Aguardando Pix”, “Conferir comprovante”, “Pago”, “Em produção” e “Entregue”. Pronto quando dá para entender mesmo sem distinguir as cores.
- [ ] **Deixar ações importantes bem claras.** Aproximar “Ver comprovante” do pedido correspondente e separar “Confirmar Pix recebido” de “Marcar entregue”. Pronto quando ninguém confunde receber dinheiro com entregar suco.
- [ ] **Melhorar a lista de produção.** Mostrar a quantidade de cada sabor e a data da entrega. Pronto quando dá para usar essa lista na preparação sem somar os pedidos à mão. Usar os totais do backend, incluindo somente os estados permitidos.
- [ ] **Explicar os números do caixa.** Diferenciar valor encomendado, recebimentos, despesas e movimento líquido. Pronto quando um pedido de R$ 24 ainda sem Pix não parece dinheiro recebido. Movimento de caixa não é automaticamente lucro.
- [ ] **Facilitar a troca de semana.** Mostrar a rodada selecionada e deixar abertura, fechamento e data bem visíveis. Pronto quando ele sabe de qual segunda-feira está cuidando.
- [ ] **Deixar a tela agradável mesmo vazia.** Explicar “Nenhum comprovante para conferir” ou “Nenhum pedido nesta rodada” sem parecer erro. Pronto quando abrir o painel pela primeira vez não causa dúvida.

### Teste no celular antes de dizer “pronto”

1. Testar uma tela estreita, de 320 a 390 pixels, e um celular real. Nada deve exigir arrastar a página para os lados.
2. Tocar nos botões com o polegar. Buscar pelo menos 44 × 44 pixels de área de toque, espaço entre ações e texto de formulário de pelo menos 16 pixels.
3. Conferir letras, contraste, foco de teclado e rótulos. Não usar somente cor ou ícone para explicar uma ação.
4. Pedir a um familiar para experimentar e observar sem dar instruções a cada toque. Anotar onde ele hesitou.
5. Testar carregamento, ausência de internet, erro de formulário e arquivo errado; depois tentar de novo. Usar pedidos e arquivos fictícios no ensaio e remover os dados de teste ao terminar.
6. Verificar que a mesma mudança continua funcionando no Android e no iPhone; o teclado e a instalação podem ser diferentes.

Uma boa primeira tarefa: melhorar o começo da página para mostrar **500 ml + preço + próxima segunda de entrega**. Depois, melhorar os cartões de pedidos no painel.

## Onde mexer para melhorar as telas

| Arquivo | Para que serve |
| --- | --- |
| index.html | Estrutura da página dos clientes |
| css/style.css | Cores, espaços, fotos, botões e layout principal |
| css/checkout.css | Formulário da encomenda, Pix e comprovante |
| js/app.js | Carrinho, quantidades e total exibido |
| js/checkout.js | Etapas de encomenda, Pix e envio do comprovante |
| pages/painel.html | Estrutura do painel da família |
| css/panel.css | Aparência do painel no celular |
| js/panel.js | Exibição de rodadas, pedidos, produção e caixa |
| assets/images/ | Logo e imagens dos sabores |

Preservar IDs, atributos name e data-flavor usados pelos scripts, ou ajustar e testar as referências em conjunto. Manter a logo e as cores verde e laranja. Evitar acumular regras CSS duplicadas; revisar qual regra já controla o elemento antes de adicionar outra.

Não colocar senha ou chave de servidor nos arquivos do navegador. Não trocar um status real por um texto visual só para a tela parecer pronta. Backend e banco ficam em server/ e supabase/ e são uma tarefa em família.

## Como entregar uma melhoria

1. Escolher um item deste roteiro e escrever em uma frase o que vai ficar mais fácil.
2. Fazer uma alteração pequena, preservando o trabalho já existente.
3. Testar o caso normal e um caso de erro no celular.
4. Mostrar ao pai a tela antes e depois e explicar o motivo da mudança.
5. Revisar juntos, rodar os testes quando houver mudança de comportamento e salvar no GitHub pelo fluxo de revisão descrito em CONTRIBUTING.md.

## Estado e próximos passos

O painel tem login conectado ao Supabase. O fluxo local de rodadas, encomendas, comprovantes e confirmação manual Pix foi implementado e passou pelo ensaio no Chrome com dados fictícios. Os 23 testes locais e os testes transacionais no banco passaram. Veja [a entrega de encomendas](docs/ENTREGA_ENCOMENDAS.md) e os próximos passos em docs/PLANO_DO_APP.md.

Publicado na conta Vercel do José João (JoseNeto, plano Hobby): [abrir o app](https://suquinho-santos.vercel.app) e [entrar no painel](https://suquinho-santos.vercel.app/pages/painel.html). GitHub conectado para publicação de novos commits em main. Página, catálogo, API e bloqueio de arquivos privados verificados. A rodada permanece em rascunho; ainda falta o ensaio de uso no celular e de login no endereço publicado. Consulte docs/PUBLICAR_VERCEL.md.

- [Plano do app](docs/PLANO_DO_APP.md)
- [Banco, acesso e verificações](docs/CONFIGURAR_SUPABASE.md)
- [Pix e comprovantes](docs/PAGAMENTOS_E_COMPROVANTES.md)
- [Contrato entre front e backend](docs/CONTRATO_API.md)
- [Colaboração em família](CONTRIBUTING.md)
