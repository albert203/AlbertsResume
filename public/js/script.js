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


const sections = document.querySelectorAll('.hero, .about');

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