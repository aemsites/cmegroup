import { readBlockConfig, loadScript } from '../../scripts/aem.js';
import { createElement, i18n } from '../../scripts/utils.js';
import {
  getEconomicReleaseFilters,
  postEconomicReleaseDates,
  postEconomicReleaseEvents,
} from '../../scripts/services/ProductCalendarService.js';
import { URIUtil } from '../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);
const { body } = window.document;
let isDesktop = window.innerWidth > 1200;
const inputsCurtain = createElement('div', { class: 'inputs-curtain' });
const eventCalendarContainer = createElement('div', { class: 'event-calendar' });
const filterSectionContainer = createElement('div', { class: 'filter-section-container' });
const resultSectionContainer = createElement('div', { class: 'results-section-container' });
const lateralDaysList = createElement('div', { class: 'lateral-days-list' });
const calendarTableContainer = createElement('div', { class: 'event-calendar-table-container' });
const resultListTableSection = createElement('div', { class: 'result-list-table-section' });
const calendarResume = createElement('div', { class: 'event-calendar-resume-wrapper' });
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
let leftPanelDays;
let events;
let leftPanelSelectedDay = new Date();
let nthEvents;
let filtersLabel;
const currentPillsLabel = 'Currently filtering by:';
let searchValueVar = '';
let timeoutId;
const filtersArray = {};
let datePicker;
let showingDays = 7;
let tradeDate = new Date();
const params = {
  tradeDateParam: 'tradeDate',
  countryParam: 'countries',
  attributeParam: 'attributes',
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  updateURLFilterParam(params.tradeDateParam, 'tradeDate');
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

async function getLeftPanelDays() {
  const date = formatDate(new Date(tradeDate));
  const countries = filtersArray['input-country'].map((country) => country.id);
  const impacts = filtersArray['input-impact'].map((impact) => impact.id);
  const daysLimit = 30;
  const textSearch = searchValueVar;

  leftPanelDays = await postEconomicReleaseDates(
    date,
    countries,
    impacts,
    daysLimit,
    textSearch,
  );
  if (leftPanelDays) {
    // eslint-disable-next-line no-use-before-define
    const resultSection = renderResultSection();
    resultSectionContainer.append(resultSection);
    eventCalendarContainer.append(resultSectionContainer);
  }
}

async function getEvents() {
  // remove interior de tabla here
  // add spinner here
  const date = formatDate(new Date(leftPanelSelectedDay));
  const countries = filtersArray['input-country'].map((country) => country.id);
  const impacts = filtersArray['input-impact'].map((impact) => impact.id);
  const textSearch = searchValueVar;

  events = await postEconomicReleaseEvents(
    date,
    countries,
    impacts,
    textSearch,
  );
  if (events) {
    // eslint-disable-next-line no-use-before-define
    const eventsSection = renderEventSection();
    resultListTableSection.append(eventsSection);
  }
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

function closeDatePickerMobileContainer() {
  inputsCurtain.classList.remove('is-open');
  body.classList.remove('curtain-visible');
}

function openDatePickerMobileContainer() {
  inputsCurtain.classList.add('is-open');
  body.classList.add('curtain-visible');
}

function cleanInputSearch() {
  searchValueVar = '';
  filterSearchInput.value = '';
  if (filterSearchInputContainer.contains(cleanInput)) {
    cleanInput.remove();
  }
  // call service with variables here
  getLeftPanelDays();
  getEvents();
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
      // call service with variables here
      getLeftPanelDays();
      getEvents();
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
    for (const listId in filtersArray) {
      // eslint-disable-next-line max-len
      if (
        Object.prototype.hasOwnProperty.call(filtersArray, listId)
        && Array.isArray(filtersArray[listId])
        && listId !== 'tradeDate'
      ) {
        filtersArray[listId] = filtersArray[listId].filter((item) => item.id !== pill);
      }
    }
    // if filterPillsArray is empty clear all
    if (Object.values(filtersArray).every((value) => !Array.isArray(value)
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
    for (const listId in filtersArray) {
      if (
        Object.prototype.hasOwnProperty.call(filtersArray, listId)
        && Array.isArray(filtersArray[listId])
        && listId !== 'tradeDate'
      ) {
        filtersArray[listId] = [];
      }
    }
  }
  updateURLFilters(filtersArray);
  getLeftPanelDays();
  getEvents();
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
    if (Object.prototype.hasOwnProperty.call(pillsArray, key) && key !== 'tradeDate') {
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
  if (!filtersArray[listId]) {
    filtersArray[listId] = [];
  }

  const checkboxData = {
    id: checkbox.id,
    name: checkbox.name,
  };

  if (checkbox.checked) {
    const existingIndex = filtersArray[listId].findIndex((item) => item.id === checkbox.id);
    if (existingIndex === -1) {
      filtersArray[listId].push(checkboxData);
    }
  } else {
    filtersArray[listId] = filtersArray[listId].filter((item) => item.id !== checkbox.id);
  }

  if (isDesktop) {
    renderCurrentPills(filtersArray);
    getLeftPanelDays();
    getEvents();
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
                    <div class="flag-icon ${id.toLowerCase()}"></div>
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
  renderCurrentPills(filtersArray);
  closeFiltersInputsContainer();
  // call service with variables here
  getLeftPanelDays();
  getEvents();
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
  filterSearchInput.placeholder = 'Search by event';
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

function createTodayBtn(instance) {
  const todayButton = document.createElement('button');
  todayButton.classList.add('datepicker-today-btn');
  todayButton.textContent = 'Today';
  todayButton.addEventListener('click', () => {
    tradeDate = new Date();
    instance.setDate(new Date(), true);
    filtersArray.tradeDate = [{ id: formatDate(new Date()) }];
    updateURLFilters(filtersArray);
    // service here
    leftPanelSelectedDay = tradeDate;
    getLeftPanelDays();
    getEvents();
  });

  return todayButton;
}

function initDatePicker() {
  // eslint-disable-next-line no-undef
  datePicker = datepicker(document.querySelector('input.event-calendar-datepicker'), {
    dateSelected: tradeDate,
    formatter: (input, date) => {
      const weekdayOptions = { weekday: 'long' };
      const monthOptions = { month: 'long' };
      const dayOptions = { day: 'numeric' };
      const yearOptions = { year: 'numeric' };

      const weekday = new Intl.DateTimeFormat('en-US', weekdayOptions).format(date);
      const day = new Intl.DateTimeFormat('en-US', dayOptions).format(date);
      const month = new Intl.DateTimeFormat('en-US', monthOptions).format(date);
      const year = new Intl.DateTimeFormat('en-US', yearOptions).format(date);

      const formattedDate = `${weekday}, ${day} ${month} ${year}`;
      const value = formattedDate;
      input.value = value;
    },
    disableYearOverlay: true,
    customDays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    onSelect: (instance, date) => {
      if (date === undefined) {
        instance.setDate(tradeDate);
        instance.hide();
      } else {
        tradeDate = date;
      }
      filtersArray.tradeDate = [{ id: formatDate(date) }];
      updateURLFilters(filtersArray);
      // service here
      leftPanelSelectedDay = tradeDate;
      getLeftPanelDays();
      getEvents();
    },
    onShow: (instance) => {
      instance.el.classList.add('datepicker-open');
      if (!isDesktop) {
        instance.calendarContainer.classList.add('open-mobile');
      }
      if (!instance.calendar.querySelector('.datepicker-today-btn')) {
        const controls = instance.calendar.querySelector('.datepicker-controls');
        if (controls) {
          controls.appendChild(createTodayBtn(instance));
        } else {
          instance.calendar.appendChild(createTodayBtn(instance));
        }
      }
    },
    onHide: (instance) => {
      instance.calendarContainer.classList.remove('open-mobile');
      instance.el.classList.remove('datepicker-open');
      closeDatePickerMobileContainer();
    },
    onMonthChange: (instance) => {
      if (!instance.calendar.querySelector('.datepicker-today-btn')) {
        const controls = instance.calendar.querySelector('.datepicker-controls');
        if (controls) {
          controls.appendChild(createTodayBtn(instance));
        } else {
          instance.calendar.appendChild(createTodayBtn(instance));
        }
      }
    },
  });
}

function changeMonth(dateString, monthsToAdd) {
  const date = new Date(dateString);
  const currentMonth = date.getMonth();

  date.setMonth(currentMonth + monthsToAdd);

  const targetMonth = date.getMonth();
  const expectedMonth = (currentMonth + monthsToAdd + 12) % 12;

  if (targetMonth !== expectedMonth) {
    date.setDate(0);
  }

  return date;
}

function MonthListener(cta, isNext) {
  cta.addEventListener('click', () => {
    if (isNext) {
      tradeDate = changeMonth(tradeDate, 1);
      datePicker.setDate(tradeDate, true);
      // update url
      filtersArray.tradeDate = [{ id: formatDate(tradeDate) }];
      updateURLFilters(filtersArray);
      // service here
      leftPanelSelectedDay = tradeDate;
      getLeftPanelDays();
      getEvents();
    } else {
      tradeDate = changeMonth(tradeDate, -1);
      datePicker.setDate(tradeDate, true);
      // update url
      filtersArray.tradeDate = [{ id: formatDate(tradeDate) }];
      updateURLFilters(filtersArray);
      // service here
      leftPanelSelectedDay = tradeDate;
      getLeftPanelDays();
      getEvents();
    }
  });
}

function renderMonthCTA() {
  const dateCTAContainer = createElement('div', { class: 'date-filter-cta-container' });
  const prevCta = createElement('button', { class: 'primary btn prev-cta' });
  prevCta.innerHTML = 'Prev Month';
  const nextCta = createElement('button', { class: 'primary btn next-cta' });
  nextCta.innerHTML = 'Next Month';
  dateCTAContainer.append(prevCta);
  dateCTAContainer.append(nextCta);
  MonthListener(prevCta);
  MonthListener(nextCta, true);
  return dateCTAContainer;
}

function formatDayWithSuffix(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();

  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function getDayName(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.toLocaleDateString(undefined, { weekday: 'long' });
  return dayOfWeek;
}

function getResultDays(days) {
  const resultDays = days?.filter(
    (day, index) => index <= Number(showingDays) - 1,
  );
  return resultDays;
}

function setupLateralDaysListeners(daysList) {
  const daysAnchors = daysList.querySelectorAll('a');
  daysAnchors.forEach((day) => {
    // eslint-disable-next-line func-names
    day.addEventListener('click', () => {
      const innerActiveElem = daysList.querySelector('.active-date');
      if (innerActiveElem) {
        innerActiveElem.classList.remove('active-date');
      }
      day.parentElement.classList.add('active-date');
      leftPanelSelectedDay = formatDate(new Date(day.dataset.date));
      nthEvents = day.dataset.nthEvents;
      // service here
      // eslint-disable-next-line no-use-before-define
      getEvents();
    });
  });
}

function renderResultListSection(days) {
  const filteredDays = getResultDays(days);
  lateralDaysList.innerHTML = `
  <ul>
    ${filteredDays.map(({ date, totalEventsCount }, index) => {
    if (index === 0) {
      nthEvents = totalEventsCount;
    }
    const li = `
            <li class=${formatDate(new Date(leftPanelSelectedDay)) === formatDate(new Date(date)) ? 'active-date' : ''}>
              <a role="button" tabindex="0" data-date=${date} data-nth-events=${totalEventsCount}>
                <span class="number-date">${formatDayWithSuffix(date)}</span>
                <span class="name-date">${getDayName(date)}</span>
                <span class="events-date ${totalEventsCount === 0 ? 'no-events' : ''}">${totalEventsCount} Events</span>
              </a>
            </li>
          `;
    return li;
  }).join('')}
  </ul>`;
  setupLateralDaysListeners(lateralDaysList);
  // eslint-disable-next-line no-use-before-define
  renderCalendarResume();
  return lateralDaysList;
}

function renderResultSection() {
  if (leftPanelDays?.events?.length > 0) {
    lateralDaysList.innerHTML = '';
    resultListTableSection.append(renderResultListSection(leftPanelDays.events));
  }

  return resultListTableSection;
}

function renderEvents() {
  // eslint-disable-next-line no-use-before-define
  renderCalendarResume();
  // remove spinner here
  // if (events)
  // tabla
  // texto de no hay reports

  // const filteredDays = getResultDays(days);
  // lateralDaysList.innerHTML = `
  // <ul>
  //   ${filteredDays.map(({ date, totalEventsCount }) => {
  //   const li = `
  //           <li class=${formatDate(new Date(leftPanelSelectedDay)) === formatDate(new Date(date)) ? 'active-date' : ''}>
  //             <a role="button" tabindex="0" data-date=${date}>
  //               <span class="number-date">${formatDayWithSuffix(date)}</span>
  //               <span class="name-date">${getDayName(date)}</span>
  //               <span class="events-date ${totalEventsCount === 0 ? 'no-events' : ''}">${totalEventsCount} Events</span>
  //             </a>
  //           </li>
  //         `;
  //   return li;
  // }).join('')}
  // </ul>`;
  // setupLateralDaysListeners(lateralDaysList);
  // return lateralDaysList;
}

function formateDateForResume(date) {
  const dateNoFormat = new Date(date);
  const month = dateNoFormat.toLocaleString('en-US', { month: 'long' });
  const year = dateNoFormat.getFullYear();
  const dayWithSuffix = formatDayWithSuffix(dateNoFormat);

  return `${dayWithSuffix} ${month} ${year}`;
}

function renderCalendarResume() {
  calendarResume.innerHTML = `
  <p>
    Showing<span> '${nthEvents === 0 ? 'NO' : nthEvents}' </span>Matching Events for<span> "${formateDateForResume(leftPanelSelectedDay)}"</span>
  </p>
  `;
  return calendarResume;
}

function renderEventSection() {
  calendarTableContainer.append(renderCalendarResume());
  calendarTableContainer.append(renderEvents());

  return calendarTableContainer;
}

function customDropdownListener(dropdown) {
  const customDropdown = dropdown;
  const dropdownHeader = customDropdown.querySelector('.dropdown-header');
  const dropdownList = customDropdown.querySelector('.dropdown-list');
  const selectedValueSpan = customDropdown.querySelector('.selected-value');
  const valueInput = customDropdown.querySelector('#timeframe-value');
  const listItems = dropdownList.querySelectorAll('li');

  dropdownHeader.addEventListener('click', () => {
    dropdownList.classList.toggle('open');
    dropdownHeader.classList.toggle('open');
  });

  listItems.forEach((item) => {
    item.addEventListener('click', () => {
      // eslint-disable-next-line prefer-destructuring
      const value = item.dataset.value;
      const text = item.textContent;

      selectedValueSpan.textContent = text;
      valueInput.value = value;
      showingDays = value;
      renderResultListSection(leftPanelDays.events);

      listItems.forEach((li) => li.classList.remove('active'));
      item.classList.add('active');

      dropdownList.classList.remove('open');
      dropdownHeader.classList.remove('open');
    });
  });

  document.addEventListener('click', (event) => {
    if (!customDropdown.contains(event.target)) {
      dropdownList.classList.remove('open');
      dropdownHeader.classList.remove('open');
    }
  });
}

function renderDaysDropdown() {
  const customDropdown = createElement('div', { class: 'custom-dropdown' });
  customDropdown.innerHTML = `
    <div class="dropdown-header">
      <span class="selected-value">7 Days</span>
      <div class="arrow"></div>
    </div>
    <ul class="dropdown-list">
      <li data-value="7" class="active">7 Days</li>
      <li data-value="14">14 Days</li>
      <li data-value="30">30 Days</li>
    </ul>
    <input type="hidden" name="timeframe" id="timeframe-value" value="7">
  `;
  customDropdownListener(customDropdown);
  return customDropdown;
}

function renderDatePicker() {
  const inputDateContainer = createElement('div', { class: 'event-calendar-datepicker-container' });
  const inputDate = createElement('input', { class: 'event-calendar-datepicker' });
  inputDate.addEventListener('click', () => {
    if (!isDesktop) {
      openDatePickerMobileContainer();
    }
  });
  inputDateContainer.append(inputDate);
  filtersDateContainer.append(inputDateContainer);

  const dateFilterSubContainer = createElement('div', { class: 'date-filter-sub-container' });
  const daysContainer = createElement('div', { class: 'date-filter-days-container' });
  const showingLabel = createElement('p');
  showingLabel.innerHTML = 'Showing:';

  daysContainer.append(showingLabel);
  daysContainer.append(renderDaysDropdown());
  dateFilterSubContainer.append(daysContainer);
  dateFilterSubContainer.append(renderMonthCTA());

  filtersDateContainer.append(dateFilterSubContainer);
  return filtersDateContainer;
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
  renderDatePicker();
  filtersSectionEventCalendar.append(filtersDateContainer);

  // from url check correct checkboxes in dropdown
  const checkboxInDropdown = filtersInputsContainer.querySelectorAll('.checkbox-dropdown input[type=checkbox]');
  checkboxInDropdown.forEach((checkbox) => {
    const listId = checkbox.closest('.checkbox-dropdown')?.id;
    if (listId && filtersArray[listId]) {
      const isChecked = filtersArray[listId].some((item) => item.id === checkbox.id);
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
  filtersArray['input-country'] = createFilterPillsArrayFromUrl('countries', countryIds);
  const impactIds = getUrlFilterParam(params.attributeParam);
  filtersArray['input-impact'] = createFilterPillsArrayFromUrl('impact', impactIds);
  const date = getUrlFilterParam(params.tradeDateParam);
  if (date.length > 0) {
    tradeDate = new Date(date);
    filtersArray.tradeDate = [{ id: date }];
  } else {
    filtersArray.tradeDate = [{ id: formatDate(tradeDate) }];
  }

  // render pills
  renderCurrentPills(filtersArray);

  // service
  leftPanelSelectedDay = tradeDate;
  getLeftPanelDays();
  getEvents();
}

async function init(block, version) {
  loadScript('/aemedge/scripts/third-party/datepicker/datepicker.min.js');
  await initializeLabels();
  economicFilters = await getEconomicReleaseFilters();
  // getLeftPanelDays();
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
        datePicker.hide();
      }
      if (crossedBreakpointUp) {
        isDesktop = window.innerWidth > 1200;
        renderCurrentPills(filtersArray);
        const openInputsCurtain = document.querySelector('.inputs-curtain.is-open');
        if (openInputsCurtain) {
          closeFiltersInputsContainer();
          datePicker.hide();
          // call service with variables here
          getLeftPanelDays();
          getEvents();
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
  initDatePicker();
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    version,
  } = dataBlock;

  block.innerHTML = '';
  init(block, version);
}
