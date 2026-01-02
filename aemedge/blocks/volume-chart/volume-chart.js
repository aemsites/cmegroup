import {
  setupBillboardLibs, createElement, setupDayjsLibs, i18n, debounce, getCdtDate,
} from '../../scripts/utils.js';
import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata, getVolumeLastTotals } from '../../scripts/utils/product.js';
import createChart from './chart.js';

let daysToShow = window.innerWidth <= 768 ? 7 : 15;
let productMetadata;
let prodId;

const [
  datei18n,
  futurei18n,
  optionsi18n,
  dailyi18n,
] = await Promise.all([
  i18n('DATE'),
  i18n('Future Volume'),
  i18n('Options Volume'),
  i18n('Daily Volume'),
]);

async function getProductInfo() {
  productMetadata = await getProductMetadata();
  prodId = productMetadata?.productId || getMetadata('product-id') || 300;
}

async function getData() {
  const data = await getVolumeLastTotals(prodId, daysToShow);
  return data;
}

async function createComponent(title, lastUpdated) {
  const addLastUpdated = false;
  const wrapper = createElement('div');
  const header = createElement('div');

  const titleSpan = createElement('span', { class: 'title' });
  titleSpan.textContent = `${title}`;
  const updatedSpan = createElement('span');
  updatedSpan.textContent = `Last Updated: ${lastUpdated}`;

  if (addLastUpdated) {
    header.append(titleSpan, document.createTextNode(' '), updatedSpan);
  } else {
    header.append(titleSpan);
  }

  const chartDiv = createElement('div', { id: 'chart', class: 'chart-container' });
  chartDiv.style.position = 'relative';

  const footer = createElement('div', { class: 'footer' });
  const dateLabel = createElement('div', { class: 'date-label' });
  dateLabel.textContent = datei18n;

  const legends = createElement('div', { class: 'legends' });
  const futureVolume = createElement('span');
  futureVolume.textContent = futurei18n;
  const optionsVolume = createElement('span');
  optionsVolume.textContent = optionsi18n;

  legends.append(futureVolume, optionsVolume);
  footer.append(dateLabel, legends);
  wrapper.append(header, chartDiv, footer);

  return wrapper;
}

function lastTotalsTooltipTemplate(item) {
  const volumes = Array.isArray(item.volume) ? item.volume : [];
  let html = '<div class="info-container">';
  html += `<div class="info-date">${item.date || ''}</div>`;
  volumes.forEach(({ title, value }, index) => {
    html += `
      <div class="info-row">
        <p><span class="legend l${index}"></span>${title}</p>
        <p>${value}</p>
      </div>
    `;
  });
  html += '</div><div class="arrow"></div>';
  return html;
}

export function lastTotalsChartConfig({
  data,
  onPosition,
  onResize,
  styleAxis,
  showTooltip,
  ungroupedContentsData,
  categories = [],
}) {
  const formatNumbers = (x) => (Number.isNaN(x) ? '-' : Number(x).toLocaleString('en-US'));
  const smallDateFormat = (x) => dayjs(x).format('DD MMM');
  const mediumDateFormat = (x) => dayjs(x).format('MMMM DD');

  return {
    size: { height: 480 },
    data: {
      onover: showTooltip,
      onclick: showTooltip,
      json: data,
      keys: { x: 'formattedDate', value: ['futureVolume', 'optionVolume'] },
      type: 'bar',
      groups: [['futureVolume', 'optionVolume']],
      order: 'asc',
      names: { futureVolume: futurei18n, optionVolume: optionsi18n },
      colors: { futureVolume: '#1f3374', optionVolume: '#3cc8ff' },
    },
    bar: { width: { ratio: 0.85, max: 36.65 } },
    padding: {
      top: 30,
      right: 0,
      bottom: 110,
      left: 60,
    },
    legend: { show: false },
    point: { show: false },
    axis: {
      x: {
        type: 'category',
        tick: {
          show: false,
          culling: false,
          rotate: 90,
          multiline: false,
          format: (x, name) => smallDateFormat(name),
        },
      },
      y: { tick: { show: false, format: formatNumbers } },
    },
    tooltip: {
      grouped: false,
      doNotHide: true,
      contents: ungroupedContentsData(([futureVolume, optionVolume]) => lastTotalsTooltipTemplate({
        date: mediumDateFormat(categories[futureVolume.x] || ''),
        volume: [
          { title: futureVolume.name, value: formatNumbers(futureVolume.value) },
          { title: optionVolume.name, value: formatNumbers(optionVolume.value) },
        ],
      })),
      position: onPosition,
    },
    onrendered: styleAxis,
    onresize: onResize,
  };
}

export default function decorate(block) {
  block.textContent = '';
  init(block);
}

function init(block) {
  let chart;
  let chartData = [];
  let lastUpdated;

  Promise.all([
    setupDayjsLibs(),
    setupBillboardLibs(),
    createComponent(dailyi18n, ''),
  ]).then(([, , wrapper]) => {
    block.append(wrapper);
    const container = block.querySelector('#chart');

    const labels = { y1: 'VOL', y2: '' };

    const styleAxis = () => {
      const { y1 = '', y2 = '' } = labels;

      const yAxis = Array.from(container.querySelectorAll('.bb-axis-y .tick text tspan'));
      const y2Axis = Array.from(container.querySelectorAll('.bb-axis-y2 .tick text tspan'));

      if (yAxis.length && y1) {
        const label = yAxis.pop();
        label.textContent = y1;
        label.classList.add('y1-label');
      }

      if (y2Axis.length && y2) {
        const label = y2Axis.pop();
        label.textContent = y2;
        label.classList.add('y2-label');
      }
    };

    async function loadAndUpdateChart() {
      await getProductInfo();
      const data = await getData();

      if (!prodId || !data) {
        // eslint-disable-next-line no-console
        console.error('VolumeChart => No ProductId or Data');
        return;
      }

      chartData = data.data.slice(-daysToShow);
      lastUpdated = `${getCdtDate(data?.lastUpdated).format('DD MMM YYYY hh:mm:ss A')} CT`;

      const updatedSpan = block.querySelector('.last-updated');
      if (updatedSpan) updatedSpan.textContent = `Last Updated: ${lastUpdated}`;

      if (chart) {
        chart.destroy();
      }

      chart = createChart({
        container,
        data: chartData,
        dataSize: chartData.length,
        chartConfig: (params) => lastTotalsChartConfig({
          ...params,
          data: chartData,
          categories: chartData.map((d) => d.formattedDate),
          onrendered: styleAxis,
        }),
        chartUpdate: null,
        labels,
        tooltipTop: null,
      });
    }

    function resizeHandle() {
      daysToShow = window.innerWidth <= 768 ? 7 : 15;
      loadAndUpdateChart();
    }

    window.addEventListener('resize', debounce(resizeHandle, 250));

    loadAndUpdateChart();
    setInterval(loadAndUpdateChart, 60000);
  });
}
