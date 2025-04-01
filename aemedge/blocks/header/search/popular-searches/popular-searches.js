import { isEmpty } from 'lodash';
import LinesEllipsis from 'react-lines-ellipsis-observer';
import responsiveHOC from 'react-lines-ellipsis-observer/lib/responsiveHOC';
import { getAbsoluteUrl } from 'utils';
import type { PopularSearch } from 'custom-types';
import styles from './popular-searches.scss';

type Props = {
  searches: PopularSearch[];
  limit?: number;
};

const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

const PopularSearches = ({ searches = [], limit = 10 }: Props): any => {
  if (isEmpty(searches)) {
    return null;
  }

  return (
    <div className={styles.popularSearches}>
      <h6 className={styles.title}>Trending Pages</h6>
      <div className={styles.searches}>
        {searches
          .slice(0, limit)
          .map(({ url, title }: PopularSearch, i: number) => (
            <a key={i} href={getAbsoluteUrl(url)} className={styles.searchBox}>
              <span className={styles.boxTitle}>
                <ResponsiveEllipsis
                  text={title}
                  maxLine="2"
                  ellipsis="…"
                  trimRight
                  basedOn="words"
                  component="span"
                />
              </span>
              <span className="icon-arrow-right" />
            </a>
          ))}
      </div>
    </div>
  );
};

export default PopularSearches;
