const priceInCents = 1200;
const cart = new Map();
const storageKey = "suquinhos-santos-cart-v1";
const flavors = new Set([...document.querySelectorAll(".add-button")].map(button => button.dataset.flavor));
const storageStatus = document.querySelector("#cart-status");
// Armazenamos somente sabores e quantidades neste navegador.
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(saved)) for (const entry of saved) {
    if (Array.isArray(entry) && flavors.has(entry[0]) && Number.isInteger(entry[1]) && entry[1] > 0 && entry[1] <= 99) {
      cart.set(entry[0], entry[1]);
    }
  }
} catch {
  storageStatus.textContent = "Não foi possível recuperar o carrinho salvo. Você pode começar um novo.";
}
function saveCart() {
  try {
    if (cart.size) localStorage.setItem(storageKey, JSON.stringify([...cart]));
    else localStorage.removeItem(storageKey);
    storageStatus.textContent = "Carrinho atualizado neste navegador.";
  } catch {
    storageStatus.textContent = "O navegador não permitiu salvar. O carrinho funciona enquanto esta página estiver aberta.";
  }
}
const countEl = document.querySelector("#cart-count");
const listEl = document.querySelector("#cart-items");
const totalEl = document.querySelector("#cart-total");
const cartDialog = document.querySelector("#cart-dialog");
const openCartButton = document.querySelector("#open-cart");
const finalizeButton = document.querySelector("#finalize-order");
const clearCartButton = document.querySelector("#clear-cart");
const emptyCartLink = document.querySelector("#empty-cart-link");
const cartLiveStatus = document.querySelector("#cart-live-status");
const formatBRL = cents => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
let liveProducts = [];
const productIds = { 'Laranja':'laranja', 'Laranja com acerola':'laranja-acerola', 'Acerola':'acerola' };
const unitPrice = flavor => liveProducts.find(product=>product.id===productIds[flavor])?.price_cents ?? priceInCents;
const cartTotal = () => [...cart].reduce((sum,[flavor,quantity])=>sum+quantity*unitPrice(flavor),0);
window.suquinhosCart = { items:()=>[...cart].map(([flavor,quantity])=>({product_id:productIds[flavor],quantity})), total:cartTotal, clear:()=>{cart.clear();saveCart();renderCart();} };
window.addEventListener('catalogready',event=>{liveProducts=event.detail.products||[];for(const button of document.querySelectorAll('.add-button'))button.textContent='Adicionar · '+formatBRL(unitPrice(button.dataset.flavor));renderCart();});
function renderCart() {
  const count = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  countEl.textContent = count;
  openCartButton.setAttribute("aria-label", `Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`);
  finalizeButton.disabled = count === 0;
  finalizeButton.hidden = count === 0;
  clearCartButton.hidden = count === 0;
  emptyCartLink.hidden = count > 0;
  listEl.replaceChildren();
  if (!count) { const empty = document.createElement("li"); empty.className = "empty-cart"; empty.textContent = "Ainda não há itens no carrinho."; listEl.append(empty); }
  else for (const [flavor, quantity] of cart) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${flavor} · ${quantity} × ${formatBRL(unitPrice(flavor))}`;
    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    for (const [text, change, action] of [["−", -1, "Diminuir"], ["+", 1, "Aumentar"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.setAttribute("aria-label", `${action} quantidade de ${flavor}`);
      button.disabled = change === 1 && quantity >= 99;
      button.addEventListener("click", () => {
        const next = quantity + change;
        if (next === 0) cart.delete(flavor);
        else cart.set(flavor, next);
        saveCart();
        renderCart();
        const replacement = [...listEl.querySelectorAll("button")].find(control => control.getAttribute("aria-label") === button.getAttribute("aria-label"));
        (replacement && !replacement.disabled ? replacement : document.querySelector("#clear-cart")).focus();
      });
      controls.append(button);
    }
    item.append(label, controls);
    listEl.append(item);
  }
  totalEl.textContent = formatBRL(cartTotal());
  window.dispatchEvent(new Event('cartchange'));
}
document.querySelectorAll(".add-button").forEach(button => button.addEventListener("click", () => {
  const flavor = button.dataset.flavor;
  if ((cart.get(flavor) || 0) >= 99) {
    storageStatus.textContent = "O carrinho permite até 99 garrafas por sabor. Para quantidades maiores, combine com a família.";
    return;
  }
  cart.set(flavor, (cart.get(flavor) || 0) + 1); saveCart(); renderCart();
  const quantity = cart.get(flavor);
  cartLiveStatus.textContent = `${flavor} adicionado. ${quantity} ${quantity === 1 ? "unidade" : "unidades"} no carrinho.`;
}));
document.querySelector("#clear-cart").addEventListener("click", () => { cart.clear(); saveCart(); renderCart(); });
openCartButton.addEventListener("click", () => cartDialog.showModal());
document.querySelector("#close-cart").addEventListener("click", () => cartDialog.close());
emptyCartLink.addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", event => {
  if (event.target === cartDialog) cartDialog.close();
});
finalizeButton.addEventListener("click", () => {
  if (!cart.size) return;
  cartDialog.close();
  const checkout = document.querySelector("#encomendar");
  checkout.dataset.open = "true";
  checkout.hidden = false;
  checkout.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector("#checkout-title").focus({ preventScroll: true });
});
renderCart();
