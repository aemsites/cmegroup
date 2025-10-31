import {
  createElement,
} from '../../scripts/utils.js';

async function decorateArticleHero(main) {
  // Static section
  const heroSection = main.querySelector('.section:first-of-type');
  heroSection.classList.add('hero');
  const contentArea = createElement('span', { class: 'content-area' });
  const shadow = createElement('span', { class: 'shadow' });
  const fade = createElement('span', { class: 'fade' });
  const shadowWrapper = createElement('span', { class: 'shadow-wrapper' }, contentArea, shadow, fade);
  const picture = heroSection.querySelector('picture');
  picture.closest('div').classList.add('background-image');
  picture.closest('p').append(shadowWrapper);

  const h1 = heroSection.querySelector('h1');
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, h1);
  heroSection.append(contentWrapper);
}

export default function articleTemplate() {
  const main = document.querySelector('main');
  decorateArticleHero(main);
}
