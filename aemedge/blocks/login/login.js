export default function decorate(block) {
  const content = block.querySelector(':scope > div > div');
  const title = content.querySelector('h4');
  const paragraphs = content.querySelectorAll('p');

  if (title) {
    title.classList.add('login-header');
  }

  paragraphs.forEach((paragraph) => {
    if (!paragraph.classList.contains('button-container')) {
      paragraph.classList.add('login-body');
    }
  });
}
