import ffetch from './ffetch.js';

function titleToName(name) {
  return name.toLowerCase().replace(' ', '-');
}

const taxonomyEndpoint = '/config/sidekick/taxonomy.json';
let taxonomyPromise;
function fetchTaxonomy() {
  if (!taxonomyPromise) {
    taxonomyPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const taxonomyJson = await ffetch(taxonomyEndpoint).all();
          const taxonomy = {};
          let currentType;
          let currentL1; let currentL2; let
            currentL3;

          taxonomyJson.forEach((row) => {
            // Handle Type level
            if (row.Type) {
              currentType = row.Type;
              taxonomy[currentType] = {
                title: currentType,
                name: titleToName(currentType),
                path: titleToName(currentType),
                hide: row.hide,
              };
            }

            // Handle Level 1
            if (row['Level 1'] && currentType) {
              currentL1 = row['Level 1'];
              if (!taxonomy[currentType][currentL1]) {
                taxonomy[currentType][currentL1] = {
                  title: currentL1,
                  name: titleToName(currentL1),
                  path: `${titleToName(currentType)}/${titleToName(currentL1)}`,
                  hide: row.hide,
                };
              }
            }

            // Handle Level 2
            if (row['Level 2'] && currentType && currentL1) {
              currentL2 = row['Level 2'];
              if (!taxonomy[currentType][currentL1][currentL2]) {
                taxonomy[currentType][currentL1][currentL2] = {
                  title: currentL2,
                  name: titleToName(currentL2),
                  path: `${titleToName(currentType)}/${titleToName(currentL1)}/${titleToName(currentL2)}`,
                  hide: row.hide,
                };
              }
            }

            // Handle Level 3
            if (row['Level 3'] && currentType && currentL1 && currentL2) {
              currentL3 = row['Level 3'];
              if (currentL3 && !taxonomy[currentType][currentL1][currentL2][currentL3]) {
                taxonomy[currentType][currentL1][currentL2][currentL3] = {
                  title: currentL3,
                  name: titleToName(currentL3),
                  path: `${titleToName(currentType)}/${titleToName(currentL1)}/${titleToName(currentL2)}/${titleToName(currentL3)}`,
                  hide: row.hide,
                };
              }
            }

            // Handle Level 4
            if (row['Level 4'] && currentType && currentL1 && currentL2 && currentL3) {
              const currentL4 = row['Level 4'];
              if (currentL4) {
                taxonomy[currentType][currentL1][currentL2][currentL3][currentL4] = {
                  title: currentL4,
                  name: titleToName(currentL4),
                  path: `${titleToName(currentType)}/${titleToName(currentL1)}/${titleToName(currentL2)}/${titleToName(currentL3)}/${titleToName(currentL4)}`,
                  hide: row.hide,
                };
              }
            }
          });
          resolve(taxonomy);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return taxonomyPromise;
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
export function getTaxonomy() {
  return fetchTaxonomy();
}

/**
 * Returns a taxonomy category as an array of objects
 * @param {*} category
 */
export const getTaxonomyCategory = async (category) => {
  const taxonomy = await getTaxonomy();
  return getDeepNestedObject(taxonomy, category)[0];
};
