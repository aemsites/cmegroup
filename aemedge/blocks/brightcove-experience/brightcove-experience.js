import { getMetadata } from '../../scripts/aem.js';
import { readBlockConfig } from '../../scripts/utils.js';
import { LocalStorageUtil } from '../../scripts/utils/index.js';

/*
 * For more info about the video's options please read:
 * https://github.com/brightcove/player-loader
 * https://support.brightcove.com/
 * Props:
 * account ID,
 * experience ID,
 */

const BRIGHTCOVE_POSTER_CACHE_KEY = 'brightcoveExpPosterCache';
const BRIGHTCOVE_POSTER_CACHE_LIMIT = 10;

function setPlayerReady(block) {
  block.setAttribute('data-video-status', 'loaded');
  block.querySelector('.brightcove-experience-placeholder')?.remove();
  block.querySelector('.spinner-in-experience').remove();
}

async function loadVideoLibrary(
  block,
  accountId,
  experienceId,
) {
  if (!experienceId || block.getAttribute('data-video-status') === 'loaded') {
    return null;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://players.brightcove.net/${accountId}/experience_${experienceId}/live.js`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      setPlayerReady(block);
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load the Brightcove Experience.'));
    };
  });
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

  if (!policyKey || !videoId) {
    return '';
  }
  const url = `https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/${videoId}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: `application/json;pk=${policyKey}`,
      },
      priority: 'high',
    });

    const { poster, thumbnail } = await response.json();

    if (!poster || !thumbnail) {
      return '';
    }

    return poster || thumbnail || '';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Unable to pull placeholder from Playback API');
  }

  return '';
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

async function getPosterWithCache(accountId, videoId) {
  const cache = getPosterCache();
  let posterUrl = cache[videoId]?.posterUrl || await getBrightcovePoster(accountId, videoId);

  if (!posterUrl) {
    return '';
  }

  posterUrl = changeQualityPosterUrl(posterUrl);
  updatePosterCache(videoId, posterUrl);

  return posterUrl;
}

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    accountid: accountId,
    experienceid: experienceId,
    videoid: videoId,
    defaultplaylistposter: defaultPlaylistPoster,
  } = dataBlock;
  const posterUrl = defaultPlaylistPoster || await getPosterWithCache(accountId, videoId);

  block.innerHTML = `
  <div class='brightcove-experience-container'>
    <div class="brightcove-experience-placeholder">
      ${posterUrl ? `<img class="brightcove-img-placeholder" src="${posterUrl}" fetchpriority="high" />` : ''}
      <div class="spinner-in-experience">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    <div 
      class='brightcove-experience-video'
      id='experience_${experienceId}'
      data-experience='${experienceId}'
    ></div>
  </div>
  `;

  if (experienceId) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          await loadVideoLibrary(block, accountId, experienceId);
          observer.unobserve(block);
        }
      });
    });
    observer.observe(block);
  }
}
