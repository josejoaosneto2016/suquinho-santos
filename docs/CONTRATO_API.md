# Contrato inicial entre front e backend

Proposta da primeira versão; rotas ainda não implementadas. IDs abaixo são exemplos fictícios. Base `/api`, JSON, dinheiro em centavos e horários ISO 8601. O backend é responsável por validar tudo. Regras comerciais pendentes estão no plano.

## Catálogo e próxima rodada

`GET /api/catalog` — público, sem dados de clientes.

```json
{
  "products": [{ "id": "laranja", "name": "Laranja", "price_cents": 1200, "active": true }],
  "cycle": {
    "id": "rodada-exemplo",
    "delivery_date": "2026-11-16",
    "closes_at": "2026-11-13T18:00:00-03:00",
    "accepting_orders": true
  },
  "timezone": "America/Sao_Paulo"
}
```

Apenas exemplo; API real devolve os três sabores. Sem rodada aberta, devolver `cycle: null` e desabilitar o envio com mensagem explícita. Data exibida ao cliente vem da API.

## Criar encomenda

`POST /api/orders` — público, com validação e controle de abuso no backend.

Header `Idempotency-Key`: UUID gerado no início de uma tentativa. Guardar e reutilizar a mesma chave e o mesmo corpo após timeout/reenvio; editar o pedido exige nova tentativa/chave. Reuso com corpo diferente retorna `409 IDEMPOTENCY_CONFLICT`.

```json
{
  "cycle_id": "rodada-exemplo",
  "customer": { "name": "Cliente de teste", "phone": "+5511999999999" },
  "fulfillment": { "type": "pickup" },
  "items": [{ "product_id": "laranja", "quantity": 2 }],
  "notes": "Exemplo fictício"
}
```

Entrega/retirada e campos de endereço ainda dependem da decisão da família; `pickup` é ilustração do contrato, não uma regra comercial aprovada. Nome, telefone, tamanhos máximos e quantidades devem ser validados no servidor. Não mandar total, status de pagamento nem data arbitrária: a API calcula/define esses valores.

Resposta `201` somente após transação confirmada:

```json
{
  "order": {
    "reference": "SQ-EXEMPLO",
    "status": "received",
    "total_cents": 2400,
    "delivery_date": "2026-11-16"
  },
  "message": "Pedido recebido. Aguarde a confirmação da família."
}
```

Reenvio válido devolve o mesmo resultado, sem novo pedido. Idempotência não permite consulta de outros pedidos: guardar hash do corpo e devolver apenas resultado mínimo ao mesmo identificador de tentativa. Não incluir nome, telefone/endereço em respostas de reenvio. Requisição sem chave deve ser rejeitada.

Erros: `400 VALIDATION_ERROR`, `409 CYCLE_CLOSED`, `409 PRODUCT_UNAVAILABLE`, `409 CAPACITY_EXCEEDED` se houver limite configurado, `429 RATE_LIMITED`, `503 SERVICE_UNAVAILABLE`. Formato `{ "error": { "code": "CYCLE_CLOSED", "message": "Esta rodada encerrou. Confira a próxima entrega." } }`. Respostas não expõem SQL, chaves ou dados de terceiros. Carrinho só é esvaziado após sucesso.

No instante do fechamento (`agora >= closes_at`), rejeitar a rodada; não aceitar com base no relógio do celular. Pedido e itens devem ser gravados atomicamente; duas requisições simultâneas não podem furar capacidade.

## Área administrativa

Login pelo Supabase Auth; backend recebe token de usuário e valida identidade e associação ativa à família em cada operação. Cadastro público não concede papel. Nunca embutir chave privilegiada no front.

| Rota proposta | Uso |
| --- | --- |
| `GET /api/admin/orders?cycle_id=...&cursor=...` | Pedidos paginados da rodada |
| `GET /api/admin/summary?cycle_id=...` | Indicadores e totais por sabor |
| `PATCH /api/admin/orders/:id` | Alterar estado com transição permitida e controle de versão |
| `GET /api/admin/cash?from=...&to=...&cursor=...` | Movimentos paginados por data efetiva |
| `POST /api/admin/cash` | Recebimento/despesa/aporte/retirada com chave idempotente |
| `POST /api/admin/cash/:id/reversal` | Estorno rastreável, sem apagar histórico |

`401` para sessão inválida; `403` para usuário sem permissão; `409` para conflito de versão ou transição inválida. Dinheiro inteiro positivo; tipo determina direção. Operações monetárias atômicas, sem duplicar recebimento na repetição de requisição. Auditoria guarda autor e horário. Leituras autenticadas devem usar `Cache-Control: no-store`.

Testar usuário sem associação, visitante, tentativa de alterar preço do checkout, fechamento exato, pagamento parcial, reenvio simultâneo e falha de conexão após o banco gravar antes de liberar o piloto.


## Atualização — fluxo de encomendas implementado em 11/11/2026

O registro vigente desta etapa está em [ENTREGA_ENCOMENDAS.md](ENTREGA_ENCOMENDAS.md). Rodadas, reserva, Pix, anexo privado, confirmação e entrada única no caixa foram conectados e testados no navegador com dados fictícios, removidos ao final. Os detalhes antigos sobre ausência de upload ou painel apenas de consulta ficam substituídos por esse registro. Publicação, despesas/estornos e ensaio em celulares reais continuam pendentes.
