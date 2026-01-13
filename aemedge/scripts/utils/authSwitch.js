import { createElement, i18n } from '../utils.js';
import { authentication } from '../modules/Authentication.js';
import { createSimpleAuthTooltip } from './authTooltip.js';

let loggedIn = false;

function startDrag(e, marker) {
  marker.classList.add('pressed');
  const endDrag = () => {
    marker.classList.remove('pressed');
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
  };
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

function click(e, authSwitch, callback) {
  e.preventDefault();
  if (loggedIn) {
    let checked = authSwitch.dataset.enabled === 'true';
    checked = !checked;
    authSwitch.dataset.enabled = checked ? 'true' : 'false';
    const status = authSwitch.querySelector('.status-text');
    status.innerText = checked ? status.dataset.onText : status.dataset.offText;
    callback(checked);
  }
}

async function buildSwitch(callback) {
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
  const authSwitch = createElement('div', {
    class: 'auth-switch',
    'data-enabled': 'false',
  }, lockIconSpan, slider, statusText);
  slider.addEventListener('mousedown', (e) => startDrag(e, marker));
  slider.addEventListener('touchstart', (e) => startDrag(e, marker));
  slider.addEventListener('click', (e) => click(e, authSwitch, callback));
  return authSwitch;
}

async function updateSwitchLoggedIn(authSwitch) {
  if (loggedIn) {
    const icon = authSwitch.querySelector('span.icon-lock');
    icon.classList.add('hidden');
  } else {
    const slider = authSwitch.querySelector('.slider');
    const text = await i18n('Login or create a free account to stream product quotes data.');
    createSimpleAuthTooltip(slider, text);
  }
}

/* eslint-disable import/prefer-default-export */
export async function createAuthSwitch(callback) {
  const { authenticationData } = authentication;
  const authSwitch = await buildSwitch(callback);
  authenticationData.loginPromise.then(() => {
    loggedIn = authenticationData.isLoggedIn;
    updateSwitchLoggedIn(authSwitch);
  });
  return authSwitch;
}
