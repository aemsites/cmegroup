import { readBlockConfig } from '../../scripts/aem.js';

export default async function decorate(block) {
  const blockConfig = readBlockConfig(block);

  // Allowlist of permitted iframe sources
  const ALLOWED_HOSTS = [
    'www.google.com',
    'www.cmegroup.com',
    'cmeg.co1.qualtrics.com',
    'html5-player.libsyn.com',
  ];

  const PLACEHOLDER = 'IFRAME_TITLE_HERE';
  const iframeURL = blockConfig.url;
  const iframeTitle = blockConfig.title;
  const iframefixedHeight = blockConfig.height;

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
      ? `Content from ${new URL(iframeURL).hostname}`
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

  if (iframefixedHeight && !iframefixedHeight.match(/^(\d+)(px|%)?$/)) {
    addWarningMessage('Invalid height value. Please use a number followed by "px" or "%".');
    return;
  }

  // Create iframe element
  const iframe = document.createElement('iframe');
  if (iframefixedHeight) {
    iframe.height = iframefixedHeight;
    
    // If height is percentage, ensure parent elements have height set
    if (iframefixedHeight.includes('%')) {
      // Set the block (first parent) height to 100%
      block.style.height = '100%';
      
      // Find or create iframe-wrapper (second parent) and set its height to 100%
      let wrapper = block.parentElement;
      if (wrapper && wrapper.classList.contains('iframe-wrapper')) {
        wrapper.style.height = '100%';
      }
    }
  }
  iframe.src = iframeURL;
  iframe.setAttribute('title', getMeaningfulTitle());
  iframe.setAttribute('frameborder', 0);
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('loading', 'lazy'); // Performance improvement
  iframe.allow = ''; // Restrict permissions (camera, microphone, etc.)

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
