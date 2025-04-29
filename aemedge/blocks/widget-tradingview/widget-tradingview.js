export default function decorate(block) {
  // AUTHORED BLOCK VALUE
  let widgetScript = null;
  let widgetHeight = null;
  let widgetJSONConfig = {};

  // PROCESS AUTHORED BLOCK VALUES
  const divs = block.querySelectorAll(':scope > div');
  // WIDGET CONFIG - Script
  const widgetTypeDiv = divs[0];
  widgetScript = widgetTypeDiv.children[1].textContent.trim();
  widgetTypeDiv.remove();
  // WIDGET CONFIG - Height
  const heightDiv = divs[1];
  widgetHeight = heightDiv.children[1].textContent.trim();
  heightDiv.remove();
  // WIDGET CONFIG - JSON Config
  const widgetDiv = divs[2];
  const codeBlock = widgetDiv.querySelector('pre > code');
  if (codeBlock) {
    try {
      widgetJSONConfig = JSON.parse(codeBlock.textContent);
    } catch (err) {
      console.error('Invalid JSON in <code> block:', err);
    }
  }

  // CREATE WIDGET DOM : container
  const container = document.createElement('div');
  container.className = 'tradingview-widget-container';

  // CREATE WIDGET DOM : placeholder
  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';

  // CREATE WIDGET DOM : copyright link
  const copyright = document.createElement('div');
  copyright.className = 'tradingview-widget-copyright';
  copyright.innerHTML = `
  <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
    <span class="blue-text">Track all markets on TradingView</span>
  </a>
`;

  // CREATE WIDGET DOM : the script tag
  const script = document.createElement('script');
  script.type = 'text/javascript';
  const scriptPrefix = 'https://s3.tradingview.com/external-embedding/';
  const scriptFilename = widgetScript;
  script.src = `${scriptPrefix}${scriptFilename}`;// Combines to full URL
  script.async = true;
  script.textContent = JSON.stringify(widgetJSONConfig);

  // CREATE WIDGET DOM : Append widget elements and add container to block
  container.appendChild(widget);
  container.appendChild(copyright);
  container.appendChild(script);
  widgetDiv.replaceWith(container);

  // SET BLOCK HEIGHT
  block.style.height = widgetHeight;
}
