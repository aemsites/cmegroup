import { isEmpty } from 'lodash';
import { getAbsoluteUrl } from 'utils';
import type { RecentSearch } from 'custom-types';
import styles from './recent-searches.scss';

type Props = {
  searchUrl: string;
  searches: RecentSearch[];
  handleSetSearch: Function;
};

const RecentSearches = ({
  searchUrl,
  searches = [],
  handleSetSearch,
}: Props): any => {
  const handleClick = (term: string) => async () => {
    await handleSetSearch(term);
    (window as Window).location = `${getAbsoluteUrl(
      searchUrl,
    )}?q=${encodeURIComponent(term)}`;
  };

  if (isEmpty(searches)) {
    return null;
  }

  return (
    <div className={styles.recentSearches}>
      <span className={styles.title}>Recent searches</span>

      {searches.map((search: RecentSearch, i: number) => {
        const { term } = search;

        return (
          <div key={i} className={styles.search}>
            <span className="icon-history" />
            <button type="button" onClick={handleClick(term)}>
              {term}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RecentSearches;
