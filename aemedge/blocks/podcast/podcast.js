import { generateRandomId, readBlockConfig } from '../../scripts/utils.js';

function showDuration(block, length) {
  const duration = block.querySelector('.jwduration');
  if (duration) {
    duration.innerHTML = length;
  }
}

function loadPodcast(block, id, url, length) {
  if (block.getAttribute('data-podcast-status') === 'loaded' || !url) {
    return;
  }

  // eslint-disable-next-line no-undef
  const podcastPlayer = jwplayer(id);
  podcastPlayer.setup({
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
    events: {
      onReady: () => {
        if (length) {
          showDuration(block, length);
        }
      },
    },
  });

  block.setAttribute('data-podcast-status', 'loaded');
}

async function loadPodcastLibrary(block, id, url, length) {
  if (!window.jwplayer) {
    const script = document.createElement('script');
    script.src = '/aemedge/blocks/podcast/external/jwplayer.js';
    script.async = true;
    document.head.appendChild(script);
    script.onload = async () => {
      await loadPodcast(block, id, url, length);
    };
  } else {
    await loadPodcast(block, id, url, length);
  }
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    url,
    length,
  } = dataBlock;
  const id = generateRandomId();

  block.innerHTML = `
    <div class='media-player' id='media-player-id'>
      <div class='jwplayer' id=${id} />
    </div>
  `;

  loadPodcastLibrary(block, id, url, length);
}
