export default function decorate(block) {
  // Helper: Extracts widget configuration from the authored block
  function extractWidgetConfig(blockEl) {
    const divs = blockEl.querySelectorAll(':scope > div');

    const script = divs[0]?.children[1]?.textContent.trim();
    const height = divs[1]?.children[1]?.textContent.trim();
    let config = {};

    const codeBlock = divs[2]?.querySelector('pre > code');
    if (codeBlock) {
      try {
        config = JSON.parse(codeBlock.textContent);
      } catch (err) {
        // Suppress the error
      }
    }

    // Remove config divs from DOM once consumed
    divs[0]?.remove();
    divs[1]?.remove();

    return {
      script,
      height,
      config,
    };
  }

  // Helper function to create placeholders needed for the widget script to decorate
  function createWidgetElements(script, config) {
    // CREATE WIDGET DOM : container
    const containerEl = document.createElement('div');
    containerEl.className = 'tradingview-widget-container';

    // CREATE WIDGET DOM : placeholder
    const widgetEl = document.createElement('div');
    widgetEl.className = 'tradingview-widget-container__widget';

    // CREATE WIDGET DOM : copyright link
    const copyrightEl = document.createElement('div');
    copyrightEl.className = 'tradingview-widget-copyright';
    copyrightEl.innerHTML = `
    <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
      <span class="blue-text">Track all markets on TradingView</span>
    </a>
    `;

    // CREATE WIDGET DOM : the script tag
    const scriptEl = document.createElement('script');
    scriptEl.type = 'text/javascript';
    const scriptPrefix = 'https://s3.tradingview.com/external-embedding/';
    const scriptFilename = script;
    scriptEl.src = `${scriptPrefix}${scriptFilename}`;// Combines to full URL
    scriptEl.async = true;
    scriptEl.textContent = JSON.stringify(config);

    // CREATE WIDGET DOM : Append widget elements and add container to block
    containerEl.appendChild(widgetEl);
    containerEl.appendChild(copyrightEl);
    containerEl.appendChild(scriptEl);

    return containerEl;
  }

  // Extract widget configuration
  const widgetConfig = extractWidgetConfig(block);
  // Create widget elements needed for its script to decorate
  const widgetEl = createWidgetElements(widgetConfig.script, widgetConfig.config);

  // add event listener for intersection observer when block is in view port
  const options = {
    root: null,
    rootMargin: '20%',
    threshold: 1.0,
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        block.replaceChildren(widgetEl);
        observer.unobserve(block);
      }
    });
  }, options);

  // observe the block
  observer.observe(block);

  // Apply the specified height
  block.style.height = widgetConfig.height;
}
