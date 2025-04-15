export default async function decorate(block) {
  // Allowlist of permitted iframe sources
  const ALLOWED_HOSTS = [
    'www.google.com',
    'www.cmegroup.com',
    'cmeg.co1.qualtrics.com',
    'html5-player.libsyn.com',
  ];
  // Block properties
  const PROP_TITLE = 'Title:';
  const PROP_URL = 'Url:';
  const PROP_HEIGHT = 'Height:';

  // Get the block properties
  function getBlockProperties() {
    const result = {};
    if (block) {
      const rows = block.querySelectorAll(':scope > div');

      rows.forEach((row) => {
        const columns = row.querySelectorAll(':scope > div');
        if (columns.length === 2) {
          const key = columns[0].innerText.trim();
          // Check if the value column contains a link
          const link = columns[1].querySelector('a');
          const value = link ? link.getAttribute('href') : columns[1].innerText.trim();
          result[key] = value;
        }
      });
    }
    return result;
  }
  const blockProperties = getBlockProperties();
  const PLACEHOLDER = 'IFRAME_TITLE_HERE';
  const iframeURL = blockProperties[PROP_URL];
  const iframeTitle = blockProperties[PROP_TITLE];
  const iframefixedHeight = blockProperties[PROP_HEIGHT];

  // Helper function to check if URL is allowed
  function isAllowedUrl(url) {
    try {
      const urlObj = new URL(url);
      // Only allow HTTPS URLs
      return (urlObj.protocol === 'https:')
        && ALLOWED_HOSTS.some((host) => urlObj.hostname.includes(host));
    } catch (e) {
      return false; // Invalid URL
    }
  }

  // Helper function to add warning message
  function addWarningMessage(msg) {
    block.classList.add('iframe-warning');
    const warningText = document.createElement('div');
    warningText.classList.add('iframe-warning-message');
    warningText.textContent = msg;
    block.appendChild(warningText);
  }

  // Helper function to get a meaningful title
  function getMeaningfulTitle() {
    return (!iframeTitle || iframeTitle === PLACEHOLDER)
      ? 'Content from ' + new URL(iframeURL).hostname
      : iframeTitle;
  }

  // Exit early if link is missing
  if (!iframeURL) {
    addWarningMessage('Warning: No URL provided for iframe source');
    return;
  }

  // Exit early if URL is not in allowlist
  if (!isAllowedUrl(iframeURL)) {
    addWarningMessage('Warning: Iframe source is not in allowed hosts list or is not HTTPS');
    return;
  }

  if (iframefixedHeight && !iframefixedHeight.match(/^(\d+)(px)?$/)) {
    addWarningMessage('Invalid height value. Please use a number followed by "px".');
    return;
  }

  // Create iframe element
  const iframe = document.createElement('iframe');
  if (iframefixedHeight) {
    iframe.height = iframefixedHeight;
  }
  iframe.src = iframeURL;
  iframe.setAttribute('title', 'Iframe for external content');
  iframe.setAttribute('frameborder', 0);
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('loading', 'lazy'); // Performance improvement
  iframe.allow = ''; // Restrict permissions (camera, microphone, etc.)
  iframe.setAttribute('title', getMeaningfulTitle());

  const options = {
    root: null,
    rootMargin: '20%',
    threshold: 1.0,
  };

  // add event listener for intersection observer when block is in view port
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        block.replaceChildren(iframe);
        observer.unobserve(block);
      }
    });
  }, options);

  // observe the block
  observer.observe(block);
}
