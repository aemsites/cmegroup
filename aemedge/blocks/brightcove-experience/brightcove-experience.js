import { readBlockConfig } from '../../scripts/utils.js';

/*
 * For more info about the video's options please read:
 * https://github.com/brightcove/player-loader
 * https://support.brightcove.com/
 * Props:
 * account ID,
 * experience ID,
 */

function setPlayerReady(block) {
  block.setAttribute('data-video-status', 'loaded');
  block.querySelector('.spinner-in-experience').remove();
}

async function loadVideoLibrary(
  block,
  accountId,
  experienceId,
) {
  if (!experienceId) {
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

export default async function decorate(block) {
  const dataBlock = readBlockConfig(block);
  const {
    accountid: accountId,
    experienceid: experienceId,
  } = dataBlock;

  block.innerHTML = `
  <div class='brightcove-experience-container'>
    <div class="spinner-in-experience">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div 
      class='brightcove-experience-video'
      id='experience_${experienceId}'
      data-experience='${experienceId}'
    ></div>
  </div>
  `;

  await loadVideoLibrary(block, accountId, experienceId);
}
