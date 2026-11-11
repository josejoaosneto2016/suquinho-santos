# Encomendas e comprovantes — entrega de 11/11/2026

## Implementado e verificado localmente

- Cliente escolhe sabores de 500 ml, vê o preço real do catálogo e reserva para uma rodada aberta.
- Entrega sem taxa; observação opcional para combinar o local. Pix na encomenda, com recebedor e chave informados pela família na configuração privada.
- Pedido e itens são gravados em uma transação. Preço, abertura e prazo são conferidos pelo banco; o relógio do celular não decide o fechamento.
- Mesma tentativa e mesmo corpo recuperam a mesma encomenda; corpo alterado com a mesma chave é recusado. O backend deriva o token de anexo e armazena só seu hash no pedido.
- Captura PNG/JPG ou PDF de até 5 MB, com upload direto para caminho aleatório no bucket privado. Cinco tentativas por pedido; sem substituição de arquivo já enviado. Backend confere tamanho, assinatura básica do formato e hash do conteúdo antes de registrar o recebimento. Isso não é antivírus nem validação bancária do Pix.
- Limite persistente de 15 requisições por minuto por identificador de IP, sem guardar IP bruto. Em Vercel, usa o cabeçalho fornecido pela plataforma; em desenvolvimento, usa o endereço da conexão.
- Envio de comprovante muda o pedido para conferência, sem crédito no caixa.
- Familiar autenticado prepara link privado de um minuto, confere o crédito na conta e confirma o Pix. Confirmação e entrada no caixa são atômicas e idempotentes.
- Pedido pago pode ir para produção e entregue. Pedido sem comprovante/pagamento pode ser cancelado após conferir que não houve crédito. Cancelar pedido pago exige o fluxo de reembolso, que ainda não foi implementado.
- Painel cria rodadas em rascunho; abrir/fechar são ações explícitas. Fechamento calculado na sexta anterior às 18h, em America/Sao_Paulo. Só uma rodada pode ficar aberta.

## Prazo do anexo e falhas

A reserva só é criada enquanto a rodada está aberta e antes do fechamento. O pagamento e o anexo devem ser feitos na encomenda. Para não impedir que alguém comunique um Pix já feito, um pedido existente pode receber comprovante até 24 horas depois do fechamento; anexos após o prazo normal ficam destacados como tardios. A família decide a disponibilidade antes de confirmar. Não há transferência automática de semana nem confirmação automática.

A sessão desta aba guarda temporariamente a tentativa em andamento e, depois, o token e resumo mínimo da reserva. Nome/telefone do formulário são removidos desse registro após reservar. Ao concluir, fica só o protocolo até escolher outra encomenda. Arquivo não fica em LocalStorage ou cache offline. Perder a aba pode exigir contato com a família; ainda não há consulta pública de pedidos.

Sem internet, o envio não mostra sucesso. Repetir o upload pode dar conflito por o arquivo já existir; a etapa de conclusão valida o objeto imutável antes de responder. O cliente é orientado a não fazer outro Pix ao tentar anexar novamente.

## Testes executados

- 21 testes Node, incluindo validação, preço, token de outro pedido, limite de arquivo, acesso e repetição do anexo.
- Teste transacional no Supabase: criação e itens, idempotência, preço adulterado, fechamento, necessidade de comprovante, falta de autorização e Pix confirmado duas vezes gerando uma entrada. Tudo revertido por rollback. Arquivo: supabase/tests/verify-checkout.sql.
- Ensaio real no Chrome: criar rodada de 16/11, abrir, reservar encomenda fictícia, anexar PNG fictício pelo seletor, ver conferência com caixa zero, preparar acesso privado, confirmar Pix fictício, colocar em produção e marcar entregue.
- Pedido fictício, comprovante e lançamento de teste removidos após o ensaio. A rodada vazia voltou a rascunho. Não houve transferência de dinheiro real.
- Verificação de acesso público ao comprovante de teste: negado.

## Configuração e acesso

Além das variáveis anteriores, .env.local contém SUPABASE_SECRET_KEY e CHECKOUT_TOKEN_SECRET, usadas somente pelo backend, e PIX_KEY, PIX_RECEIVER e BOTTLE_ML. Nada disso foi incluído no código público. Nunca regenerar CHECKOUT_TOKEN_SECRET enquanto houver tentativas em andamento, pois ele permite recuperar o mesmo token nos reenvios.

Funções de escrita são SECURITY INVOKER, com EXECUTE somente para service_role; cliente e familiar autenticado não as executam diretamente. Endpoints administrativos verificam a sessão e a associação ativa antes de chamar essas funções. Há auditoria de eventos. A chave privilegiada não é enviada ao navegador.

A migração 20261111212242_checkout_and_receipts.sql está aplicada. O projeto continua ssvygtexophpkjttgiff. CLI fixada no comando npx --yes supabase@3.1.0; plugin SynerTech preservado.

## Antes do piloto público

- Ensaiar em Android e iPhone reais; publicar com HTTPS em hospedagem/plano compatível com vendas.
- Definir cancelamento/reembolso, contato para suporte, retenção e limpeza de arquivos órfãos/rejeitados.
- Implementar despesas, aportes, retiradas e estornos pela interface; hoje o caixa recebe a confirmação Pix e permite consultar os movimentos.
- Revisar recuperação de conta, cadastro público e limites de Auth. O advisor registrou aviso de proteção contra senhas vazadas desativada; esse recurso é de plano Pro ou superior segundo a documentação. Nenhum plano foi contratado ou alterado.
- Exportação/backup e restauração, notificações e acompanhamento do cliente continuam pendentes.

Não foi feito deploy, commit ou envio ao GitHub. As melhorias de experiência do usuário para o filho estão no README.
