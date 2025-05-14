import { readBlockConfig } from '../../scripts/aem.js';
import { i18n, getPageTags, createElement } from '../../scripts/utils.js';
import ffetch from '../../scripts/ffetch.js';

const defaultUrl = '/education/browse-all';

/**
 * Tags Cloud Exclusions
 */
const tagsCloudExclusionsEndpoint = '/eds-config/tags-cloud-exclusions.json';
let tagsCloudExclusionsPromise = null;

function fetchTagsCloudExclusions() {
  if (!tagsCloudExclusionsPromise) {
    tagsCloudExclusionsPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const tagsCloudExclusionsJson = await ffetch(`${tagsCloudExclusionsEndpoint}`).all();
          const tagsCloudExclusions = [];
          tagsCloudExclusionsJson.forEach((row) => {
            tagsCloudExclusions.push(row.tag);
          });
          resolve(tagsCloudExclusions);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return tagsCloudExclusionsPromise;
}

async function filterIncludedTags(tags) {
  const exclusions = await fetchTagsCloudExclusions();
  return tags.filter((tag) => !exclusions.some((exclusion) => (
    exclusion.endsWith('/')
      ? tag.name.startsWith(exclusion)
      : tag.name === exclusion)));
}

/**
 * Build tags list
 */
async function buildTagList(block, tagsLablel, tags, listPage) {
  if (!tags || tags.length === 0) return;
  const filteredTags = await filterIncludedTags(tags);
  if (!filteredTags || filteredTags.length === 0) return;
  const titleSpan = createElement('span', { class: 'tag-label' });
  titleSpan.textContent = `${tagsLablel}:`;
  block.append(titleSpan);
  filteredTags.forEach(async (tag) => {
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
