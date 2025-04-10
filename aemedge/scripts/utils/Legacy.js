export function getIsLoggedInUrl() {
  return `https://www.cmegroup.com/services/login/validate`;
}

export function getLoginDataUrl(fromUrl, fromUrlTitle) {
  return `https://www.cmegroup.com/libs/cmegroup/security/login?fromUrl=${fromUrl}&fromUrlTitle=${fromUrlTitle}`;
}

export function getUserInfoUrl() {
  return 'https://www.cmegroup.com/CmeWS/mvc/secured/UserAccount/salesforce-userinfo';
}

export function getPopularSearchUrl() {
  return 'https://www.cmegroup.com/services/popular-search';
}

export function getRecentSearchByUserUrl() {
  return 'https://www.cmegroup.com/CmeWS/mvc/secured/MostRecentSearchedTerm/getByUser';
}

export function getRecentSearchFullUpdateByUserUrl() {
  return 'https://www.cmegroup.com/CmeWS/mvc/secured/MostRecentSearchedTerm/fullUpdateByUser';
}

export function updateRecentSearchUrl() {
  return 'https://www.cmegroup.com/CmeWS/mvc/secured/MostRecentSearchedTerm/updateByUser';
}

export function getSearchSuggestionsUrl(term) {
  return `https://www.cmegroup.com/bin/service/search.${term}.json`;
}
