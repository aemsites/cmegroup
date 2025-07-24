/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

function setDefaultDateTime() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  document.getElementById('date-picker').value = dateStr;
  document.getElementById('time-picker').value = timeStr;
}

function toLocalISO(date, time) {
  if (!date || !time) return '';
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  const dt = new Date(year, month - 1, day, hour, minute);
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  const offset = -dt.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMinutes = pad(absOffset % 60);
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}.${pad(dt.getMilliseconds(), 3)}${sign}${offsetHours}:${offsetMinutes}`
  );
}

function getTimeZoneAbbr(date = new Date()) {
  return date.toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ').pop();
}

function showTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const abbr = getTimeZoneAbbr();
  document.getElementById('timezone-info').textContent = `Timezone: ${tz} (${abbr})`;
}

function updatePreview() {
  const date = document.getElementById('date-picker').value;
  const time = document.getElementById('time-picker').value;
  document.getElementById('preview').textContent = toLocalISO(date, time) || '—';
}

setDefaultDateTime();
showTimezone();
updatePreview();

document.getElementById('date-picker').addEventListener('input', updatePreview);
document.getElementById('time-picker').addEventListener('input', updatePreview);

document.getElementById('use').addEventListener('click', async () => {
  const date = document.getElementById('date-picker').value;
  const time = document.getElementById('time-picker').value;
  const isoString = toLocalISO(date, time);
  const { actions } = await DA_SDK;
  actions.sendText(isoString);
  actions.closeLibrary();
});
