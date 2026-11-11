# Pix e comprovantes — atualização de 11/11/2026

## Decisão da família

Vendas exclusivamente para parentes e amigos próximos. Pagamento somente por Pix no momento da encomenda, com envio de comprovante. Cliente continua sem conta. Mercado Pago é uma possibilidade a avaliar, não uma integração já autorizada/configurada.

## Primeira versão proposta: conferência manual

1. Backend valida itens, total e rodada; cria pedido provisório aguardando Pix e devolve uma autorização secreta limitada àquela tentativa.
2. Cliente vê total, recebedor/chave Pix reais e a data de entrega. Um botão permite copiar a chave. Ainda precisamos definir a chave e o titular.
3. Cliente paga no aplicativo do banco e volta para anexar imagem ou PDF do comprovante.
4. Com upload concluído e validado, sistema vincula o arquivo ao pedido e exibe “Comprovante enviado. Aguardando conferência”. Só então finalizar a etapa de envio do cliente.
5. No painel, familiar autorizado abre o comprovante e confere o crédito na conta. Só depois confirma o pagamento. A confirmação cria uma única entrada no caixa e registra quem conferiu.
6. Pedido confirmado/pago entra no resumo da produção; valor divergente fica destacado até resolução. Cancelamento de pedido pago exige registro de reembolso, sem apagar a entrada.

Pedido provisório sem comprovante não entra na produção e não é venda confirmada. Definir antes do piloto: prazo de expiração, tempo para concluir upload próximo de sexta às 18h e como tratar um Pix feito quando a rodada já fechou. Não aceitar pagamento e transferir silenciosamente a entrega. Permitir recuperar uma tentativa interrompida no mesmo aparelho sem duplicar pedido ou pagamento.

Comprovante pode mostrar transação agendada, valor errado ou imagem alterada. Anexar arquivo não deve marcar pedido como pago. A conferência deve usar o crédito efetivo na conta, inclusive quando comprador e pagador forem pessoas diferentes.

## Armazenamento proposto

- Supabase Storage em bucket privado, sem URL pública.
- Proposta de formatos: JPEG, PNG e PDF, até 5 MB; validar extensão, MIME e conteúdo no backend. No celular, orientar escolher captura de tela ou PDF do banco; não prometer suporte a HEIC sem implementar conversão/validação.
- Cliente sem login recebe permissão temporária para enviar apenas ao caminho aleatório vinculado ao seu pedido. Autorização secreta com escopo de upload; guardar hash e expiração no servidor. Protocolo público não autoriza envio nem leitura de comprovantes.
- Sem listagem ou leitura pública. Visualização por familiar autorizado, usando URL assinada de curta duração. Não colocar URLs temporárias em logs ou exportações.
- Upload direto ao Storage com autorização limitada, evitando transportar o arquivo pelo limite de corpo de requisição da hospedagem. Aplicar limites de tamanho, quantidade e frequência; concluir validação antes de considerar recebido.
- Tabela `payment_receipts`: pedido, caminho privado, tamanho, tipo, hash, estado de validação, criação e revisão. Não guardar o arquivo no Git, LocalStorage ou cache offline.
- Excluir uploads órfãos e definir retenção dos anexos; preservar o registro financeiro separado do arquivo. Validar visualização/recuperação no ensaio.

## Alternativa: Pix integrado ao Mercado Pago

Em vez de pedir transferência para uma chave genérica, a API cria uma cobrança Pix específica para o pedido, com QR Code/código copia e cola. A família recebe na conta habilitada e o backend acompanha o estado daquela cobrança.

Webhook assinado avisa uma mudança; backend valida a assinatura e consulta o recurso na API do Mercado Pago antes de atualizar pedido/caixa. Conferir conta recebedora, identificador externo, moeda, valor e estado aprovado. Deduplicar eventos e entrada financeira; aceitar eventos repetidos/fora de ordem, e fazer reconciliação periódica de pendências. Retorno do navegador e imagem enviada pelo cliente não confirmam recebimento.

Não assumir que integrar Checkout permite monitorar todo Pix avulso ou todo o extrato da conta. A proposta é reconciliar cobranças geradas pelo próprio sistema. Confirmar suporte/credenciais na conta concreta, taxas, campos exigidos e ambiente de testes antes de escolher.

Como a conta citada é do filho, verificar com o Mercado Pago se essa conta tem os recursos comerciais e acesso de desenvolvedor necessários. Não assumir elegibilidade por já haver conta ou por ela receber Pix. Não pedir credenciais pelo chat; configurá-las somente no ambiente seguro do backend quando for integrar.

## Situação atual

Somente planejamento atualizado. Não há upload, bucket, cobrança Pix, webhook ou tela de conferência implementados. Próxima etapa: banco/login do painel, seguidos do fluxo de pedido + anexo + confirmação manual. Integração automática pode substituir a necessidade do comprovante no fluxo normal após aprovação da família.

Fontes oficiais consultadas em 11/11/2026:
- [Buckets privados e acesso — Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Restrições de upload — Supabase](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [Pix via Checkout Transparente — Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix)
- [Notificações — Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications)


## Atualização — fluxo de encomendas implementado em 11/11/2026

O registro vigente desta etapa está em [ENTREGA_ENCOMENDAS.md](ENTREGA_ENCOMENDAS.md). Rodadas, reserva, Pix, anexo privado, confirmação e entrada única no caixa foram conectados e testados no navegador com dados fictícios, removidos ao final. Os detalhes antigos sobre ausência de upload ou painel apenas de consulta ficam substituídos por esse registro. Publicação, despesas/estornos e ensaio em celulares reais continuam pendentes.
