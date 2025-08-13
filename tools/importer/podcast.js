/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */
import { EDS_DOMAIN } from './utils.js';

const mapPodcast = (document) => {
  const podcasts = document.querySelectorAll('.podcast');
  if (podcasts.length) {
    podcasts.forEach((podcast) => {
      const dataUrl = podcast.getAttribute('data-url');
      if (dataUrl) {
        const tempTable = WebImporter.Blocks.createBlock(document, {
          name: 'Podcast',
          cells: [['url', dataUrl]],
        });

        podcast.replaceWith(tempTable);
      }
    });
  }
};

const podcastFragments = (document) => {
  const fragments = document.querySelectorAll('.component.design-box');
  if (fragments.length) {
    fragments.forEach((fragment) => {
      const { textContent } = fragment;
      if (textContent && textContent.includes('Listen to a variety of podcasts from CME Group, covering a range of topics about the futures and options markets.')) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/podcasts/podcasts-overview`;
        anchor.textContent = anchor.href;
        const cells = [[anchor]];
        const table = WebImporter.Blocks.createBlock(document, {
          name: 'Fragment',
          cells,
        });
        fragment.replaceWith(table);
      }
    });
  }
};

export {
  mapPodcast,
  podcastFragments,
};
