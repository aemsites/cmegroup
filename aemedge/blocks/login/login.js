export default function decorate(block) {
  const content = block.querySelector(':scope > div > div');
  const paragraphs = content.querySelectorAll('p');

  if (paragraphs[0]) {
    paragraphs[0].classList.add('login-header');
  }

  if (paragraphs[1]) {
    paragraphs[1].classList.add('login-body');
  }

  if (paragraphs[0] && paragraphs[1]) {
    const divider = document.createElement('hr');
    divider.className = 'login-divider';
    paragraphs[0].after(divider);
  }
} 