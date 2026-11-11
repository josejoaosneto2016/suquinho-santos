const priceInCents = 1200;
const cart = new Map();
const countEl = document.querySelector("#cart-count");
const listEl = document.querySelector("#cart-items");
const totalEl = document.querySelector("#cart-total");
const formatBRL = cents => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
function renderCart() {
  const count = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  countEl.textContent = count;
  listEl.replaceChildren();
  if (!count) { const empty = document.createElement("li"); empty.className = "empty-cart"; empty.textContent = "Ainda não há itens no carrinho."; listEl.append(empty); }
  else for (const [flavor, quantity] of cart) { const item = document.createElement("li"); item.textContent = `${flavor} · ${quantity} × ${formatBRL(priceInCents)}`; listEl.append(item); }
  totalEl.textContent = formatBRL(count * priceInCents);
}
document.querySelectorAll(".add-button").forEach(button => button.addEventListener("click", () => {
  const flavor = button.dataset.flavor; cart.set(flavor, (cart.get(flavor) || 0) + 1); renderCart();
  document.querySelector("#pedido").scrollIntoView({ behavior: "smooth", block: "nearest" });
}));
document.querySelector("#clear-cart").addEventListener("click", () => { cart.clear(); renderCart(); });
renderCart();
