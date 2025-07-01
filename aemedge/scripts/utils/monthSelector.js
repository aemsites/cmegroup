import { loadCSS } from '../aem.js';
import { createElement } from '../utils.js';

function toggleMonthSelector(e) {
  const button = e.target.closest('button');
  const expanded = button.getAttribute('aria-expanded');
  button.setAttribute('aria-expanded', !(expanded === 'true'));
}

function closeOnDocClick(e) {
  const button = document.querySelector('button.month-selector-button[aria-expanded=true]');
  if (button && !button.contains(e.target)) {
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

export default function createMonthSelector() {
  loadCSS('/aemedge/styles/month-selector.css');

  const calendarIcon = createElement('img', { src: '/aemedge/icons/calendar.svg' });
  const spanCalendarIcon = createElement('span', { class: 'icon icon-calendar' }, calendarIcon);
  const spanSelected = createElement('span', { class: 'selected-content' }, 'September 2025');
  const button = createElement('button', {
    class: 'month-selector-button',
    'aria-haspopup': true,
    'aria-expanded': false,
    type: 'button',
  }, spanSelected, spanCalendarIcon);

  const months = [
    createElement('div', { class: 'month-selector-month' }, 'Jan'),
    createElement('div', { class: 'month-selector-month' }, 'Feb'),
    createElement('div', { class: 'month-selector-month' }, 'Mar'),
    createElement('div', { class: 'month-selector-month' }, 'Apr'),
    createElement('div', { class: 'month-selector-month' }, 'May'),
    createElement('div', { class: 'month-selector-month' }, 'Jun'),
    createElement('div', { class: 'month-selector-month' }, 'Jul'),
    createElement('div', { class: 'month-selector-month' }, 'Aug'),
    createElement('div', { class: 'month-selector-month month-selected' }, 'Sep'),
    createElement('div', { class: 'month-selector-month' }, 'Oct'),
    createElement('div', { class: 'month-selector-month' }, 'Nov'),
    createElement('div', { class: 'month-selector-month' }, 'Dec'),
  ];
  const monthsWrapper = createElement('div', { class: 'month-selector-months-wrapper' }, months);

  const chevronLeft = createElement('img', { src: '/aemedge/icons/chevron-left.svg' });
  const spanChevronLeft = createElement('span', { class: 'icon icon-chevron-left' }, chevronLeft);
  const spanYear = createElement('span', { class: 'year-content' }, '2025');
  const chevronRight = createElement('img', { src: '/aemedge/icons/chevron-right.svg' });
  const spanChevronRight = createElement('span', { class: 'icon icon-chevron-right' }, chevronRight);
  const yearWrapper = createElement('div', { class: 'month-selector-year-wrapper' }, spanChevronLeft, spanYear, spanChevronRight);

  const dropdown = createElement('div', {
    class: 'month-selector-dropdown',
    'aria-labelledby': 'month-selector-button',
    role: 'menu',
  }, yearWrapper, monthsWrapper);
  button.id = 'month-selector-button';
  button.addEventListener('click', toggleMonthSelector);
  document.addEventListener('click', closeOnDocClick);
  window.addEventListener('scroll', togglePosition);
  return createElement('div', { class: 'month-selector-container' }, button, dropdown);
}
