import { div, h3, p } from '../../scripts/dom-helpers.js';
// import searchConfig from './search-config.js';

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

function filterAndRender(results) {
  const resultsTitle = document.querySelector('.results-title');
  const resultsWrapper = document.querySelector('.results-wrapper');

  if (resultsTitle) {
    resultsTitle.querySelector('h4').textContent = `Showing ${results.length} Results`;
  }

  resultsWrapper.innerHTML = '';
  // todo piyush handle template part here
  // how card will style here
  results.forEach((item) => {
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

const searchResults = () => {
  // todo piyush call api here with the searchConfig
  filterAndRender(mockResults);
};

export {
  searchResults,
  filterAndRender,
};
