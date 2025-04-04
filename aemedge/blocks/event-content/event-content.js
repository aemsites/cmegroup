import getEventData, { getEventReport } from '../../scripts/utils/events.js';
import { loadCSS } from '../../scripts/aem.js';
import { i18n, createElement } from '../../scripts/utils.js';

function buildAddToCalendar(block, eventData) {
  block.append(createElement('div', null, eventData.title));
}

function buildTable(block, eventData) {
  block.append(createElement('div', null, eventData.title));
}

function buildReports(block, eventData) {
  const { reports } = eventData;
  if (reports && reports.length) {
    const wrapper = createElement('div', null);
    block.append(wrapper);
    loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
    reports.forEach(async (report) => {
      const container = createElement('div', { class: 'table' });
      container.innerHTML = await getEventReport(report.report);
      wrapper.append(container);
    });
  }
}

async function buildHighlights(block, eventData) {
  const { highlights } = eventData;
  if (highlights) {
    const wrapper = createElement('div', null);
    block.append(wrapper);
    const h3Label = await i18n('Highlights');
    const h3 = createElement('h3', null, h3Label);
    wrapper.append(h3);
    const container = createElement('div', null);
    container.innerHTML = highlights;
    wrapper.append(container);
  }
}

async function buildConsensusNotes(block, eventData) {
  const { consensusNotes } = eventData;
  if (consensusNotes) {
    const wrapper = createElement('div', null);
    block.append(wrapper);
    const h3Label = await i18n('Market Consensus Before Announcement');
    const h3 = createElement('h3', null, h3Label);
    wrapper.append(h3);
    const container = createElement('div', null);
    container.innerHTML = consensusNotes;
    wrapper.append(container);
  }
}

async function buildDefinition(block, eventData) {
  const { definition } = eventData;
  if (definition) {
    const wrapper = createElement('div', null);
    block.append(wrapper);
    const h3Label = await i18n('Definition');
    const h3 = createElement('h3', null, h3Label);
    wrapper.append(h3);
    const container = createElement('div', null);
    container.innerHTML = definition;
    wrapper.append(container);
  }
}

async function buildDescription(block, eventData) {
  const { description } = eventData;
  if (description) {
    const wrapper = createElement('div', null);
    block.append(wrapper);
    const h3Label = await i18n('Description');
    const h3 = createElement('h3', null, h3Label);
    wrapper.append(h3);
    const container = createElement('div', null);
    container.innerHTML = description;
    wrapper.append(container);
  }
}

function buildCharts(block, eventData) {
  block.append(createElement('div', null, eventData.title));
}

/**
 * Main decorate function
 */
export default async function decorate(block) {
  const eventData = await getEventData();
  buildAddToCalendar(block, eventData);
  buildTable(block, eventData);
  buildReports(block, eventData);
  buildHighlights(block, eventData);
  buildConsensusNotes(block, eventData);
  buildDefinition(block, eventData);
  buildDescription(block, eventData);
  buildCharts(block, eventData);
}
