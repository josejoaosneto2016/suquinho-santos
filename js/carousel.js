const carousel = document.querySelector("#promo-carousel");
const slides = [...carousel.querySelectorAll(".promo-slide")];
const dots = [...document.querySelectorAll(".carousel-dots button")];
const carouselStatus = document.querySelector("#carousel-status");
let activeSlide = 0;

function showSlide(index) {
  const next = (index + slides.length) % slides.length;
  const trackBox = carousel.getBoundingClientRect();
  const slideBox = slides[next].getBoundingClientRect();
  const offset = slideBox.left - trackBox.left + carousel.scrollLeft - (carousel.clientWidth - slides[next].clientWidth) / 2;
  carousel.scrollTo({ left: offset, behavior: "smooth" });
  setActiveSlide(next);
}

function setActiveSlide(index) {
  activeSlide = index;
  dots.forEach((dot, dotIndex) => {
    if (dotIndex === index) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  carouselStatus.textContent = `Destaque ${index + 1} de ${slides.length}`;
}

document.querySelector("#carousel-prev").addEventListener("click", () => showSlide(activeSlide - 1));
document.querySelector("#carousel-next").addEventListener("click", () => showSlide(activeSlide + 1));
dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
carousel.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") { event.preventDefault(); showSlide(activeSlide - 1); }
  if (event.key === "ArrowRight") { event.preventDefault(); showSlide(activeSlide + 1); }
});

const observer = new IntersectionObserver(entries => {
  const mostVisible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (mostVisible) setActiveSlide(slides.indexOf(mostVisible.target));
}, { root: carousel, threshold: [0.55, 0.7, 0.9] });
slides.forEach(slide => observer.observe(slide));
