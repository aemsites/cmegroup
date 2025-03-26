export async function decorateAssetsPlugin(container) {
  // Create container structure with iframe and hidden textarea for copying
  container.innerHTML = `
    <div id="asset-picker-container">
      <iframe 
        id="asset-picker-frame" 
        src="http://localhost:4502/aem/assetpicker.html"
        frameborder="0">
      </iframe>
      <textarea id="copy-buffer" style="position: absolute; left: -9999px;"></textarea>
    </div>
  `;

  // Add message event listener for asset picker response
  window.addEventListener('message', (event) => {
    // Verify message origin for security
    if (event.origin !== 'http://localhost:4502') return;

    try {
      const message = JSON.parse(event.data);

      if (message.data && Array.isArray(message.data)) {
        // Transform localhost URLs to production URLs
        const assets = message.data.map((asset) => {
          const path = asset.url.replace('http://localhost:4502', 'https://www.cmegroup.com');
          return path;
        });

        const copyBuffer = container.querySelector('#copy-buffer');
        copyBuffer.value = assets.join('\n');
        copyBuffer.select();
        document.execCommand('copy');

        console.log('Copied production assets to clipboard:', assets);
      }
    } catch (error) {
      console.error('Error handling asset selection:', error);
    }
  });
}

export async function decorate(container) {
  decorateAssetsPlugin(container);
}

export default {
  title: 'Assets',
};
