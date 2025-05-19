// Search Block Implementation with Mock Data and Localization
// All user-facing strings use CQ.I18n.get for i18n compliance

import {
  div,
  span,
  input,
  label,
  select,
  option,
  h3,
  p,
  button,
  h4,
} from '../../scripts/dom-helpers.js';
import { filterJson, manageFilters, updateFilteringByUI } from './filter.js';
import { manageSort } from './sort.js';

// Mock dataset
const mockResults = [
  {
    type: 'lesson',
    topic: 'Introduction to Futures',
    assetClass: 'Derivatives',
    product: 'Futures',
    title: 'Definition of a Futures Contract',
    description: 'Learn more about the functions of a Futures contract, including the benefits of a standardized, exchange-traded contract.',
    date: 'Jul 11, 2024',
    lessons: 0,
  },
  {
    type: 'course',
    topic: 'Introduction to Futures',
    assetClass: 'Derivatives',
    product: 'Futures',
    title: 'Introduction to Futures',
    description: 'Learn about futures contracts, the role of a futures exchange, who participates in this market and how a futures trade works.',
    date: '',
    lessons: 18,
  },
  // Add more mock results as needed
];

const resultsTitleSection = (sortOptions) => {
  const temph4 = h4({}, 'Showing 10 results');
  const tempDiv = div({ class: 'sort-options' });

  if (sortOptions) {
    tempDiv.appendChild(sortOptions);
  }

  const wrapper = div({ class: 'results-title' });
  wrapper.appendChild(temph4);
  wrapper.appendChild(tempDiv);
  return wrapper;
};

const crossButtonHandling = (block, searchInputValue) => {
  const crossButton = block.querySelector('.search-bar-wrapper .nav-close');
  if (crossButton) {
    if (searchInputValue) {
      crossButton.classList.remove('display-none');
    } else {
      crossButton.classList.add('display-none');
    }
    // crossButton.addEventListener('click', () => {
    //   console.log('cross button clicked');
    // });
  }
};

function filterAndRender(block, searchInput, resultsTitle, resultsWrapper) {
  crossButtonHandling(block, searchInput.value);

  let filtered = mockResults.filter((item) => {
    const matchesSearch = searchInput.value === '' || item.title.toLowerCase().includes(searchInput.value.toLowerCase());
    // const matchesTopic = topicsDropdown.value === '' || item.topic === topicsDropdown.value;
    // const matchesAsset = assetClassDropdown.value === '' || item.assetClass === assetClassDropdown.value;
    // const matchesProduct = productsDropdown.value === '' || item.product === productsDropdown.value;
    // const matchesType = (courseCheckbox.checked && item.type === 'course') || (lessonCheckbox.checked && item.type === 'lesson');
    return matchesSearch; // && matchesTopic && matchesAsset && matchesProduct && matchesType;
  });

  // const resultFilter = block.querySelector('result-filter');

  if (resultsTitle) {
    resultsTitle.querySelector('h4').textContent = `Showing ${filtered.length} Results`;
  }
  // Sorting
  // if (sortDropdown.value === 'Newest') {
  //   filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  // } else if (sortDropdown.value === 'Oldest') {
  //   filtered = filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  // }
  // Results count
  // resultsCount.textContent = `Showing ${filtered.length} Results`;
  // Render results
  resultsWrapper.innerHTML = '';
  console.log(13131313);
  filtered.forEach((item) => {
    const card = div({ class: 'result-card' });
    const meta = div({ class: 'result-meta' }, item.type === 'lesson' ? `Lesson: ${item.topic}` : 'Course');
    const titleEl = h3({ class: 'result-title' }, item.title);
    const descEl = p({ class: 'result-desc' }, item.description);
    card.appendChild(meta);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    if (item.type === 'lesson') {
      const dateEl = div({ class: 'result-date' }, item.date);
      card.appendChild(dateEl);
    } else if (item.type === 'course') {
      const lessonsEl = div({ class: 'result-lessons' }, `${item.lessons} Lessons`);
      card.appendChild(lessonsEl);
    }
    resultsWrapper.appendChild(card);
  });
}

const mapKey = (key) => key?.toLowerCase()?.trim().split(' ')
  .filter((x) => x)
  .join('-');

const searchBar = (block, child) => {
  const value = child?.children[1]?.textContent.trim();
  let searchBarJson = {};

  if (value === 'true') {
    const searchBarWrapper = div({ class: 'search-bar-wrapper' });
    const searchInput = input({ type: 'text', placeholder: 'Search', class: 'search-input' });
    const searchIcon = button({ class: 'search-icon' });
    const crossButton = button({ class: 'nav-close display-none' });

     // Add enter key handler
     searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        filterJson.searchInput = searchInput.value;
        const filterBullets = block.querySelector('.filter-bullets');
        updateFilteringByUI(filterBullets, () => filterAndRender(block, searchInput, block.querySelector('.results-title'), block.querySelector('.results-wrapper')));
      }
    });

    crossButton.addEventListener('click', () => {
      searchInput.value = '';
      filterJson.searchInput = ''; // Clear the search input in filterJson
      crossButton.classList.add('display-none');
      // execute enter event here, enter event should be

      // searchInput.dispatchEvent(new Event('keypress', { bubbles: true, cancelable: true }));
      const enterEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      searchInput.dispatchEvent(enterEvent);
      filterAndRender(block, searchInput, block.querySelector('.results-title'), block.querySelector('.results-wrapper'));
    });

    searchBarWrapper.appendChild(searchInput);
    searchBarWrapper.appendChild(crossButton);
    searchBarWrapper.appendChild(searchIcon);

    searchBarJson = { searchBarWrapper, searchInput };
  }

  return searchBarJson;
};

export default async function decorate(block) {
  let currentKey = '';
  let searchBarWrapper;
  let searchInput;
  let filtersWrapper;
  let sortOptions;

  const children = [...block.children];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const firstChild = child.firstElementChild;
    const textContent = firstChild?.textContent.trim();
    const key = mapKey(textContent);

    if (key === 'search-input') {
      currentKey = 'search-input';
      const tempJson = searchBar(block, child);
      searchBarWrapper = tempJson.searchBarWrapper;
      searchInput = tempJson.searchInput;
    } else if (key === 'filters-position') {
      const secondElement = child.children[1];
      filterJson.position = secondElement?.textContent.trim();
    } else if (key === 'filters-show-numbers') {
      const secondElement = child.children[1];
      filterJson.numbers = secondElement?.textContent.trim() === 'true';
    } else if (key === 'filters') {
      filtersWrapper = await manageFilters(key, block, index);
    } else if (key === 'sort') {
      sortOptions = manageSort(key, block, index);
      // manage sorting
    } else if (key === 'pagination') {
      // manage pagination
    }
  }

  console.log(sortOptions);

  // Sorting
  const resultsTitle = resultsTitleSection(sortOptions);
  // const sortLabel = span({}, 'Sort by');
  // const sortDropdown = createDropdown(['Most Popular', 'Newest', 'Oldest'], 'Most Popular', 'sort-filter');
  // sortWrapper.appendChild(sortLabel);
  // sortWrapper.appendChild(sortDropdown);

  // Results
  const resultsWrapper = div({ class: 'results-wrapper' });

  // Results count
  // const resultsCount = div({ class: 'results-count' });

  // Assemble block
  const searchBarAndFilters = div({ class: 'search-bar-and-filters' });
  if (searchBarWrapper) {
    searchBarAndFilters.appendChild(searchBarWrapper);
  }

  searchBarAndFilters.appendChild(filtersWrapper);
  searchBarAndFilters.appendChild(div({ class: 'filter-bullets' }));
  block.innerHTML = '';
  block.appendChild(searchBarAndFilters);
  // block.appendChild());
  block.appendChild(resultsTitle);
  // block.appendChild(resultsCount);
  block.appendChild(resultsWrapper);

  // Filtering and rendering logic
  // function filterAndRender() {
  //   crossButtonHandling(block, searchInput.value);

  //   let filtered = mockResults.filter((item) => {
  //     const matchesSearch = searchInput.value === '' || item.title.toLowerCase().includes(searchInput.value.toLowerCase());
  //     // const matchesTopic = topicsDropdown.value === '' || item.topic === topicsDropdown.value;
  //     // const matchesAsset = assetClassDropdown.value === '' || item.assetClass === assetClassDropdown.value;
  //     // const matchesProduct = productsDropdown.value === '' || item.product === productsDropdown.value;
  //     // const matchesType = (courseCheckbox.checked && item.type === 'course') || (lessonCheckbox.checked && item.type === 'lesson');
  //     return matchesSearch; // && matchesTopic && matchesAsset && matchesProduct && matchesType;
  //   });

  //   // const resultFilter = block.querySelector('result-filter');

  //   if (resultsTitle) {
  //     resultsTitle.querySelector('h4').textContent = `Showing ${filtered.length} Results`;
  //   }
  //   // Sorting
  //   // if (sortDropdown.value === 'Newest') {
  //   //   filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  //   // } else if (sortDropdown.value === 'Oldest') {
  //   //   filtered = filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  //   // }
  //   // Results count
  //   // resultsCount.textContent = `Showing ${filtered.length} Results`;
  //   // Render results
  //   resultsWrapper.innerHTML = '';
  //   console.log(13131313);
  //   filtered.forEach((item) => {
  //     const card = div({ class: 'result-card' });
  //     const meta = div({ class: 'result-meta' }, item.type === 'lesson' ? `Lesson: ${item.topic}` : 'Course');
  //     const titleEl = h3({ class: 'result-title' }, item.title);
  //     const descEl = p({ class: 'result-desc' }, item.description);
  //     card.appendChild(meta);
  //     card.appendChild(titleEl);
  //     card.appendChild(descEl);
  //     if (item.type === 'lesson') {
  //       const dateEl = div({ class: 'result-date' }, item.date);
  //       card.appendChild(dateEl);
  //     } else if (item.type === 'course') {
  //       const lessonsEl = div({ class: 'result-lessons' }, `${item.lessons} Lessons`);
  //       card.appendChild(lessonsEl);
  //     }
  //     resultsWrapper.appendChild(card);
  //   });
  // }

  // Add Reset Button (after filterAndRender is defined)
  // const resetBtn = input({ type: 'button', class: 'reset-btn', value: 'Reset' });
  // resetBtn.style.margin = '0 0 1.2rem 0';
  // resetBtn.addEventListener('click', () => {
  //   searchInput.value = '';
  //   topicsDropdown.value = '';
  //   assetClassDropdown.value = '';
  //   productsDropdown.value = '';
  //   courseCheckbox.checked = true;
  //   lessonCheckbox.checked = true;
  //   sortDropdown.value = 'Most Popular';
  //   filterAndRender();
  // });

  // // Assemble block
  // const searchBarAndFilters = div({ class: 'search-bar-and-filters' });
  // if (searchBarWrapper) {
  //   searchBarAndFilters.appendChild(searchBarWrapper);
  // }
  // searchBarAndFilters.appendChild(filtersWrapper);
  // block.appendChild(searchBarAndFilters);
  // block.appendChild(resetBtn);
  // block.appendChild(sortWrapper);
  // block.appendChild(resultsCount);
  // block.appendChild(resultsWrapper);

  // Event listeners
  const eventElements = [
    searchInput,
  ];

  eventElements.forEach((el) => {
    // el.addEventListener('input', () => filterAndRender(block, searchInput, resultsTitle, resultsWrapper));
    // el.addEventListener('change', () => filterAndRender(block, searchInput, resultsTitle, resultsWrapper));
    el.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        filterAndRender(block, searchInput, resultsTitle, resultsWrapper);
      }
    });
  });

  // Initial render
  filterAndRender(block, searchInput, resultsTitle, resultsWrapper);
}
