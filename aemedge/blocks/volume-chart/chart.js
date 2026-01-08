import {
  getClosestClassNameCount,
  addMutationObserver,
  getNodeDOMRect,
  mergeDOMRect,
} from '../../scripts/utils.js';

export default function createChart({
  container,
  data,
  dataSize,
  chartConfig,
  chartUpdate,
  labels = {},
  tooltipTop,
  setChart,
}) {
  if (!container || !window.bb || !chartConfig) {
    // eslint-disable-next-line no-console
    console.warn('Invalid chart parameters');
    return null;
  }

  let chart;
  let tooltip;
  let yAxisLabelMO = null;
  let y2AxisLabelMO = null;

  const getData = () => {
    if (Array.isArray(data) && dataSize) {
      return data.slice(-dataSize);
    }
    return data;
  };

  const hideTooltip = (e = {}) => {
    if (!tooltip) return;
    const clickCapture = tooltip.querySelector('.click-capture');
    tooltip.classList.add('hidden');

    if (clickCapture && e.type !== 'mouseleave') {
      clickCapture.classList.remove('remove');
    }
  };

  const removeClickCapture = () => {
    if (!tooltip) return;
    const clickCapture = tooltip.querySelector('.click-capture');
    if (clickCapture && !clickCapture.classList.contains('remove')) {
      setTimeout(() => clickCapture.classList.add('remove'), 250);
    }
  };

  const showTooltip = () => {
    if (!tooltip) return;
    tooltip.classList.remove('hidden');
    removeClickCapture();
  };

  const handleHideTooltip = (e) => {
    const { type, target, relatedTarget } = e;
    if (!relatedTarget || !relatedTarget.getAttribute) return;

    const cssClass = relatedTarget.getAttribute('class');
    const shouldHide = !cssClass
      || cssClass.indexOf('bb-tooltip-container') === -1
      || ['arrow', 'domain'].includes(cssClass);

    if (type === 'mouseleave' && shouldHide) {
      hideTooltip(e);
    }

    if (
      type === 'mousedown'
      && target
      && !target.closest('.bb-event-rect')
      && !target.closest('.bb-tooltip-container')
    ) {
      hideTooltip(e);
    }
  };

  const onResize = () => hideTooltip();

  async function getBarDOMRect(elements) {
    const rects = elements
      .map(({ id, index }) => container.querySelector(
        `.bb-chart-bars .bb-target-${id} .bb-shape-${index}`,
      ))
      .filter(Boolean)
      .map(getNodeDOMRect);

    if (!rects.length) return null;
    return rects.reduce(mergeDOMRect);
  }

  async function onPosition(d, tooltipWidth, tooltipHeight) {
    const barRect = await getBarDOMRect(d);
    if (!barRect) return null;

    const { x, width, height } = barRect;

    const chartSVG = container.querySelector('svg g');
    if (!chartSVG) return null;

    const val = chartSVG.getAttribute('transform') || '';
    const [, offsetX = 0] = val.match(/translate\((\d*\.?\d*)/) || [];

    let left = Math.ceil(
      x + Number(offsetX) + (width - tooltipWidth) / 2,
    );

    const chartArea = container.querySelector('.bb-chart');
    if (!chartArea) return null;

    const arrow = container.querySelector('.bb-tooltip-container .arrow');
    if (arrow) {
      const chartWidth = chartArea.getBoundingClientRect().width;
      const diff = x + (width + tooltipWidth) / 2 - chartWidth;

      if (diff > 0) {
        left -= diff;
        arrow.style.left = `${Math.ceil(tooltipWidth / 2) - 10 + diff}px`;
      } else {
        arrow.style.left = '';
      }
    }

    let top = tooltipTop;
    if (!top) {
      const chartHeight = chartArea.getBoundingClientRect().height;
      top = chartHeight - tooltipHeight - height;
    }

    if (tooltip) {
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }

    return { top, left };
  }

  const styleAxis = () => {
    const { y1 = '', y2 = '' } = labels;

    const yAxis = Array.from(
      container.querySelectorAll('.bb-axis-y .tick text tspan'),
    );
    const y2Axis = Array.from(
      container.querySelectorAll('.bb-axis-y2 .tick text tspan'),
    );

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

    const fixAxisLabel = (el) => {
      el.removeAttribute('transform');
      el.setAttribute('dy', '-30');
      return addMutationObserver(el, ([{ target }]) => {
        if (target.getAttribute('dy') !== '-30') {
          target.setAttribute('dy', '-30');
        }
      });
    };

    const yLabel = container.querySelector('.bb-axis-y-label');
    if (yLabel) yAxisLabelMO = fixAxisLabel(yLabel);

    const y2Label = container.querySelector('.bb-axis-y2-label');
    if (y2Label) {
      y2Label.setAttribute('dx', '20');
      y2AxisLabelMO = fixAxisLabel(y2Label);
    }
  };

  const ungroupedContentsData = (callback) => {
    const getDataAtIndex = (chartInstance, index) => chartInstance
      .data()
      .map(({ values }) => values.find((v) => v.index === index));

    return ([{ index }], ...rest) => callback(getDataAtIndex(chart, index), ...rest);
  };

  const config = chartConfig({
    data: getData(),
    onPosition,
    onResize,
    showTooltip,
    ungroupedContentsData,
  });

  chart = window.bb.generate({
    bindto: container,
    ...config,
    onrendered: () => {
      styleAxis();
      if (config.onrendered) config.onrendered();
    },
  });

  if (setChart) setChart(chart);

  // eslint-disable-next-line prefer-destructuring
  tooltip = container.childNodes[1];
  if (tooltip) {
    tooltip.classList.add('hidden');
    tooltip.addEventListener('mouseleave', handleHideTooltip);
    tooltip.addEventListener('mouseenter', showTooltip);

    if (getClosestClassNameCount(tooltip, '.reverse') % 2) {
      tooltip.classList.add('reverse');
    }
  }

  document.addEventListener('mousedown', handleHideTooltip);

  return {
    chart,

    update(newData) {
      // eslint-disable-next-line no-param-reassign
      data = newData;
      if (!chart) return;
      const d = getData();
      if (d?.length) {
        chart.load(
          chartUpdate ? chartUpdate(d) : { json: d },
        );
      }
    },

    destroy() {
      document.removeEventListener('mousedown', handleHideTooltip);
      if (tooltip) {
        tooltip.removeEventListener('mouseleave', handleHideTooltip);
        tooltip.removeEventListener('mouseenter', showTooltip);
      }
      if (chart) chart.destroy();
      if (yAxisLabelMO) yAxisLabelMO.disconnect();
      if (y2AxisLabelMO) y2AxisLabelMO.disconnect();
    },
  };
}
