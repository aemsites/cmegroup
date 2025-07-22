import { loadScript } from '../../scripts/aem.js';
import { createElement, i18n, readBlockConfig } from '../../scripts/utils.js';
import {
  getEconomicReleaseFilters,
  getEconomicReleaseDates,
  getEconomicReleaseEvents,
} from '../../scripts/services/EconomicReleaseService.js';
import { URIUtil, escapeHtmlTags, parseCurrencyValue } from '../../scripts/utils/index.js';

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
const eventCalendarTable = createElement('div', { class: 'event-calendar-table' });
const eventCalendarTHead = createElement('div', { class: 'event-calendar-table-thead' });
const eventCalendarTBody = createElement('div', { class: 'event-calendar-table-tbody' });
const filtersSectionEventCalendar = createElement('div', { class: 'filters-section-event-calendar' });
const filtersInputsMainContainer = createElement('div', { class: 'filters-block' });
const filtersCurrentContainer = createElement('div', { class: 'current-filters' });
const filtersDateContainer = createElement('div', { class: 'date-filter-container' });
const filterExpander = createElement('button', { class: 'filter-expander filter-collapsed' });
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
const spinnerInEventCalendar = createElement('div', { class: 'lds-ring spinner-in-event-calendar' });
spinnerInEventCalendar.innerHTML = `
  <div></div>
  <div></div>
  <div></div>
  <div></div>
`;
let economicFilters;
let leftPanelDays;
let events;
let leftPanelSelectedDay;
let nthEvents;
let filtersLabel;
let currentPillsLabel;
let clearAllLabel;
let resetLabel;
let applyLabel;
let searchByEventLabel;
let todayLabel;
let prevMonthLabel;
let nextMonthLabel;
let daysLabel;
let showingLabel;
let timeLabel;
let countryLabel;
let eventLabel;
let actualLabel;
let previousLabel;
let previousInfoLabel;
let consensusLabel;
let impactLabel;
let highImpactLabel;
let minimalImpactLabel;
let lowImpactLabel;
let searchValueVar = '';
let timeoutId;
const filtersArray = {};
let datePicker;
let showingDays = 7;
let tradeDate;
const params = {
  tradeDateParam: 'tradeDate',
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
  updateURLFilterParam(params.tradeDateParam, 'tradeDate');
  updateURLFilterParam(params.countryParam, 'input-country');
  updateURLFilterParam(params.attributeParam, 'input-impact');
  uriUtil.navigate(true);
}

async function initializeLabels() {
  const [
    filtersLabelVar,
    currentPillsLabelVar,
    clearAllLabelVar,
    resetLabelVar,
    applyLabelVar,
    searchByEventLabelVar,
    todayLabelVar,
    prevMonthLabelVar,
    nextMonthLabelVar,
    daysLabelVar,
    showingLabelVar,
    timeLabelVar,
    countryLabelVar,
    eventLabelVar,
    actualLabelVar,
    previousLabelVar,
    previousInfoLabelVar,
    consensusLabelVar,
    impactLabelVar,
    highImpactLabelVar,
    minimalImpactLabelVar,
    lowImpactLabelVar,
  ] = await Promise.all([
    i18n('Filters'),
    i18n('Currently filtering by:'),
    i18n('Clear All'),
    i18n('RESET'),
    i18n('APPLY'),
    i18n('Search by event'),
    i18n('Today'),
    i18n('Prev Month'),
    i18n('Next Month'),
    i18n('Days'),
    i18n('Showing:'),
    i18n('Time'),
    i18n('Country'),
    i18n('Event'),
    i18n('Actual'),
    i18n('Previous'),
    i18n('Asterisk indicates that the Actual value for the Previous period was revised from its originally published value.'),
    i18n('Consensus'),
    i18n('Impact'),
    i18n('High Impact'),
    i18n('Minimal Impact'),
    i18n('Low Impact'),
  ]);

  filtersLabel = filtersLabelVar;
  currentPillsLabel = currentPillsLabelVar;
  clearAllLabel = clearAllLabelVar;
  resetLabel = resetLabelVar;
  applyLabel = applyLabelVar;
  searchByEventLabel = searchByEventLabelVar;
  todayLabel = todayLabelVar;
  prevMonthLabel = prevMonthLabelVar;
  nextMonthLabel = nextMonthLabelVar;
  daysLabel = daysLabelVar;
  showingLabel = showingLabelVar;
  timeLabel = timeLabelVar;
  countryLabel = countryLabelVar;
  eventLabel = eventLabelVar;
  actualLabel = actualLabelVar;
  previousLabel = previousLabelVar;
  previousInfoLabel = previousInfoLabelVar;
  consensusLabel = consensusLabelVar;
  impactLabel = impactLabelVar;
  highImpactLabel = highImpactLabelVar;
  minimalImpactLabel = minimalImpactLabelVar;
  lowImpactLabel = lowImpactLabelVar;
}

async function getLeftPanelDays() {
  const date = dayjs.utc(tradeDate).format('YYYY-MM-DD');
  const countries = filtersArray['input-country'].map((country) => country.id);
  const impacts = filtersArray['input-impact'].map((impact) => impact.id);
  const daysLimit = 30;
  const textSearch = searchValueVar;

  leftPanelDays = await getEconomicReleaseDates(
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
  // remove table here
  eventCalendarTBody.innerHTML = '';
  // add spinner here
  eventCalendarTBody.append(spinnerInEventCalendar);

  const date = dayjs.utc(leftPanelSelectedDay).format('YYYY-MM-DD');
  const countries = filtersArray['input-country'].map((country) => country.id);
  const impacts = filtersArray['input-impact'].map((impact) => impact.id);
  const textSearch = searchValueVar;

  events = await getEconomicReleaseEvents(
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
}

function handleInputSearch(e) {
  searchValueVar = e.target.value;
  if (!filterSearchInputContainer.contains(cleanInput) && searchValueVar !== '') {
    filterSearchInputContainer.append(cleanInput);
  }
  if (window.innerWidth >= 1201) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // call service with variables here
      getLeftPanelDays();
      getEvents();
    }, 400);
    if (searchValueVar === '' && filterSearchInputContainer.contains(cleanInput)) {
      cleanInput.remove();
    }
  }
}

function isFilterExpandedNeeded() {
  if (pillsInnerContainer.clientHeight > 168) {
    filtersCurrentContainer.append(filterExpander);
  } else {
    filterExpander.remove();
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
    const otherKeys = Object.keys(filtersArray).filter((key) => key !== 'tradeDate');
    if (otherKeys.every((key) => Array.isArray(filtersArray[key])
      && filtersArray[key].length === 0)) {
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
  isFilterExpandedNeeded();
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

function renderPillsExpandBtn() {
  filterExpander.setAttribute('type', 'button');
  filterExpander.addEventListener('click', async () => {
    if (filterExpander.classList.contains('filter-collapsed')) {
      filterExpander.classList.remove('filter-collapsed');
      pillsWrapper.classList.add('open');
    } else {
      filterExpander.classList.add('filter-collapsed');
      pillsWrapper.classList.remove('open');
    }
  });
  if (pillsInnerContainer.clientHeight > 160) {
    filtersCurrentContainer.append(filterExpander);
  }
}

function renderCurrentPills(pillsArray) {
  filtersCurrentContainer.innerHTML = '';
  pillsHeader.innerHTML = currentPillsLabel;
  filtersCurrentContainer.append(pillsHeader);
  const clearAllPill = createElement('button', { class: 'btn-pill clear-all' });
  clearAllPill.setAttribute('type', 'button');
  clearAllPill.dataset.filter = 'clear-all';
  clearAllPill.innerHTML = clearAllLabel;
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

  isFilterExpandedNeeded();
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
  filtersResetBtn.innerHTML = resetLabel;
  filtersResetBtn.addEventListener('click', async () => {
    resetFilters();
  });

  const filtersApplyBtn = createElement('button', { class: 'primary btn' });
  filtersApplyBtn.innerHTML = applyLabel;
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
  filterSearchInput.placeholder = searchByEventLabel;
  filterSearchInputContainer.append(filterSearchInput);
  decorateCleanInputSearch();
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

function getDatePickerVerticalPosition(inputElement) {
  const inputRect = inputElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // Estimate datepicker height
  const estimatedDatepickerHeight = 355;
  // Calculate space below the input
  const spaceBelow = viewportHeight - (inputRect.top + inputRect.height);
  // Calculate space above the input
  const spaceAbove = inputRect.top;

  if (spaceBelow >= estimatedDatepickerHeight || spaceBelow > spaceAbove) {
    inputElement.classList.remove('on-top');
  } else if (spaceAbove >= estimatedDatepickerHeight) {
    inputElement.classList.add('on-top');
  }
}

function createTodayBtn(instance) {
  const todayButton = document.createElement('button');
  todayButton.classList.add('datepicker-today-btn');
  todayButton.textContent = todayLabel;
  todayButton.addEventListener('click', () => {
    tradeDate = dayjs.utc().$d;
    instance.setDate(dayjs.utc().$d, true);
    filtersArray.tradeDate = [{ id: dayjs.utc().format('YYYY-MM-DD') }];
    updateURLFilters(filtersArray);
    // service here
    leftPanelSelectedDay = tradeDate;
    getLeftPanelDays();
    getEvents();
  });

  return todayButton;
}

function initDatePicker() {
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
      filtersArray.tradeDate = [{ id: dayjs.utc(date).format('YYYY-MM-DD') }];
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
      getDatePickerVerticalPosition(instance.calendarContainer);
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
  const date = dayjs.utc(dateString).$d;
  const currentMonth = date.getMonth();

  date.setMonth(currentMonth + monthsToAdd);

  const targetMonth = date.getMonth();
  const expectedMonth = (currentMonth + monthsToAdd + 12) % 12;

  if (targetMonth !== expectedMonth) {
    date.setDate(0);
  }

  return date;
}

function monthListener(cta, isNext) {
  cta.addEventListener('click', () => {
    if (isNext) {
      tradeDate = changeMonth(tradeDate, 1);
      datePicker.setDate(tradeDate, true);
      // update url
      filtersArray.tradeDate = [{ id: dayjs.utc(tradeDate).format('YYYY-MM-DD') }];
      updateURLFilters(filtersArray);
      // service here
      leftPanelSelectedDay = tradeDate;
      getLeftPanelDays();
      getEvents();
    } else {
      tradeDate = changeMonth(tradeDate, -1);
      datePicker.setDate(tradeDate, true);
      // update url
      filtersArray.tradeDate = [{ id: dayjs.utc(tradeDate).format('YYYY-MM-DD') }];
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
  prevCta.innerHTML = prevMonthLabel;
  const nextCta = createElement('button', { class: 'primary btn next-cta' });
  nextCta.innerHTML = nextMonthLabel;
  dateCTAContainer.append(prevCta);
  dateCTAContainer.append(nextCta);
  monthListener(prevCta);
  monthListener(nextCta, true);
  return dateCTAContainer;
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
      leftPanelSelectedDay = dayjs.utc(day.dataset.date).format('YYYY-MM-DD');
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
    const isActiveDate = dayjs.utc(leftPanelSelectedDay).format('YYYY-MM-DD') === dayjs.utc(date).format('YYYY-MM-DD');
    const dayName = dayjs.utc(date).format('dddd');
    const dayWithSuffix = dayjs.utc(date).format('Do');
    const li = `
            <li class=${isActiveDate ? 'active-date' : ''}>
              <a role="button" tabindex="0" data-date=${date} data-nth-events=${totalEventsCount}>
                <span class="number-date">${dayWithSuffix}</span>
                <span class="name-date">${dayName}</span>
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

function valueInTable(value1, value2) {
  const numValue1 = parseCurrencyValue(value1);
  const numValue2 = parseCurrencyValue(value2);

  if (value1 != null && value2 != null
    && !Number.isNaN(numValue1) && !Number.isNaN(numValue2)) {
    if (numValue1 > numValue2) {
      return 'positive';
    }
    if (numValue1 < numValue2) {
      return 'negative';
    }
  }
  return '';
}

function setupEventAccordionCardListeners(accordionCardListContainer) {
  const accordionCardList = accordionCardListContainer.querySelectorAll('.event-accordion-card');
  accordionCardList.forEach((accordionCard) => {
    accordionCard.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        return;
      }
      const accordionCardHeader = accordionCard.querySelector('.event-accordion-card-header');
      const accordionCardBody = accordionCard.querySelector('.collapse');
      const isOpen = accordionCardHeader && accordionCardHeader.classList.contains('open');
      accordionCardList.forEach((card) => {
        const cardHeader = card.querySelector('.event-accordion-card-header');
        const cardBody = card.querySelector('.collapse');
        if (cardHeader) {
          cardHeader.classList.remove('open');
        }
        if (cardBody) {
          cardBody.classList.remove('show');
        }
      });

      if (!isOpen) {
        if (accordionCardHeader) {
          accordionCardHeader.classList.add('open');
        }
        if (accordionCardBody) {
          accordionCardBody.classList.add('show');
        }
      }
    });
  });
}

function renderDesktopAccordion(eventsToRender) {
  eventCalendarTBody.innerHTML = `
    ${eventsToRender.map(({
    country,
    date,
    eventName,
    eventValues,
    impact,
    nextReleaseDate,
    tags,
    text,
    title,
    url,
  }, index) => {
    const timeFormatted = `${dayjs.utc(date).tz('America/Chicago').format('hh:mm A [CT]')}` || '-';
    const nextReleaseDateFormatted = `${dayjs.utc(nextReleaseDate).format('dddd DD MMM YYYY')}` || '-';
    const {
      actual,
      consensus,
      isConsensus,
      isReport,
      previous,
    } = eventValues[0];
    const actualResult = valueInTable(actual, previous);
    const consensusResult = valueInTable(consensus, previous);
    const isExpandable = !!text;
    const div = `
      <div class="event-accordion-card">
        <div data-index=${index} class="event-accordion-card-header ${isExpandable ? '' : 'not-expandable'}">
          <div class="event-container">
            <ul>
              <li class="time">${timeFormatted}</li>
              <li class="country">
                <div class="country-content">
                <div class="flag-icon ${country.toLowerCase()}"></div>
                <span>${country}</span>
                </div>
              </li>
              <li>
                <a href=${url} target="_self">
                  <span class="event-name">${eventName || '-'}</span>
                  <i class="icon"></i>
                  ${(isReport || isConsensus) ? (
    `<span class="label">
                      ${isReport ? 'report' : 'consensus'}
                    </span>`
  ) : ''}
                </a>
              </li>
              <li class=${actualResult}>${actual || '-'}</li>
              <li>${previous || '-'}</li>
              <li class=${consensusResult}>${consensus || '-'}</li>
              <li>
                <div class="impact ${impact.toLowerCase()}"><div>
                <div></div>
              </li>
              <li></li>
            </ul>
          </div>
        </div>
        ${isExpandable ? (`
        <div class="collapse">
          <div class="event-accordion-card-body">
            <div class="expandable-content">
              <span class="highlight">${title}</span>
              <div class="main-content">
                <div class="left-section">
                  <p class="text">${escapeHtmlTags(text, ['br'])?.replace(
      /<br\s*\/?>\s*(<br\s*\/?>)+/g,
      '<br>',
    )}</p>
                  <div class="more">
                    <span class="icon"></span>
                    <a href=${url}>Read more</a>
                  </div>
                </div>
                <div class="right-section">
                  <div class="tags-section">
                    <span class="bold">Tags:</span>
                    <div>
                    ${tags.map((tagEl) => {
      const tag = `<span class="tag">${tagEl}</span>`;
      return tag;
    }).join('')}
                    </div>
                  </div>
                  <div>
                    <span class="bold">Next release date:</span>${nextReleaseDateFormatted}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        `) : ''}
      </div>`;
    return div;
  }).join('')}`;
  setupEventAccordionCardListeners(eventCalendarTBody);
}

function renderMobileAccordion(eventsToRender) {
  eventCalendarTBody.innerHTML = `
    ${eventsToRender.map(({
    country,
    date,
    eventName,
    eventValues,
    impact,
    tags,
    text,
    title,
    url,
  }, index) => {
    const timeFormatted = `${dayjs.utc(date).tz('America/Chicago').format('hh:mm A [CT] |')}` || '-';
    const {
      actual,
      consensus,
      isConsensus,
      isReport,
      previous,
    } = eventValues[0];
    const actualResult = valueInTable(actual, previous);
    const consensusResult = valueInTable(consensus, previous);
    const isExpandable = !!text;
    const div = `
      <div class="event-accordion-card mobile-accordion">
        <div data-index=${index} class="event-accordion-card-header ${isExpandable ? '' : 'not-expandable'}">
          <div class="event-container mobile">
            <div class="mobile-first-row">
              <div>
                <span class="time">${timeFormatted}</span>
              </div>
              <div class="event-details">
                <span class="event-name">${eventName || '-'}</span>
                ${(isReport || isConsensus) ? (
    `<span class="label">
                      ${isReport ? 'report' : 'consensus'}
                    </span>`
  ) : ''}
              </div>
            </div>
            <div class="mobile-second-row">
              <ul>
                <li class="country">
                    <div class="country-content">
                      <div class="flag-icon ${country.toLowerCase()}"></div>
                      <span>${country}</span>
                    </div>
                </li>
                <li class="act">
                  <span>Act</span><span class=${actualResult}>${actual || '-'}</span>
                </li>
                <li class="prev">
                  <span>Prev</span><span>${previous || '-'}</span>
                </li>
                <li>
                  <span>Cons</span><span class=${consensusResult}>${consensus || '-'}</span>
                </li>
                <li class="impct"><span>Impact</span><span>
                  <div class="impact ${impact.toLowerCase()}"><div></div></div>
                </li>
              </ul>
            </div> 
          </div>
        </div>
        ${isExpandable ? (`
        <div class="collapse">
          <div class="event-accordion-card-body">
            <div class="expandable-content mobile">
              <div class="main-content">
                <span class="highlight">${title}</span>
                <p class="text">${escapeHtmlTags(text, ['br'])?.replace(
      /<br\s*\/?>\s*(<br\s*\/?>)+/g,
      '<br>',
    )}</p>
                <div class="tags-section">
                  <span class="bold">Tags:</span>
                  <div>
                    ${tags.map((tagEl) => {
      const tag = `<span class="tag">${tagEl}</span>`;
      return tag;
    }).join('')}
                  </div>
                </div>
                <div class="more">
                  <span class="icon"></span>
                  <a href=${url}>Read more</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        `) : ''}
      </div>`;
    return div;
  }).join('')}`;
  setupEventAccordionCardListeners(eventCalendarTBody);
}

function renderDesktopNoResults() {
  const formateDateForNoResults = dayjs.utc(leftPanelSelectedDay).format('Do MMM YYYY');
  eventCalendarTBody.innerHTML = `
    <div class="no-results">
      <p>There are
      <span> no matching </span>
      reports for
      <span> "${formateDateForNoResults}"</span>
      </p>
      <p>See other dates or refilter results</p>
    </div>
  `;
}

function renderMobileNoResults() {
  eventCalendarTBody.innerHTML = `
    <div class="no-results">
      <p>
        <span class="calendar-icon"></span>
        No Matching Events
      </p>
    </div>
  `;
}

function renderEvents() {
  // clear table body
  eventCalendarTBody.innerHTML = '';
  if (Array.isArray(events) && events.length > 0) {
    if (isDesktop) {
      renderDesktopAccordion(events);
    } else {
      renderMobileAccordion(events);
    }
  } else if (isDesktop) {
    renderDesktopNoResults();
  } else {
    renderMobileNoResults();
  }

  eventCalendarTable.append(eventCalendarTBody);
}

function renderEventsTableHeader() {
  eventCalendarTHead.innerHTML = `
    <ul>
      <li>${timeLabel}</li>
      <li>${countryLabel}</li>
      <li>${eventLabel}</li>
      <li>${actualLabel}</li>
      <li>
        ${previousLabel}
        <div class="tooltip-container">
          <span class="info-icon"></span>
          <div class="tooltip">
            <p>
              ${previousInfoLabel}
            </p>
          </div>
        </div>
      </li>
      <li>${consensusLabel}</li>
      <li>
      ${impactLabel}
      <div class="tooltip-container">
        <span class="info-icon"></span>
        <div class="tooltip impact-tooltip">
          <div class="impact-info">
            <ul>
              <li><span class="bullet"></span>${highImpactLabel}</li>
              <li><span class="bullet"></span>${minimalImpactLabel}</li>
              <li><span class="bullet"></span>${lowImpactLabel}</li>
            </ul>
          </div>
        </div>
      </div>
      </li>
      <li></li>
    </ul>
  `;
  eventCalendarTable.append(eventCalendarTHead);
  return eventCalendarTable;
}

function renderCalendarResume() {
  const formateDateForResume = dayjs.utc(leftPanelSelectedDay).format('Do MMM YYYY');
  calendarResume.innerHTML = `
  <p class="desktop-view">
    Showing<span> '${nthEvents === '0' ? 'NO' : nthEvents}' </span>Matching Events for<span> "${formateDateForResume}"</span>
  </p>
  <p class="mobile-view">
    <span class="calendar-icon"></span>
    ${nthEvents} Matching Events
  </p>
  `;
  return calendarResume;
}

function renderEventSection() {
  calendarTableContainer.append(renderCalendarResume());
  calendarTableContainer.append(renderEventsTableHeader());
  renderEvents();

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

      eventCalendarTBody.classList.forEach((className) => {
        if (className.startsWith('showing-days-')) {
          eventCalendarTBody.classList.remove(className);
        }
      });

      listItems.forEach((li) => li.classList.remove('active'));
      item.classList.add('active');

      dropdownList.classList.remove('open');
      dropdownHeader.classList.remove('open');

      eventCalendarTBody.classList.add(`showing-days-${showingDays}`);
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
      <span class="selected-value">7 ${daysLabel}</span>
      <div class="arrow"></div>
    </div>
    <ul class="dropdown-list">
      <li data-value="7" class="active">7 ${daysLabel}</li>
      <li data-value="14">14 ${daysLabel}</li>
      <li data-value="30">30 ${daysLabel}</li>
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
  inputDate.readOnly = true;
  inputDateContainer.append(inputDate);
  filtersDateContainer.append(inputDateContainer);

  const dateFilterSubContainer = createElement('div', { class: 'date-filter-sub-container' });
  const daysContainer = createElement('div', { class: 'date-filter-days-container' });
  const showingLabelPar = createElement('p');
  showingLabelPar.innerHTML = showingLabel;

  daysContainer.append(showingLabelPar);
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
  tradeDate = dayjs.utc(date.length ? date : Date.now()).tz('America/Chicago', true).$d;
  filtersArray.tradeDate = [{ id: dayjs.utc(tradeDate).format('YYYY-MM-DD') }];

  // render pills
  renderCurrentPills(filtersArray);

  // service
  leftPanelSelectedDay = tradeDate;
  getLeftPanelDays();
  getEvents();
}

async function init(block, version) {
  /* eslint-disable no-undef */
  dayjs.extend(dayjs_plugin_utc);
  dayjs.extend(dayjs_plugin_timezone);
  dayjs.tz.setDefault('America/Chicago');
  dayjs.extend(dayjs_plugin_advancedFormat);
  /* eslint-enable no-undef */
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
        eventCalendarTBody.innerHTML = '';
        eventCalendarTBody.append(spinnerInEventCalendar);
        isDesktop = window.innerWidth >= 1201;
        datePicker.hide();
        setTimeout(() => {
          // 1.5 seconds delay for visual effect
          renderEvents();
        }, 1500);
      }
      if (crossedBreakpointUp) {
        eventCalendarTBody.innerHTML = '';
        eventCalendarTBody.append(spinnerInEventCalendar);
        isDesktop = window.innerWidth >= 1201;
        renderCurrentPills(filtersArray);
        setTimeout(() => {
          // 1.5 seconds delay for visual effect
          renderEvents();
        }, 1500);
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
      isFilterExpandedNeeded();
    }, 50);
  });

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const datepickerOpen = document.querySelector('.qs-datepicker-container:not(.qs-hidden)');
      if (datepickerOpen) {
        getDatePickerVerticalPosition(datepickerOpen);
      }
    }, 500);
  });

  const filterSection = renderFilterSection();
  filterSectionContainer.append(filterSection);
  eventCalendarContainer.append(filterSectionContainer);
  eventCalendarContainer.classList.add(`${version}`);
  block.append(eventCalendarContainer);

  renderPillsExpandBtn();
  initDatePicker();
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    version,
  } = dataBlock;

  block.innerHTML = '';
  // Array to hold promises for script loading
  const scriptPromises = [
    loadScript('/aemedge/scripts/third-party/datepicker/datepicker.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/dayjs.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/utc.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/timezone.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/advancedFormat.js'),
  ];

  // Wait for all scripts to load
  await Promise.all(scriptPromises);
  init(block, version);
}
