import { readBlockConfig } from '../../scripts/aem.js';
import { i18n, getPageTags, createElement } from '../../scripts/utils.js';

const defaultUrl = '/education/browse-all';

function buildTagList(block, tagsLablel, tags, listPage) {
  if (!tags) return;
  const titleSpan = createElement('span', { class: 'tag-label' });
  titleSpan.textContent = `${tagsLablel}:`;
  block.append(titleSpan);
  tags.forEach((tag) => {
    const { name, title } = tag;
    const button = createElement('a', {
      class: 'btn-tag-filter',
      href: `${listPage || defaultUrl}?filters=${name}`,
    });
    button.textContent = title;
    block.append(button);
  });
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  const [tagsLablel, tags] = await Promise.all([
    i18n('Tags'),
    getPageTags(),
  ]);
  buildTagList(block, tagsLablel, tags, config['list-page']);
}
