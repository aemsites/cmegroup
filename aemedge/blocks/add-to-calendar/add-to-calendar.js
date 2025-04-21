import { loadScript, getMetadata } from '../../scripts/aem.js';
import { createElement, i18n } from '../../scripts/utils.js';

async function buildButton(block) {
  const description = getMetadata('description');
  const label = await i18n('Add to calendar');
  const name = document.title;
  const icalfilename = name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDate = new Date(getMetadata('start-date'));
  const endDate = new Date(getMetadata('end-date'));
  const button = createElement('add-to-calendar-button', {
    name,
    label,
    description,
    hideiconbutton: 'true',
    hidecheckmark: 'true',
    buttonstyle: 'custom',
    customcss: '/aemedge/blocks/add-to-calendar/add-to-calendar.css',
    options: '["Apple","Google","iCal","Microsoft365","MicrosoftTeams","Outlook.com","Yahoo"]',
    startdate: startDate.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    enddate: endDate.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    starttime: startDate.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
    endtime: endDate.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
    icalfilename,
    timezone,
  });
  block.append(button);
  loadScript('/aemedge/scripts/third-party/add-to-calendar-button@2.js');
}

export default async function decorate(block) {
  buildButton(block);
}
