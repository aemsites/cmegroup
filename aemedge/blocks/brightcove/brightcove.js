import { readBlockConfig, getMetadata } from '../../scripts/aem.js';
import {
  setTracking,
  LocalStorageUtil,
  getRandomNumber,
} from '../../scripts/utils/index.js';
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

const BRIGHTCOVE_POSTER_CACHE_KEY = 'brightcovePosterCache';
const BRIGHTCOVE_POSTER_CACHE_LIMIT = 10;
const fireTracking = setTracking('custom', 'media', 'BrightcoveVideo');

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
      if (trackLanguage && trackLanguage === language) {
        audioTracks[i].enabled = true;
      }
    }
  }
}

function setPlayerReady(block, language, videoId, randomNumber, autoplayOptions) {
  block.setAttribute('data-video-status', 'loaded');
  const languageVideoPlayer = videojs(block.querySelector(`#cmeVideo${videoId}_${randomNumber}`));
  if (language) {
    languageVideoPlayer.on('loadedmetadata', () => {
      loadLanguage(languageVideoPlayer, language);
    });
  }
  languageVideoPlayer.on('loadstart', () => fireTracking('videojsloaded'));
  languageVideoPlayer.on('loadeddata', () => {
    block.querySelector('.brightcove-placeholder')?.remove();
    block.querySelector(`#cmeVideo${videoId}_${randomNumber}`).classList.remove('video-hidden');
    block.querySelector('.vjs-playlist')?.classList.remove('video-hidden');
    block.querySelector('.brightcove-player').classList.remove('loading');
    const { name: videoName } = languageVideoPlayer.mediainfo;
    const percentsAlreadyTracked = [];

    if (window.ga) {
      window.ga();
    }
    fireTracking(`Video "${videoName}" - loaded`, 'loadeddata');

    // GMT - Events to Track
    let timeUpdateTimeout;
    languageVideoPlayer.on(
      'timeupdate',
      () => {
        clearTimeout(timeUpdateTimeout);
        timeUpdateTimeout = setTimeout(() => {
          const myMediaDuration = Math.ceil(languageVideoPlayer.duration());
          const myPosition = Math.ceil(languageVideoPlayer.currentTime());
          const myPercentage = Math.ceil((myPosition / myMediaDuration) * 100);
          if (!(myPercentage % 10) && percentsAlreadyTracked.indexOf(myPercentage) < 0) {
            fireTracking(
              `Video "${videoName}" - Percents played ${myPercentage}%`,
              'percentsPlayed',
              myPercentage,
            );
            percentsAlreadyTracked.push(myPercentage);
          }
        }, 120);
      },
    );
    languageVideoPlayer.on('firstplay', () => {
      fireTracking(`Video "${videoName}" - Start`, 'start');
    });
    languageVideoPlayer.on('ended', () => {
      fireTracking(`Video "${videoName}" - End`, 'end');
    });
    languageVideoPlayer.on('seeked', () => {
      const myPosition = Math.ceil(languageVideoPlayer.currentTime());
      fireTracking(
        `Video "${videoName}" - Seek end at ${myPosition}`,
        'seek',
        myPosition,
      );
    });
    languageVideoPlayer.on('play', () => {
      const myPosition = Math.ceil(languageVideoPlayer.currentTime());
      fireTracking(
        `Video "${videoName}" - Play from ${myPosition}`,
        'play',
        myPosition,
      );
    });
    languageVideoPlayer.on('pause', () => {
      const myPosition = Math.ceil(languageVideoPlayer.currentTime());
      fireTracking(
        `Video "${videoName}" - Paused at ${myPosition}`,
        'pause',
        myPosition,
      );
    });
    languageVideoPlayer.on('resize', () => {
      const videoSize = `${languageVideoPlayer.videoWidth()}*${languageVideoPlayer.videoHeight()}`;
      fireTracking(
        `Video "${videoName}" - Resize - ${videoSize}`,
        'resize',
        videoSize,
      );
    });

    let volumeChangeTimeout;
    languageVideoPlayer.on(
      'volumechange',
      () => {
        clearTimeout(volumeChangeTimeout);
        volumeChangeTimeout = setTimeout(() => {
          const volume = `${languageVideoPlayer.muted() ? 0 : Math.ceil(languageVideoPlayer.volume() * 100)}%`;
          fireTracking(
            `Video "${videoName}" - Volume - ${volume}`,
            'volumechange',
            volume,
          );
        }, 120);
      },
    );
    languageVideoPlayer.on('error', () => {
      const myPosition = Math.ceil(languageVideoPlayer.currentTime());
      fireTracking(
        `Video "${videoName}" - Error at ${myPosition}`,
        'error',
        myPosition,
      );
    });
    languageVideoPlayer.on('fullscreenchange', () => {
      const myPosition = Math.ceil(languageVideoPlayer.currentTime());
      fireTracking(
        `Video "${videoName}" - ${
          languageVideoPlayer.isFullscreen() ? 'Enter' : 'Exit'
        } fullscreen at ${myPosition}`,
        'fullscreen',
        myPosition,
      );
    });
    // GMT - Events to Track
  });

  if (autoplayOptions.mute) {
    languageVideoPlayer.volume(0);
  }

  if (autoplayOptions.play) {
    languageVideoPlayer.play();
  }

  if (videojs.browser.TOUCH_ENABLED) {
    const container = block.querySelector(`#cmeVideoContainer${videoId}_${randomNumber}`);
    if (container) {
      const element = container.getElementsByClassName('vjs-playlist')[0];
      if (element) {
        element.classList.remove('vjs-native');
        element.classList.add('vjs-mouse');
      }
    }
  }
}

function getPosterCache() {
  try {
    return LocalStorageUtil.get(BRIGHTCOVE_POSTER_CACHE_KEY, true) ?? {};
  } catch {
    return {};
  }
}

async function getBrightcovePoster(accountId, videoId) {
  const policyKey = getMetadata('brightcove-policy-key');

  if (!policyKey) {
    return '';
  }
  const url = `https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/${videoId}`;

  const response = await fetch(url, {
    headers: {
      Accept: `application/json;pk=${policyKey}`,
    },
    priority: 'high',
  });

  const { data } = response;

  if (!data) {
    return '';
  }

  return data.poster || data.images?.thumbnail?.src || '';
}

function updatePosterCache(videoId, posterUrl) {
  const cache = getPosterCache();
  const entries = Object.entries(cache);

  if (entries.length >= BRIGHTCOVE_POSTER_CACHE_LIMIT) {
    const oldestKey = entries[0][0];
    delete cache[oldestKey];
  }

  cache[videoId] = {
    posterUrl,
    ts: Date.now(),
  };

  LocalStorageUtil.set(BRIGHTCOVE_POSTER_CACHE_KEY, cache);
}

function changeQualityPosterUrl(posterUrl) {
  const isDesktop = window.innerWidth >= 1201;
  return posterUrl.replace(/\d*x\d*(\/match\/image)/g, (match, group1) => `${isDesktop ? '800x400' : '400x225'}${group1}`);
}

async function getPosterWithCache(block, accountId, videoId) {
  const cache = getPosterCache();
  let posterUrl = cache[videoId]?.posterUrl || await getBrightcovePoster(accountId, videoId);

  if (!posterUrl) {
    return '';
  }

  posterUrl = changeQualityPosterUrl(posterUrl);
  updatePosterCache(videoId, posterUrl);

  return posterUrl;
}

async function loadVideoLibrary(
  block,
  videoAccount,
  videoPlayer,
  language,
  videoId,
  randomNumber,
  autoplayOptions = {},
) {
  if (block.getAttribute('data-video-status') === 'loaded') {
    return;
  }
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${videoAccount}/${videoPlayer}_default/index.min.js`;
  script.async = true;
  document.head.appendChild(script);
  script.onload = async () => {
    await setPlayerReady(block, language, videoId, randomNumber, autoplayOptions);
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
  const videoStyles = calculateStyles(aspectRatio, playlist);
  const randomNumber = getRandomNumber();

  const posterUrl = await getPosterWithCache(block, accountId, videoId);

  block.innerHTML = `
  <div class='brightcove-player'>
    <div class="brightcove-placeholder">
      <img class="brightcove-img-placeholder ${videoStyles}" src="${posterUrl}" fetchpriority="high" />
      <div class="spinner-in-video">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    <div class='brightcove-video'>
      <div class='brightcove-wrapper'>
        <div
          id="cmeVideoContainer${videoId}_${randomNumber}"
          class="brightcove-player ${videoStyles} ${playlist ? 'vjs-playlist-player-container' : 'brightcove-video'}"
        >
          <video
            id="cmeVideo${videoId}_${randomNumber}"
            data-account="${accountId}"
            data-player="${dataPlayer}"
            data-embed="default"
            class="cmeBcVideo video-js video-hidden ${playlistId !== '' && playlistLocation === 'B' ? 'playlist-bottom' : ''}" 
            controls=""
            ${playlistId !== '' ? `data-playlist-id="${playlistId}"` : ''}
            ${playlistId !== '' && videoId ? `data-playlist-video-id="${videoId}"` : ''}
            ${playlistId === '' ? `data-video-id="${videoId}"` : ''}
            data-application-id="true"
            preload="${block.classList.contains('preload') ? 'metadata' : 'none'}"
            loading="lazy">
          </video>
          ${playlistId !== '' && playlistLocation === 'R' ? '<div class="vjs-playlist video-hidden"></div>' : ''}
        </div>
        ${playlistId !== '' && playlistLocation === 'B' ? '<div class="vjs-playlist playlist-bottom video-hidden"></div>' : ''}
      </div>
    </div>
  </div>
  `;

  const player = block.querySelector('.brightcove-player');

  if (playlistId || block.classList.contains('live')) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          player.classList.add('loading');

          loadVideoLibrary(block, accountId, dataPlayer, language, videoId, randomNumber, {
            mute: block.classList.contains('live'),
            play: block.classList.contains('live'),
          });
          observer.unobserve(block);
        }
      });
    });

    observer.observe(block);
  } else {
    const placeholder = player.querySelector('.brightcove-placeholder');

    placeholder.addEventListener('click', () => {
      player.classList.add('loading');

      loadVideoLibrary(block, accountId, dataPlayer, language, videoId, randomNumber, {
        play: true,
      });
    });
  }
}
