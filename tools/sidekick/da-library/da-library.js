// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
// eslint-disable-next-line import/no-unresolved
import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';

const REPLACE_CONTENT = 'CONTENT';

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(param);
  return value ? decodeURIComponent(value) : value;
}

// No pre-formatting needed; formatting is handled on click

function renderItemsInto(container, items, listName, iconType = '') {
  const ul = document.createElement('ul');
  ul.className = `da-library-type-list da-library-type-list-${listName}`;

  items.forEach((item) => {
    const name = item.key;
    if (!name) return;

    const li = document.createElement('li');
    li.className = 'da-library-type-item';

    const btn = document.createElement('button');
    btn.className = `da-library-type-item-btn ${iconType}`.trim();
    btn.addEventListener('click', () => { handleItemClick(item); });

    const detail = document.createElement('div');
    detail.className = 'da-library-type-item-detail';

    if (item.icon && !item.url) {
      const iconPlaceholder = document.createElement('span');
      iconPlaceholder.className = 'icon-placeholder';
      iconPlaceholder.textContent = String(item.icon);
      detail.appendChild(iconPlaceholder);
    }

    const label = document.createElement('span');
    label.textContent = String(name);
    detail.appendChild(label);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'icon');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', '#spectrum-AddCircle');
    svg.appendChild(use);
    detail.appendChild(svg);

    btn.appendChild(detail);
    li.appendChild(btn);
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

async function handleItemClick(item) {
  try {
    const { actions } = await DA_SDK;
    const formatParam = (getQueryParam('format') || '').trim();
    const formatUpper = formatParam.toUpperCase();

    if (formatUpper === 'HTML' && item.value) {
      await actions.sendHTML(item.value);
      return;
    }

    if (formatUpper === 'CONTENT') {
      await actions.sendText(item.key || '');
      return;
    }

    if (formatParam && formatParam.includes(REPLACE_CONTENT)) {
      await actions.sendText(formatParam.replaceAll(REPLACE_CONTENT, item.key || ''));
      return;
    }

    await actions.sendText(item.key || '');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending text:', error);
  }
}

window.handleItemClick = handleItemClick;

async function displayListValue() {
  const contentPath = getQueryParam('content');
  const resultDiv = document.getElementById('result');

  if (contentPath) {
    try {
      resultDiv.innerHTML = `
        <div class="result">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      `;
      const { context, actions } = await DA_SDK;

      // Check if contentPath is a full URL or relative path
      const isFullUrl = contentPath.startsWith('http://') || contentPath.startsWith('https://');
      const adminApiUrl = isFullUrl ? contentPath : `${DA_ORIGIN}/source/${context.org}/${context.repo}${contentPath}`;

      // Use regular fetch for full URLs, daFetch for relative paths
      const response = isFullUrl ? await fetch(adminApiUrl) : await actions.daFetch(adminApiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonData = await response.json();
      const rawItems = Array.isArray(jsonData) ? jsonData : (jsonData.items || jsonData.data || []);
      if (rawItems && rawItems.length > 0) {
        resultDiv.innerHTML = `
          <div class="result"></div>
        `;
        const resultContainer = resultDiv.querySelector('.result');
        renderItemsInto(resultContainer, rawItems, 'default');
      } else {
        resultDiv.innerHTML = `
          <div class="result">
            <pre>${JSON.stringify(jsonData, null, 2)}</pre>
          </div>
        `;
      }
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="no-value">
          <h3>Error Fetching JSON:</h3>
          <p><strong>Path: "${contentPath}"</strong></p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  } else {
    resultDiv.innerHTML = `
      <div class="no-value">
        <h3>No Content Path Found</h3>
        <p>No "content" parameter found in the URL query string.</p>
        <p>Try adding <code>?content=/docs/library/authors.json</code> to the URL.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  displayListValue();
});
