import { isEmpty } from 'lodash';
import { getAbsoluteUrl } from 'utils';
import type { SuggestionSearch } from 'custom-types';
import styles from './suggestion-searches.scss';

type Props = {
  searches: SuggestionSearch[];
  handleSetSearch: Function;
};

const SuggestionSearches = ({ searches = [], handleSetSearch }: Props): any => {
  const handleClick = (title: string, page: string) => async () => {
    await handleSetSearch(title);
    window.location = getAbsoluteUrl(page);
  };

  if (isEmpty(searches)) {
    return null;
  }

  return (
    <div className={styles.suggestionSearches}>
      <span className={styles.title}>Suggestions</span>
      <div className={styles.searches}>
        {searches.map(({ title, page }: SuggestionSearch, i: number) => (
          <div key={i} className={styles.search}>
            <button type="button" onClick={handleClick(title, page)}>
              <span className="icon-arrow-right" />
              <span>{title}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestionSearches;
