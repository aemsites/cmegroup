import { readBlockConfig } from '../../scripts/aem.js';

/*
 * For more info about the video's options please read:
 * https://github.com/brightcove/player-loader
 * https://support.brightcove.com/
 * Props:
 * account ID,
 * video ID,
 * playlist ID,
 * playlist location (bottom or right),
 * aspect ratio,
 * close caption,
 * language
 */

function calculateDataPlayerId(
  aspectRatio,
  playlistLocation,
  closeCaption,
) {
  let key = closeCaption
    ? `${aspectRatio}${playlistLocation}-${closeCaption}`
    : `${aspectRatio}${playlistLocation}`;
  if (playlistLocation === 'H') {
    key = 'H';// hidden playlist doesn´t have captions or aspect ratio options so far
  }
  const dictionary = {
    H: '9rzODnw76', // hidden playlist (autoplay)
    // video players without captions
    '4:3': '371d55fe-8421-4cc4-ae3b-3bd58647a857', // display: block; padding-top: 75%;
    '16:9': '46f29b5c-718a-4f1f-aabc-37aadea1426c', // display: block; padding-top: 56.25%;
    // video players with captions
    '16:9-CSC': 'rklaugqVs', // display: block; padding-top: 56.25%;
    '16:9-CTC': 'rJzTZ5Ns', // display: block; padding-top: 56.25%;
    '16:9-EC': 'rkY4x9Vi', // display: block; padding-top: 56.25%;
    '16:9-HC': 'SymC1Wj5iZ', // display: block; padding-top: 56.25%
    '16:9-JC': 'r1W5cZ9Ns', // display: block; padding-top: 56.25%;
    '16:9-KC': 'BkoZJ5Ni', // display: block; padding-top: 56.25%;
    '16:9-PC': 'SJpIb54s', // display: block; padding-top: 56.25%;
    '16:9-SC': 'HyOPqWrml', // display: block; padding-top: 56.25%;
    '16:9-SP': 'g2qVvye3i', // display: block; padding-top: 56.25%;
    '16:9-WHC': 'SJlNIwgW0W', // display: block; padding-top: 56.25%;
    '16:9-DC': 'Dp4JZ3VshK', // display: block; padding-top: 56.25%;
    '16:9-GE': 'SJStHA9jZ', // display: block; padding-top: 56.25%;
    '16:9-FR': 'abFbIyuoq', // display: block; padding-top: 56.25%;
    '16:9-IT': '1LCqiNRxe', // display: block; padding-top: 56.25%;
    // playlist players without captions
    '4:3B': 'Ny6Irf1jx', // padding-top: 75%;
    '4:3R': '4JC701psx', // no style!
    '16:9B': 'NJia0b1jx', // padding-top: 56.25%;
    '16:9R': 'EJygCkaoe', // no style!
    // playlist players with captions
    '16:9B-CSC': 'HJpdCXws', // padding-top: 56.25%;
    '16:9R-CSC': 'SyeoAXvj', // no style!
    '16:9B-CTC': 'BJK70mPi', // padding-top: 56.25%;
    '16:9R-CTC': 'H1SIRXDs', // no style
    '16:9B-EC': 'BkfPOBuKa', // padding-top: 56.25%;
    '16:9R-EC': 'HJOuyVws', // no style!
    '16:9B-HC': 'S1tQt98iW', // padding-top: 56.25%;
    '16:9R-HC': 'ryKBh3fiW', // no style!
    '16:9B-JC': 'BydaAQvj', // padding-top: 56.25%;
    '16:9R-JC': 'SyBl1Ews', // no style!
    '16:9B-KC': 'S1cn27Do', // padding-top: 56.25%;
    '16:9R-KC': 'BygjTQPj', // no style!
    '16:9B-PC': 'BJeQJNvo', // padding-top: 56.25%;
    '16:9R-PC': 'Hyl9GSOt6', // no style!
    '16:9B-SC': 'S1ZZaubBmx', // no style!
    '16:9R-SC': 'S1ZZaubBmx',
    '16:9R-SP': 'PH2plq0StE', // no style!
    '16:9B-DC': 't7zQfTWBkz', // padding-top: 56.25%;
    '16:9R-DC': 'DFdWsi7gAy', // no style!
    '16:9B-GE': 'iQZHUUBm', // padding-top: 56.25%;
    '16:9R-GE': 'R8n0egF1', // no style!
    '16:9R-FR': 'QmOg2d8gOR', // no style!
    '16:9R-IT': 'rlaQEOeYZU', // no style!
  };

  const defaultPlayer = playlistLocation
    ? 'EJygCkaoe'
    : '46f29b5c-718a-4f1f-aabc-37aadea1426c';
  return key in dictionary ? dictionary[key] : defaultPlayer;
}

function calculateStyles(aspectRatio, playlistLocation) {
  const is43 = aspectRatio === '4:3';
  // it is a playlist ?
  if (playlistLocation === 'R') {
    return 'playlist-right-sidekick';
  }
  // is it a video ?
  if (is43) {
    return 'aspect-ratio43';
  }

  return 'aspect-ratio169';
}

function loadLanguage(videoPlayer, language) {
  if (videoPlayer) {
    const audioTracks = videoPlayer.audioTracks();
    for (let i = 0; i < audioTracks.length; i += 1) {
      const trackLanguage = audioTracks[i].language.substr(0, 2);
      if (trackLanguage) {
        if (trackLanguage === language) {
          audioTracks[i].enabled = true;
        }
      }
    }
  }
}

function setPlayerReady(block, language, videoId) {
  block.setAttribute('data-video-status', 'loaded');
  if (language) {
    const languageVideoPlayer = videojs(block.querySelector(`#cmeVideo${videoId}`));
    setTimeout(() => {
      loadLanguage(languageVideoPlayer, language);
    }, 1000);
  }
}

async function loadVideoLibrary(block, videoAccount, videoPlayer, language, videoId) {
  if (block.getAttribute('data-video-status') === 'loaded') {
    return;
  }
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${videoAccount}/${videoPlayer}_default/index.min.js`;
  script.async = true;
  document.head.appendChild(script);
  script.onload = async () => {
    await setPlayerReady(block, language, videoId);
  };
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    accountid: accountId,
    videoid: videoId,
    playlistid: playlistId,
    playlistlocation: playlistLocation,
    aspectratio: aspectRatio,
    cc,
    language,
  } = dataBlock;
  const playlist = playlistId !== '' && playlistLocation ? playlistLocation : '';
  const dataPlayer = calculateDataPlayerId(aspectRatio, playlist, cc);
  const videoStyles = calculateStyles(aspectRatio, playlistLocation);
  block.innerHTML = `
  <div class='brightcove-player'>
    <div class='brightcove-video'>
      <div class='brightcove-wrapper'>
        <div class="${videoStyles} ${playlist ? 'vjs-playlist-player-container' : 'brightcove-video'}">
          <video-js
            id="cmeVideo${videoId}"
            data-account="${accountId}"
            data-player="${dataPlayer}"
            data-embed="default"
            class="cmeBcVideo" 
            controls=""
            ${playlistId !== '' ? `data-playlist-id="${playlistId}"` : ''}
            ${playlistId !== '' && videoId ? `data-playlist-video-id="${videoId}"` : ''}
            ${playlistId === '' ? `data-video-id="${videoId}"` : ''}
            data-application-id="true">
          </video-js>
          ${playlistId !== '' && playlistLocation === 'R' ? '<div class="vjs-playlist"></div>' : ''}
        </div>
        ${playlistId !== '' && playlistLocation === 'B' ? '<div class="vjs-playlist"></div>' : ''}
      </div>
    </div>
  </div>
  `;

  loadVideoLibrary(block, accountId, dataPlayer, language, videoId);
}
