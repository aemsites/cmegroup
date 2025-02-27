import ffetch from './ffetch.js';

const taxonomyEndpoint = '/config/sidekick/taxonomy.json';
const taxonomyPromises = {};

function fetchTaxonomy(sheet) {
  if (!taxonomyPromises[sheet]) {
    taxonomyPromises[sheet] = new Promise((resolve, reject) => {
      (async () => {
        try {
          const sheetParameter = sheet ? `?sheet=${sheet}` : '';
          const taxonomyJson = await ffetch(`${taxonomyEndpoint}${sheetParameter}`).all();
          const taxonomy = {};

          taxonomyJson.forEach((row) => {
            const levels = row.tag.split('/');
            let currentLevel = taxonomy;
            let currentPath = '';
            levels.forEach((tag, index) => {
              currentPath = currentPath ? `${currentPath}/${tag}` : tag;
              if (!currentLevel[tag]) {
                currentLevel[tag] = {
                  title: tag,
                  name: tag,
                  path: currentPath,
                  hide: false,
                };
              }
              if (index === levels.length - 1) {
                if (row.en) {
                  currentLevel[tag].title = row.en;
                }
              } else {
                currentLevel = currentLevel[tag];
              }
            });
          });
          resolve(taxonomy);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return taxonomyPromises[sheet];
}

const getDeepNestedObject = (obj, filter) => Object.entries(obj)
  .reduce((acc, [key, value]) => {
    let result = [];
    if (key === filter) {
      result = acc.concat(value);
    } else if (typeof value === 'object') {
      result = acc.concat(getDeepNestedObject(value, filter));
    } else {
      result = acc;
    }
    return result;
  }, []);

/**
 * Get the taxonomy a a hierarchical json object
 * @returns {Promise} the taxonomy
 */
export function getTaxonomy(sheet) {
  return fetchTaxonomy(sheet);
}

/**
 * Returns a taxonomy category as an array of objects
 * @param {*} category
 */
export const getTaxonomyCategory = async (category) => {
  const taxonomy = await getTaxonomy();
  return getDeepNestedObject(taxonomy, category)[0];
};
