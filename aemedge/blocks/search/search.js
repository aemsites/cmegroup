import {
  div,
  input,
  button,
  h4,
} from '../../scripts/dom-helpers.js';
import {
  manageFilters, updateFilteringByUI, templateFiltering, toggleClearButton,
} from './filter.js';
import { manageSort } from './sort.js';
import searchConfig from './search-config.js';
import { searchResults } from './search-results.js';

const mapKey = (key) => key?.toLowerCase()?.trim().split(/\s+/).join('-');

const createResultsTitle = (sortOptions) => {
  const title = h4({});
  const sortDiv = div({ class: 'sort-options' });
  if (sortOptions) {
    sortDiv.appendChild(sortOptions);
  }

  const wrapper = div({ class: 'results-title' });
  wrapper.append(title, sortDiv);
  return wrapper;
};

const createSearchBar = (block, isEnabled) => {
  if (isEnabled !== 'true') {
    return {};
  }

  const wrapper = div({ class: 'search-bar-wrapper' });
  const inputEl = input({ type: 'text', placeholder: 'Search', class: 'search-input' });
  const searchBtn = button({ class: 'search-icon' });
  const clearBtn = button({ class: 'nav-close display-none' });

  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchConfig.searchInput = inputEl.value;
      const bullets = block.querySelector('.filter-bullets');
      updateFilteringByUI(bullets, searchResults);
    }
  });

  const dispatchEnterKey = () => {
    const enterEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    inputEl.dispatchEvent(enterEvent);
  };

  searchBtn.addEventListener('click', () => {
    dispatchEnterKey();
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    searchConfig.searchInput = '';
    clearBtn.classList.add('display-none');
    dispatchEnterKey();
  });

  wrapper.append(inputEl, clearBtn, searchBtn);
  return { searchBarWrapper: wrapper, searchInput: inputEl };
};

// const toggleClearButton = (block, value) => {
//   console.log(value);
//   const clearBtn = block.querySelector('.search-bar-wrapper .nav-close');
//   if (clearBtn) {
//     clearBtn.classList.toggle('display-none', !value);
//   }
// };

export default async function decorate(block) {
  const children = [...block.children];
  let searchBarWrapper;
  let searchInput;
  let filtersWrapper;
  let sortOptions;

  // eslint-disable-next-line no-restricted-syntax
  for (const child of children) {
    const key = mapKey(child.firstElementChild?.textContent);
    const val = child.children[1]?.textContent.trim();

    switch (key) {
      case 'search-input':
        searchConfig.searchBar = val;
        ({ searchBarWrapper, searchInput } = createSearchBar(block, val));
        break;
      case 'filters-position':
        searchConfig.filtersPosition = val;
        break;
      case 'filters-show-numbers':
        searchConfig.filtersShowNumbers = val === 'true';
        break;
      case 'filters':
        // eslint-disable-next-line no-await-in-loop
        filtersWrapper = await manageFilters(key, block, children.indexOf(child));
        break;
      case 'sort':
        sortOptions = manageSort(key, block, children.indexOf(child), null, searchConfig);
        break;
      case 'pagination':
        searchConfig.pagination = {
          show: val === 'true',
          num: Number(child.children[2]?.textContent.trim()),
        };
        break;
      case 'result-columns':
        searchConfig.resultColumns = Number(val);
        break;
      case 'template':
        templateFiltering(key, block, children.indexOf(child));
        break;
      default:
        break;
    }
  }

  const resultsTitle = createResultsTitle(sortOptions);
  const resultsWrapper = div({ class: `results-wrapper columns-${searchConfig.resultColumns}` });

  const layout = div({ class: 'search-bar-and-filters' });
  if (searchBarWrapper) {
    layout.appendChild(searchBarWrapper);
  }
  layout.append(filtersWrapper, div({ class: 'filter-bullets' }));

  block.innerHTML = '';
  block.append(layout, resultsTitle, resultsWrapper);

  if (searchInput) {
    ['input', 'change'].forEach((event) => searchInput.addEventListener(event, () => toggleClearButton(block, searchInput.value)));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        toggleClearButton(block, searchInput.value);
        searchResults();
      }
    });
  }

  searchResults();
}
