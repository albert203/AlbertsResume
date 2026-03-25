// Scroll trail and observer
const dots = document.querySelectorAll('.scroll_dot');

// Click listener
dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const sectionId = dot.getAttribute('data-section');
    if (!sectionId) return;
    const section = document.querySelector(`.${sectionId}`);
    if (section){
        section.scrollIntoView({ behavior: 'smooth' });
    } 
  });
});

// dot highlighting
// intersecting observer docs:
// const intersectionCallback = (entries) => {
//   entries.forEach((entry) => {
//     if (entry.isIntersecting) {
//       let elem = entry.target;

//       if (entry.intersectionRatio >= 0.75) {
//         intersectionCounter++;
//       }
//     }
//   });
// };


const sections = document.querySelectorAll('.hero, .about, .experience, .projects');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.classList[0];
      dots.forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-section') === id) {
          dot.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.4 }); // triggers when 40% of section is visible

sections.forEach(section => observer.observe(section));



// Before/After sliders
// document.querySelectorAll('.project_card--slider').forEach(card => {
//   const input = card.querySelector('.project_slider_input');
//   const before = card.querySelector('.project_slider_before');
//   const handle = card.querySelector('.project_slider_handle');

//   input.addEventListener('input', () => {
//     const val = input.value;
//     before.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
//     handle.style.left = `${val}%`;
//   });
// });