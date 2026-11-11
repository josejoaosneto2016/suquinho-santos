// A instalação depende do navegador. Pedidos continuarão precisando de internet.
const installButton = document.querySelector("#install-app");
const installStatus = document.querySelector("#install-status");
let installPrompt = null;

function updateInstallState() {
  const installed = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  installButton.hidden = installed || !installPrompt;
  if (installed) installStatus.textContent = "Você está usando o app. É necessário ter internet para enviar encomendas quando o serviço estiver disponível.";
}
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  updateInstallState();
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    installStatus.textContent = choice.outcome === "accepted"
      ? "Instalação solicitada. Siga as instruções do seu celular."
      : "Você pode continuar usando o site e instalar depois pelo menu do navegador.";
  } catch {
    installStatus.textContent = "Use o menu do navegador para adicionar o app à tela inicial.";
  }
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  installStatus.textContent = "App instalado. Abra Suquinhos pela tela inicial do seu celular.";
});
window.matchMedia("(display-mode: standalone)").addEventListener("change", updateInstallState);
updateInstallState();
