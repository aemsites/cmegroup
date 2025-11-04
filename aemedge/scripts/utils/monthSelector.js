import { loadCSS } from '../aem.js';
import { createElement, i18n } from '../utils.js';

const spanYear = createElement('span', { class: 'year-content' });

function toggleMonthSelector(e) {
  const button = e.target.closest('button');
  const expanded = button.getAttribute('aria-expanded');
  button.setAttribute('aria-expanded', !(expanded === 'true'));
}

function closeOnDocClick(e) {
  const button = document.querySelector('button.month-selector-button[aria-expanded=true]');
  const dropdown = document.querySelector('button.month-selector-button[aria-expanded=true] + .month-selector-dropdown');
  if (button && !(button.contains(e.target) || dropdown.contains(e.target))) {
    button.setAttribute('aria-expanded', false);
  }
}

function togglePosition() {
  const isDesktop = window.innerWidth >= 993;
  const button = document.querySelector('.month-selector-button');
  const dropdown = document.querySelector('.month-selector-dropdown');
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  const buttonRect = button.getBoundingClientRect();
  const dropdownHeight = dropdown.offsetHeight;
  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const spaceAbove = buttonRect.top;
  const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
  if (!button || !dropdown) return;
  if (!isDesktop && isOpen) {
    button.setAttribute('aria-expanded', false);
  }
  dropdown.style.setProperty('--height', `-${dropdownHeight}px`);
  dropdown.classList.toggle('open-up', shouldOpenUp);
  dropdown.classList.toggle('open-down', !shouldOpenUp);
}

function buildButton(data) {
  const { currentYear, monthName } = data;
  const calendarIcon = createElement('img', { src: '/aemedge/icons/calendar.svg' });
  const spanCalendarIcon = createElement('span', { class: 'icon icon-calendar' }, calendarIcon);
  const spanSelected = createElement('span', { class: 'selected-content' }, `${monthName} ${currentYear}`);
  const button = createElement('button', {
    class: 'month-selector-button',
    'aria-haspopup': true,
    'aria-expanded': false,
    type: 'button',
  }, spanSelected, spanCalendarIcon);
  button.id = 'month-selector-button';
  button.addEventListener('click', toggleMonthSelector);
  return button;
}

async function buildMonthSelector(data, button, callback, prevBtn, nextBtn) {
  const monthNames = [
    'January', 'Jan',
    'February', 'Feb',
    'March', 'Mar',
    'April', 'Apr',
    'May', 'May',
    'June', 'Jun',
    'July', 'Jul',
    'August', 'Aug',
    'September', 'Sep',
    'October', 'Oct',
    'November', 'Nov',
    'December', 'Dec',
  ];
  const monthLabels = await Promise.all(monthNames.map(i18n));
  const months = Array.from({ length: 12 }, (_, i) => {
    const fullName = monthLabels[i * 2];
    const shortName = monthLabels[i * 2 + 1];
    const span = createElement('span', { 'data-month': String(i), 'data-month-name': fullName }, shortName);
    return createElement('div', { class: 'month-selector-month' }, span);
  });
  months[data.currentMonth].children[0].classList.add('month-selected');
  months.forEach((month) => {
    month.children[0].addEventListener('click', (e) => {
      const { month: targetMonth, monthName } = e.target.dataset;
      data.currentMonth = parseInt(targetMonth, 10);
      data.monthName = monthName;
      data.currentYear = data.selectedYear;
      months.forEach((monthInternal) => {
        monthInternal.children[0].classList.remove('month-selected');
      });
      months[data.currentMonth].children[0].classList.add('month-selected');
      button.setAttribute('aria-expanded', false);
      button.querySelector('.selected-content').textContent = `${monthName} ${data.currentYear}`;
      callback(data.currentYear, data.currentMonth + 1);
    });
  });
  const monthsWrapper = createElement('div', { class: 'month-selector-months-wrapper' }, months);
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (data.currentMonth === 0) {
        data.currentMonth = 11;
        data.currentYear -= 1;
      } else {
        data.currentMonth -= 1;
      }
      const month = months[data.currentMonth].children[0];
      const { monthName } = month.dataset;
      data.monthName = monthName;
      months.forEach((monthInternal) => {
        monthInternal.children[0].classList.remove('month-selected');
      });
      month.classList.add('month-selected');
      button.querySelector('.selected-content').textContent = `${monthName} ${data.currentYear}`;
      callback(data.currentYear, data.currentMonth + 1);
      spanYear.textContent = data.currentYear;
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (data.currentMonth === 11) {
        data.currentMonth = 0;
        data.currentYear += 1;
      } else {
        data.currentMonth += 1;
      }
      const month = months[data.currentMonth].children[0];
      const { monthName } = month.dataset;
      data.monthName = monthName;
      months.forEach((monthInternal) => {
        monthInternal.children[0].classList.remove('month-selected');
      });
      month.classList.add('month-selected');
      button.querySelector('.selected-content').textContent = `${monthName} ${data.currentYear}`;
      callback(data.currentYear, data.currentMonth + 1);
      spanYear.textContent = data.currentYear;
    });
  }
  return monthsWrapper;
}

function buildYearSelector(data, changeYearCallback) {
  spanYear.append(data.currentYear.toString());
  const chevronLeft = createElement('img', { src: '/aemedge/icons/chevron-left.svg' });
  const spanChevronLeft = createElement('span', { class: 'icon icon-chevron-left' }, chevronLeft);
  spanChevronLeft.addEventListener('click', () => {
    data.selectedYear -= 1;
    spanYear.textContent = data.selectedYear;
    changeYearCallback();
  });
  const chevronRight = createElement('img', { src: '/aemedge/icons/chevron-right.svg' });
  const spanChevronRight = createElement('span', { class: 'icon icon-chevron-right' }, chevronRight);
  spanChevronRight.addEventListener('click', () => {
    data.selectedYear += 1;
    spanYear.textContent = data.selectedYear;
    changeYearCallback();
  });
  const yearWrapper = createElement('div', { class: 'month-selector-year-wrapper' }, spanChevronLeft, spanYear, spanChevronRight);
  return yearWrapper;
}

async function buildDropdown(data, button, callback, prevBtn, nextBtn) {
  const monthsWrapper = await buildMonthSelector(data, button, callback, prevBtn, nextBtn);
  const yearWrapper = buildYearSelector(data, () => {
    const months = monthsWrapper.querySelectorAll('.month-selector-month');
    months.forEach((monthInternal) => {
      if (data.currentYear !== data.selectedYear
        || data.currentMonth !== parseInt(monthInternal.children[0].dataset.month, 10)) {
        monthInternal.children[0].classList.remove('month-selected');
      } else {
        monthInternal.children[0].classList.add('month-selected');
      }
    });
  });
  const dropdown = createElement('div', {
    class: 'month-selector-dropdown',
    'aria-labelledby': 'month-selector-button',
    role: 'menu',
  }, yearWrapper, monthsWrapper);
  document.addEventListener('click', closeOnDocClick);
  window.addEventListener('scroll', togglePosition);
  return dropdown;
}

export default async function createMonthSelector(initialDate, callback, prevBtn, nextBtn) {
  loadCSS('/aemedge/styles/month-selector.css');
  const data = {
    selectedYear: initialDate.get('year'),
    currentYear: initialDate.get('year'),
    currentMonth: initialDate.get('month'),
    monthName: initialDate.format('MMMM'),
  };
  const button = buildButton(data);
  const dropdown = await buildDropdown(data, button, callback, prevBtn, nextBtn);
  return createElement('div', { class: 'month-selector-container' }, button, dropdown);
}
