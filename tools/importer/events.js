/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */
import { buildSectionMetadata } from './utils.js';

const DOMAIN = 'https://www.cmegroup.com';
const DEFAULT_EVENT_IMAGE = 'https://www.cmegroup.com/content/dam/cmegroup/education/images/2022/q1/case-study-a-regional-bank-plans-for-a-post-libor-world-2000x1080.jpg';

const extractEventTitle = (document) => {
  const h1 = document.querySelector('h1');
  return h1?.textContent?.trim() || '';
};

const handleCMEButtons = (document) => {
  const cmeButtons = document.querySelectorAll('a.cmeButton, a.cmeButtonPrimary');
  cmeButtons.forEach((anchor) => {
    // Wrap CME buttons in strong to make them primary buttons
    const strong = document.createElement('strong');
    anchor.replaceWith(strong);
    strong.appendChild(anchor);
  });
};

const processEventPage = (document, meta) => {
  handleCMEButtons(document);

  const eventForm = document.querySelector('.cmeEventForm.cmeComponent');
  let description = '';

  if (eventForm) {
    const metadataUl = eventForm.querySelector('ul');
    if (metadataUl) {
      const listItems = metadataUl.querySelectorAll('li');
      let eventDate = '';
      let eventTime = '';

      listItems.forEach((li) => {
        const text = li.textContent.trim();
        if (text.startsWith('Date:')) {
          eventDate = text.replace('Date:', '').trim();
        } else if (text.startsWith('Time:')) {
          eventTime = text.replace('Time:', '').trim();
        } else if (text.startsWith('Location:')) {
          const locationValue = text.replace('Location:', '').trim();
          if (locationValue) {
            meta.Location = locationValue;
          }
        } else if (text.startsWith('Sponsoring Firm:')) {
          const sponsoringValue = text.replace('Sponsoring Firm:', '').trim();
          if (sponsoringValue) {
            meta.Sponsoring = sponsoringValue;
          }
        }
      });

      if (eventDate) {
        let dateTimeString = eventDate;
        if (eventTime) {
          dateTimeString = `${dateTimeString} ${eventTime}`;
        }
        const date = new Date(dateTimeString);
        meta.Date = date.toISOString();
      }

      metadataUl.remove();
    }

    const directChildren = Array.from(eventForm.children);
    directChildren.forEach((child) => {
      if (child.textContent.trim()) {
        description += child.outerHTML;
      }
    });
  }

  const title = extractEventTitle(document);
  meta.Image = DEFAULT_EVENT_IMAGE;

  document.body.innerHTML = '';

  // Hero block
  const heroImageLink = document.createElement('a');
  heroImageLink.href = DEFAULT_EVENT_IMAGE;
  heroImageLink.textContent = DEFAULT_EVENT_IMAGE;

  const heroTitle = document.createElement('h1');
  heroTitle.textContent = title;

  const heroDiv = document.createElement('div');
  heroDiv.appendChild(heroImageLink);
  heroDiv.appendChild(heroTitle);

  const heroCells = [['Hero (Event)'], [heroDiv]];
  const heroTable = WebImporter.DOMUtils.createTable(heroCells, document);
  document.body.appendChild(heroTable);

  document.body.appendChild(buildSectionMetadata([['Style', 'Full Width']]));
  document.body.appendChild(document.createElement('hr'));

  // Content section
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = description;
  document.body.appendChild(contentDiv);

  document.body.appendChild(buildSectionMetadata([['Style', 'divider']]));
  document.body.appendChild(document.createElement('hr'));

  // Browse more events
  const columnsCells = [
    ['Columns'],
    ['<h5 id="browse-more-events">Browse more events</h5>',
      '<a href="/education/calendar"><span class="icon icon-arrow-right"></span>&nbsp;View all events</a>'],
  ];
  const columnsTable = WebImporter.DOMUtils.createTable(columnsCells, document);
  document.body.appendChild(columnsTable);

  // Tags cards
  if (meta.tags) {
    const cardsCells = [['Cards (Dynamic, Upcoming Events)'], ['optional tags', meta.tags]];
    const cardsTable = WebImporter.DOMUtils.createTable(cardsCells, document);
    document.body.appendChild(cardsTable);
  }
};

const setEventMetadata = async (meta, document, url) => {
  try {
    const changedUrl = new URL(url).pathname.replace('.html', '/jcr:content.json');
    const jsonUrl = `${DOMAIN}${changedUrl}`;
    const jsonResponse = await fetch(jsonUrl);

    if (jsonResponse?.ok) {
      const jsonData = await jsonResponse.json();
      if (jsonData.tags) {
        meta.tags = jsonData.tags;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch event metadata: ${error.message}`);
  }
};

export {
  processEventPage,
  setEventMetadata,
};
