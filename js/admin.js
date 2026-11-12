const passwordInput = document.querySelector("#family-password");
const passwordToggle = document.querySelector(".password-toggle");

passwordToggle?.addEventListener("click", () => {
  const shouldShowPassword = passwordInput.type === "password";
  passwordInput.type = shouldShowPassword ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
  passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Ocultar senha" : "Mostrar senha");
});
