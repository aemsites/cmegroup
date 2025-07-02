import { loadCSS } from '../aem.js';
import { createElement } from '../utils.js';

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
  const isDesktop = window.innerWidth > 993;
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

function buildMonthSelector(data, button) {
  const months = [
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '0', 'data-month-name': 'January' }, 'Jan')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '1', 'data-month-name': 'February' }, 'Feb')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '2', 'data-month-name': 'March' }, 'Mar')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '3', 'data-month-name': 'April' }, 'Apr')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '4', 'data-month-name': 'May' }, 'May')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '5', 'data-month-name': 'June' }, 'Jun')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '6', 'data-month-name': 'July' }, 'Jul')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '7', 'data-month-name': 'August' }, 'Aug')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '8', 'data-month-name': 'September' }, 'Sep')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '9', 'data-month-name': 'October' }, 'Oct')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '10', 'data-month-name': 'November' }, 'Nov')),
    createElement('div', { class: 'month-selector-month' }, createElement('span', { 'data-month': '11', 'data-month-name': 'December' }, 'Dec')),
  ];
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
    });
  });
  const monthsWrapper = createElement('div', { class: 'month-selector-months-wrapper' }, months);
  return monthsWrapper;
}

function buildYearSelector(data, changeYearCallback) {
  const spanYear = createElement('span', { class: 'year-content' }, data.currentYear.toString());
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

function buildDropdown(data, button) {
  const monthsWrapper = buildMonthSelector(data, button);
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

export default function createMonthSelector(initialDate) {
  loadCSS('/aemedge/styles/month-selector.css');
  const data = {
    selectedYear: initialDate.get('year'),
    currentYear: initialDate.get('year'),
    currentMonth: initialDate.get('month'),
    monthName: initialDate.format('MMMM'),
  };
  const button = buildButton(data);
  const dropdown = buildDropdown(data, button);
  return createElement('div', { class: 'month-selector-container' }, button, dropdown);
}
