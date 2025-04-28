import { readBlockConfig } from '../../scripts/aem.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { getEconomicReleaseFilters } from '../../scripts/services/ProductCalendarService.js';
import { URIUtil } from '../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);
const { body } = window.document;
let isDesktop = window.innerWidth > 1200;
const inputsCurtain = createElement('div', { class: 'inputs-curtain' });
const eventCalendarContainer = createElement('div', { class: 'event-calendar' });
const filterSectionContainer = createElement('div', { class: 'filter-section-container' });
const filtersSectionEventCalendar = createElement('div', { class: 'filters-section-event-calendar' });
const filtersInputsMainContainer = createElement('div', { class: 'filters-block' });
const filtersCurrentContainer = createElement('div', { class: 'current-filters' });
const filtersDateContainer = createElement('div', { class: 'date-filter-container' });
const filtersTitle = createElement('h3', { class: 'filters-title' });
const filterSearchInputContainer = createElement('div', { class: 'input-search-container' });
const filterSearchInput = createElement('input', { class: 'input-search' });
const filtersInputsContainer = createElement('div', { class: 'filters-inputs-container' });
const cleanInput = createElement('button', {
  class: 'icon-close clean-search-input',
  'aria-label': 'clean search input',
  'aria-expanded': false,
});
const pillsHeader = createElement('div', { class: 'current-pills-header' });
const pillsWrapper = createElement('div', { class: 'current-pills-wrapper' });
const pillsInnerContainer = createElement('div', { class: 'current-pills-inner-container' });
let economicFilters;
let filtersLabel;
const currentPillsLabel = 'Currently filtering by:';
let searchValueVar = '';
let timeoutId;
const filterPillsArray = {};
const params = {
  countryParam: 'countries',
  attributeParam: 'attributes',
};

function updateURLFilters(_filters) {
  if (!_filters) {
    return;
  }

  const updateURLFilterParam = (filterParam, key) => {
    if (
      !_filters[key]
      || (Array.isArray(_filters[key]) && !_filters[key].length)
    ) {
      uriUtil.removeHash(filterParam);
    } else {
      const filtersIds = _filters[key].map((item) => item.id);
      uriUtil.addHash(filterParam, filtersIds);
    }
  };

  updateURLFilterParam(params.countryParam, 'input-country');
  updateURLFilterParam(params.attributeParam, 'input-impact');
  uriUtil.navigate(true);
}

async function initializeLabels() {
  const [filtersLabelVar] = await Promise.all([
    i18n('Filters'),
  ]);

  filtersLabel = filtersLabelVar;
}

function addOutsideClickListener(detailsElement) {
  document.addEventListener('click', (event) => {
    if (detailsElement.open && !detailsElement.contains(event.target)) {
      detailsElement.removeAttribute('open');
    }
  });
}

function closeFiltersInputsContainer() {
  inputsCurtain.classList.remove('is-open');
  filtersInputsContainer.classList.remove('is-open');
  body.classList.remove('curtain-visible');
}

function openFiltersInputsContainer() {
  inputsCurtain.classList.add('is-open');
  filtersInputsContainer.classList.add('is-open');
  body.classList.add('curtain-visible');
}

function cleanInputSearch() {
  searchValueVar = '';
  filterSearchInput.value = '';
  if (filterSearchInputContainer.contains(cleanInput)) {
    cleanInput.remove();
  }
  // call service with variables here
  // eslint-disable-next-line no-console
  console.log(`searchValueVar= ${searchValueVar}`);
}

function decorateCleanInputSearch() {
  cleanInput.addEventListener('click', async () => {
    cleanInputSearch();
  });
  return cleanInput;
}

function handleInputSearch(e) {
  searchValueVar = e.target.value;
  filterSearchInputContainer.append(decorateCleanInputSearch());
  if (searchValueVar !== '' && window.innerWidth >= 1200) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log(`searchValueVar= ${searchValueVar}`);
      // call service with variables here
    }, 400);
  }
}

function removePillHandler(pill) {
  if (pill !== 'clear-all') {
    // remove pill
    const pillToRemove = pillsInnerContainer.querySelector(`button.btn-pill[data-filter="${pill}"]`);
    pillToRemove.remove();
    // remove pill from arrays
    // eslint-disable-next-line no-restricted-syntax
    for (const listId in filterPillsArray) {
      // eslint-disable-next-line max-len
      if (Object.prototype.hasOwnProperty.call(filterPillsArray, listId) && Array.isArray(filterPillsArray[listId])) {
        filterPillsArray[listId] = filterPillsArray[listId].filter((item) => item.id !== pill);
      }
    }
    // if filterPillsArray is empty clear all
    if (Object.values(filterPillsArray).every((value) => !Array.isArray(value)
      || value.length === 0)) {
      filtersCurrentContainer.innerHTML = '';
    }
    // uncheck dropdown
    filtersInputsContainer.querySelector(`#${pill}`).checked = false;
  } else {
    // remove all pills and container
    filtersCurrentContainer.innerHTML = '';
    // uncheck dropdown
    const checkboxInDropdown = filtersInputsContainer.querySelectorAll('.checkbox-dropdown input[type=checkbox]');
    checkboxInDropdown.forEach((checkbox) => {
      if (checkbox && checkbox.checked) {
        checkbox.checked = false;
      }
    });

    // clean array
    // eslint-disable-next-line no-restricted-syntax
    for (const listId in filterPillsArray) {
      if (Object.prototype.hasOwnProperty.call(filterPillsArray, listId)
        && Array.isArray(filterPillsArray[listId])) {
        filterPillsArray[listId] = [];
      }
    }
  }
  updateURLFilters(filterPillsArray);
}

function decoratePills(container) {
  const pills = container.querySelectorAll('.btn-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      removePillHandler(pill.dataset.filter);
    });
  });
}

function renderCurrentPills(pillsArray) {
  filtersCurrentContainer.innerHTML = '';
  pillsHeader.innerHTML = currentPillsLabel;
  filtersCurrentContainer.append(pillsHeader);
  const clearAllPill = createElement('button', { class: 'btn-pill clear-all' });
  clearAllPill.setAttribute('type', 'button');
  clearAllPill.dataset.filter = 'clear-all';
  clearAllPill.innerHTML = 'Clear All';
  let htmlPills = '';
  let hasPills = false;

  // eslint-disable-next-line no-restricted-syntax
  for (const key in pillsArray) {
    if (Object.prototype.hasOwnProperty.call(pillsArray, key)) {
      const array = pillsArray[key];
      if (Array.isArray(array) && array.length > 0) {
        hasPills = true;
        // eslint-disable-next-line no-loop-func
        array.forEach((elem) => {
          htmlPills += `
            <button type="button" class="btn-pill" data-filter="${elem.id}">
              ${elem.name}
            </button>
          `;
        });
      }
    }
  }

  filtersCurrentContainer.append(pillsHeader);

  if (hasPills) {
    pillsInnerContainer.innerHTML = htmlPills;
    pillsInnerContainer.append(clearAllPill);
    pillsWrapper.append(pillsInnerContainer);
    filtersCurrentContainer.append(pillsWrapper);
  } else {
    filtersCurrentContainer.innerHTML = '';
  }

  decoratePills(pillsInnerContainer);
  updateURLFilters(pillsArray);

  return filtersCurrentContainer;
}

function filterPillsArrayHandler(listId, checkbox) {
  if (!filterPillsArray[listId]) {
    filterPillsArray[listId] = [];
  }

  const checkboxData = {
    id: checkbox.id,
    name: checkbox.name,
  };

  if (checkbox.checked) {
    const existingIndex = filterPillsArray[listId].findIndex((item) => item.id === checkbox.id);
    if (existingIndex === -1) {
      filterPillsArray[listId].push(checkboxData);
    }
  } else {
    filterPillsArray[listId] = filterPillsArray[listId].filter((item) => item.id !== checkbox.id);
  }

  if (isDesktop) {
    renderCurrentPills(filterPillsArray);
  }
}

function setupCountryCheckboxListeners(input) {
  const checkboxes = input.querySelectorAll('.country-checkbox');
  checkboxes.forEach((checkbox) => {
    // eslint-disable-next-line func-names
    checkbox.addEventListener('change', () => {
      filterPillsArrayHandler('input-country', checkbox);
    });
  });
}

function decorateFilterCountryInput() {
  const filterCountryInput = createElement('details', { class: 'checkbox-dropdown input-country', id: 'input-country' });
  if (economicFilters && economicFilters.countries) {
    const countriesArray = economicFilters.countries;
    filterCountryInput.innerHTML = `
      <summary>Country</summary>
      <form>
        <fieldset>
          <ul>
          ${countriesArray.map(({ name: countryName, id }) => {
    const li = `
                <li>
                  <label for="${id}" tabindex="0" role="menuitem">
                    <div class="checkbox-wrapper">
                      <input id="${id}" type="checkbox" class='country-checkbox' name="${countryName}">
                      <span></span>
                    </div>
                    <div class="flag-icon ${id}"></div>
                    ${countryName}
                  </label>
                </li>
              `;
    return li;
  }).join('')}
          </ul>
        </fieldset>
      </form>
    `;
    setupCountryCheckboxListeners(filterCountryInput);
    addOutsideClickListener(filterCountryInput);
  }
  return filterCountryInput;
}

function setupImpactCheckboxListeners(input) {
  const checkboxes = input.querySelectorAll('.impact-checkbox');
  checkboxes.forEach((checkbox) => {
    // eslint-disable-next-line func-names
    checkbox.addEventListener('change', () => {
      filterPillsArrayHandler('input-impact', checkbox);
    });
  });
}

function decorateFilterImpactInput() {
  const filterImpactInput = createElement('details', { class: 'checkbox-dropdown input-impact', id: 'input-impact' });
  if (economicFilters && economicFilters.impact) {
    const impactArray = economicFilters.impact;
    filterImpactInput.innerHTML = `
      <summary>Impact</summary>
      <form>
        <fieldset>
          <ul>
          ${impactArray.map(({ name: impactName, id }) => {
    const li = `
                <li>
                  <label for="${id}" tabindex="0" role="menuitem">
                    <div class="checkbox-wrapper">
                      <input id="${id}" type="checkbox" class='impact-checkbox' name="${impactName}">
                      <span></span>
                    </div>
                    ${impactName}
                  </label>
                </li>
              `;
    return li;
  }).join('')}
          </ul>
        </fieldset>
      </form>
    `;
    setupImpactCheckboxListeners(filterImpactInput);
    addOutsideClickListener(filterImpactInput);
  }
  return filterImpactInput;
}

function resetFilters() {
  // reset and close modal
  removePillHandler('clear-all');
  closeFiltersInputsContainer();
}

function applyFilters() {
  // apply and close modal
  // eslint-disable-next-line no-console
  console.log(`searchValueVar= ${searchValueVar}`);
  renderCurrentPills(filterPillsArray);
  closeFiltersInputsContainer();
  // call service with variables here
}

function renderInputs() {
  const filtersInputsContainerCloseBtn = createElement('button', {
    class: 'icon-close filter-close',
    'aria-label': 'filter close',
    'aria-expanded': false,
  });
  filtersInputsContainerCloseBtn.addEventListener('click', async () => {
    closeFiltersInputsContainer();
  });

  const filtersBtnContainer = createElement('div', { class: 'btn-container' });

  const filtersResetBtn = createElement('button', { class: 'secondary btn' });
  filtersResetBtn.innerHTML = 'RESET';
  filtersResetBtn.addEventListener('click', async () => {
    resetFilters();
  });

  const filtersApplyBtn = createElement('button', { class: 'primary btn' });
  filtersApplyBtn.innerHTML = 'APPLY';
  filtersApplyBtn.addEventListener('click', async () => {
    applyFilters();
  });

  filterSearchInput.addEventListener('input', async (e) => {
    handleInputSearch(e);
  });

  filtersInputsContainer.append(filtersInputsContainerCloseBtn);
  filtersTitle.innerHTML = filtersLabel;
  filtersInputsContainer.append(filtersTitle);
  const inputsFlexContainer = createElement('div', { class: 'inputs-flex-container' });
  filterSearchInputContainer.append(filterSearchInput);
  inputsFlexContainer.append(filterSearchInputContainer);

  if (economicFilters && economicFilters.countries) {
    inputsFlexContainer.append(decorateFilterCountryInput());
  }
  if (economicFilters && economicFilters.impact) {
    inputsFlexContainer.append(decorateFilterImpactInput());
  }

  filtersInputsContainer.append(inputsFlexContainer);

  filtersBtnContainer.append(filtersResetBtn);
  filtersBtnContainer.append(filtersApplyBtn);
  filtersInputsContainer.append(filtersBtnContainer);

  return filtersInputsContainer;
}

function renderFilterSection() {
  // filters input and mobile modal
  const inputs = renderInputs();
  const filtersMobileBtn = createElement('button', { class: 'primary toggle-button btn' });
  filtersMobileBtn.innerHTML = filtersLabel;
  filtersMobileBtn.addEventListener('click', async () => {
    openFiltersInputsContainer();
  });
  filtersInputsMainContainer.append(filtersMobileBtn);
  filtersInputsMainContainer.append(inputs);
  filtersSectionEventCalendar.append(filtersInputsMainContainer);
  // current filters - pills
  filtersSectionEventCalendar.append(filtersCurrentContainer);
  // date filters
  filtersSectionEventCalendar.append(filtersDateContainer);

  // from url check correct checkboxes in dropdown
  const checkboxInDropdown = filtersInputsContainer.querySelectorAll('.checkbox-dropdown input[type=checkbox]');
  checkboxInDropdown.forEach((checkbox) => {
    const listId = checkbox.closest('.checkbox-dropdown')?.id;
    if (listId && filterPillsArray[listId]) {
      const isChecked = filterPillsArray[listId].some((item) => item.id === checkbox.id);
      checkbox.checked = isChecked;
    } else {
      checkbox.checked = false;
    }
  });

  return filtersSectionEventCalendar;
}

function initFilters() {
  // create filter array from url hashes
  const getUrlFilterParam = (hashParam, defaultValue = []) => {
    const hashParamFilters = uriUtil.getHash(hashParam) || defaultValue;
    return Array.isArray(hashParamFilters)
      ? hashParamFilters
      : [hashParamFilters];
  };
  const createFilterPillsArrayFromUrl = (filterType, ids) => {
    const sourceArray = economicFilters[filterType];
    if (!sourceArray) {
      return [];
    }
    return ids.map((id) => {
      const foundItem = sourceArray.find((item) => item.id === id);
      return foundItem ? { id: foundItem.id, name: foundItem.name } : null;
    }).filter((item) => item !== null);
  };
  const countryIds = getUrlFilterParam(params.countryParam);
  filterPillsArray['input-country'] = createFilterPillsArrayFromUrl('countries', countryIds);
  const impactIds = getUrlFilterParam(params.attributeParam);
  filterPillsArray['input-impact'] = createFilterPillsArrayFromUrl('impact', impactIds);

  // render pills
  renderCurrentPills(filterPillsArray);
}

async function init(block, version) {
  await initializeLabels();
  economicFilters = await getEconomicReleaseFilters();
  initFilters();

  eventCalendarContainer.append(inputsCurtain);
  inputsCurtain.addEventListener('click', async () => {
    closeFiltersInputsContainer();
  });

  let prevWindowWidth = window.innerWidth;
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const windowWidth = window.innerWidth;
      const crossedBreakpointDown = (prevWindowWidth > 1200 && windowWidth <= 1199);
      const crossedBreakpointUp = (prevWindowWidth <= 1199 && windowWidth >= 1200);
      if (crossedBreakpointDown) {
        isDesktop = window.innerWidth > 1200;
      }
      if (crossedBreakpointUp) {
        isDesktop = window.innerWidth > 1200;
        renderCurrentPills(filterPillsArray);
        const openInputsCurtain = document.querySelector('.inputs-curtain.is-open');
        if (openInputsCurtain) {
          closeFiltersInputsContainer();
          // call service with variables here
        }
      }
      prevWindowWidth = windowWidth;
    }, 50);
  });

  const filterSection = renderFilterSection();
  filterSectionContainer.append(filterSection);
  eventCalendarContainer.append(filterSectionContainer);
  eventCalendarContainer.classList.add(`${version}`);
  block.append(eventCalendarContainer);
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    version,
  } = dataBlock;

  block.innerHTML = '';
  init(block, version);
}
