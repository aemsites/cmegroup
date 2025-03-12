import { readBlockConfig } from '../../scripts/aem.js';

function loadPodcast(block, id, url) {
  if (block.getAttribute('data-podcast-status') === 'loaded' || !url) {
    return;
  }

  // eslint-disable-next-line no-undef
  jwplayer(id).setup({
    file: url,
    mediaid: '',
    width: '100%',
    height: 30,
    type: 'mp3',
    autostart: false,
    mobilecontrols: true,
    mute: false,
    flashplayer: '/aemedge/blocks/podcast/external/jwplayer.flash.swf',
    html5player: '/aemedge/blocks/podcast/external/jwplayer.html5.js',
  });

  block.setAttribute('data-podcast-status', 'loaded');
}

async function loadPodcastLibrary(block, id, url) {
  if (!window.jwplayer) {
    const script = document.createElement('script');
    script.src = '/aemedge/blocks/podcast/external/jwplayer.js';
    script.async = true;
    document.head.appendChild(script);
    script.onload = async () => {
      await loadPodcast(block, id, url);
    };
  } else {
    await loadPodcast(block, id, url);
  }
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    url,
  } = dataBlock;
  const id = 'test';

  block.innerHTML = `
    <div class='media-player' id='media-player-id'>
      <div class='jwplayer' id=${id} />
    </div>
  `;

  loadPodcastLibrary(block, id, url);
}
