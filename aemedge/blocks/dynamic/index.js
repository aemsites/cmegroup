import createTabs from './tabs/tabs.js';

/**
 * Create dynamic blocks from the main element
 * @param {HTMLElement} main - The main element
 */
export default async function dynamicBlocks(main) {
  await createTabs(main);
}
