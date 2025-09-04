import {
  readBlockConfig,
} from '../../scripts/utils.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.classList.add('hide');
  window.setTimeout(() => import('./course-progress-delayed.js').then((mod) => {
    mod.default(config, block);
  }), 1000);
}
