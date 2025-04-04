export default async function decorate(block) {
  // Allowlist of permitted iframe sources
  const ALLOWED_HOSTS = [
    'www.google.com',
    'www.cmegroup.com',
    'cmeg.co1.qualtrics.com',
    'html5-player.libsyn.com',
  ];

  const link = block.querySelector('a')?.getAttribute('href');

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

  // Exit early if link is missing
  if (!link) {
    addWarningMessage('Warning: No URL provided for iframe source');
    return;
  }

  // Exit early if URL is not in allowlist
  if (!isAllowedUrl(link)) {
    addWarningMessage('Warning: Iframe source is not in allowed hosts list or is not HTTPS');
    return;
  }

  // Create iframe element
  const iframe = document.createElement('iframe');
  const fixedHeightClass = [...block.classList].find((el) => /[0-9]+px/.test(el));

  if (fixedHeightClass) {
    iframe.height = fixedHeightClass;
  }
  iframe.src = link;
  iframe.setAttribute('title', 'Iframe for external content');
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
