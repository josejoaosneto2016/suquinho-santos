# Análise e primeira melhoria — 11/11/2026

## Diagnóstico

O projeto tem uma base simples de HTML, CSS e JavaScript, sem dependências externas. Já apresenta marca, fotos, três sabores, preço por garrafa, rotina semanal, navegação e cálculo do carrinho. A separação de arquivos facilita aprender e evoluir em família.

O principal impedimento para vender é a ausência de um fluxo de envio e confirmação: adicionar produtos não cria uma encomenda. A área da família é uma página descritiva, sem login, banco de dados ou operações implementadas. Pagamentos, relatórios e controle financeiro ainda não existem.

O CSS contém regras repetidas que se sobrepõem. Funciona na visualização conferida, mas vale consolidar os estilos em uma etapa futura para facilitar as próximas alterações.

## O que foi melhorado nesta cópia local

- Carrinho com salvamento local de sabores e quantidades, quando permitido pelo navegador.
- Controles de aumentar e diminuir; quantidade zero remove o sabor.
- Limite técnico de 99 unidades por sabor para manter o carrinho limitado. Não representa disponibilidade ou capacidade de produção.
- Recuperação somente de sabores conhecidos e quantidades inteiras válidas.
- Aviso se o navegador não permitir salvar ou recuperar o carrinho.
- Textos explícitos de que nenhuma encomenda foi enviada.
- Rótulos dos controles, foco por teclado e respeito à preferência de reduzir animações.

O salvamento é exclusivo deste navegador e origem do site; não compartilha pedidos entre pessoas ou dispositivos. Limpar os dados do navegador também elimina o carrinho.

## Verificação executada

- JavaScript conferido com `node --check js/app.js`.
- Servidor local iniciado com Node.js.
- No Chrome: inclusão, aumento, redução, remoção ao chegar a zero e inclusão de outro sabor.
- Duas garrafas somaram R$ 24,00 e permaneceram após recarregar.
- Limpar o carrinho e recarregar manteve total zero.
- Aparência conferida em uma janela de computador. Telas de celular e falhas de armazenamento não foram testadas no navegador nesta etapa.

## Próximo passo proposto para a família

1. Definir volume da garrafa, entrega/retirada, eventual taxa e prazo semanal.
2. Escolher um canal de contato administrado por um adulto. Uma primeira opção é um botão que abra o WhatsApp com o resumo para o cliente revisar e enviar. Isso precisa do número comercial e da decisão da família; ainda não foi implementado.
3. Mostrar as condições escolhidas antes do envio. Abrir o WhatsApp não deve ser apresentado como pedido recebido ou confirmado.
4. Publicar o site após revisão conjunta.
5. Construir o painel com login e armazenamento apenas quando for necessário centralizar pedidos e finanças.

Para aprender juntos, dividir em tarefas pequenas: o filho pode revisar textos, fotos e testar sabores/quantidades; o pai pode definir atendimento, entregas e confirmação. Conferir cada mudança juntos antes de enviar ao GitHub.

## Abrir no computador

Na pasta do projeto, executar `npm run dev` e abrir `http://127.0.0.1:5173`. Não é necessário executar `npm install`.

As alterações estão somente na cópia local. Nenhum commit, envio ao GitHub ou publicação foi feito.
