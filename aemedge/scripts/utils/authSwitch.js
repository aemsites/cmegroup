import { createElement, i18n } from '../utils.js';
import { authentication } from '../modules/Authentication.js';
// import { createAuthTooltip } from './authTooltip.js';

let checked = false;

function endDrag(e) {
  e.preventDefault();
  const marker = document.querySelector('.marker.pressed');
  if (marker) {
    marker.classList.remove('pressed');
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
    checked = !checked;
    const slider = marker.parentElement;
    slider.classList.toggle('checked', checked);
    const status = slider.parentElement.querySelector('.status-text');
    status.innerText = checked ? status.dataset.onText : status.dataset.offText;
  }
}

function startDrag(e) {
  e.preventDefault();
  const marker = e.currentTarget;
  marker.classList.add('pressed');
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

async function buildSwitch() {
  const [
    offLabel,
    onLabel,
  ] = await Promise.all([
    i18n('Auto-refresh is off'),
    i18n('Auto-refresh is on'),
  ]);
  const lockIcon = createElement('img', { src: '/aemedge/icons/lock.svg' });
  const lockIconSpan = createElement('span', { class: 'icon icon-lock' }, lockIcon);
  const marker = createElement('div', { class: 'marker' });
  const slider = createElement('div', { class: 'slider' }, marker);
  const statusText = createElement('span', {
    class: 'status-text',
    'data-off-text': offLabel,
    'data-on-text': onLabel,
  }, offLabel);
  const authSwitch = createElement('div', { class: 'auth-switch' }, lockIconSpan, slider, statusText);
  marker.addEventListener('mousedown', startDrag);
  marker.addEventListener('touchstart', startDrag);
  return authSwitch;
}

function updateSwitchLoggedIn(authSwitch) {
  const icon = authSwitch.querySelector('span.icon-lock');
  icon.classList.add('hidden');
}

/* eslint-disable import/prefer-default-export */
export async function createAuthSwitch() {
  const { authenticationData } = authentication;
  const authSwitch = await buildSwitch();
  authenticationData.loginPromise.then(() => {
    if (authenticationData.isLoggedIn) {
      updateSwitchLoggedIn(authSwitch);
    }
  });
  return authSwitch;
}
