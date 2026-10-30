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


const form = document.getElementById('contact_form');

if (form) {
  const successBox = document.getElementById('form_success');
  const errorBox = document.getElementById('form_error');

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        successBox.style.display = 'block';
        form.reset();
        submitBtn.textContent = 'Sent!';
        return;
      }

      const body = await res.json().catch(() => ({}));
      showError(body.error || 'Something went wrong. Please try again.');
    } catch (err) {
      showError('Could not reach the server. Check your connection and try again.');
    }

    submitBtn.textContent = 'Send message';
    submitBtn.disabled = false;
    if (window.turnstile) window.turnstile.reset();
  });
}
