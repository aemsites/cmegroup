import {
  URIUtil,
  openHiddenIframe,
  getEnvType,
  urlByEnvType,
  isCMEEnv,
} from '../utils/index.js';
import { store } from '../store/store.js';
import { authLogin, authLogout } from '../actions/auth.js';
import { transferCookies, deleteCookies } from './CookieBridge.js';
import {
  getIsLoggedIn,
  getLoginData,
  getUserInfo,
} from '../services/AuthenticationService.js';

export class Authentication {
  static URLParams = {
    targetLocation: 'targetLocation',
    targetDescription: 'targetDescription',
    appendEmail: 'appendEmail',
    noActivationPrompt: 'noActivationPrompt',
  };

  constructor() {
    this.handlers = {};
    this.authenticationData = {
      isLoggedIn: false,
      isLoginComplete: false,
      loginInfo: {},
      loginPromise: new Promise((resolve, reject) => {
        const dispatchLoginComplete = (fn) => (value) => {
          this.authenticationData.isLoginComplete = true;
          // dispatch
          store.dispatch(authLogin(fn !== reject ? value : undefined));
          return fn(value);
        };
        this.resolveLoginPromise = dispatchLoginComplete(resolve);
        this.rejectLoginPromise = dispatchLoginComplete(reject);
      }),
      login: this.login,
      logout: this.logout,
      registration: this.registration,
      setHandler: this.setHandler,
    };
    // set default catch function
    this.authenticationData.loginPromise.catch(() => {
      // eslint-disable-next-line no-console
      console.info('Info: Authentication Fail!');
    });
    // make global
    window.cmeAjax = this.authenticationData;
    this.uriUtil = new URIUtil();
  }

  initialize() {
    const loginProcessUrl = `${window.location.origin}/login-confirmed${isCMEEnv() ? '.html' : ''}`;
    const partnerSpId = getEnvType() !== 'prod'
      ? urlByEnvType()
      : 'https%3A%2F%2Fmain-www%E2%80%93cmegroup.aem.live';
    this.loginUrl = `http://auth${getEnvType() !== 'prod' ? 'nr' : ''}.cmegroup.com/idp/startSSO.ping?`
      + `PartnerSpId=${partnerSpId}&`
      + `TARGET=${loginProcessUrl}`;
    this.registerUrl = `https://login${getEnvType() !== 'prod' ? 'nr' : ''}.cmegroup.com/sso/register/`;
    this.logoutProfileUrl = `https://myprofile.${getEnvType() !== 'prod' ? 'uat' : 'prod'}.cmegroup.com/admin/ssoflo`;
    this.isMobileLogin = false;
    this.schemaForMobile = '';
    this.isProtectedPage = false;
    return true;
  }

  handleLoad() {
    if (this.initialize()) {
      this.checkLoginStatus();
    }
  }

  static getCurrentLocation() {
    const { location } = window;
    const search = location.search
      .substring(1)
      .split('&')
      .filter((param) => !param.startsWith('itm_') && !param.startsWith('utm_'))
      .join('&');
    return `${location.pathname}${search.length ? `?${search}` : ''}${
      location.hash
    }`;
  }

  static setRedirectionCookie(flow, location) {
    // remove cookie after 30 minutes of creation to prevent users hitting login svc over and over
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);
    if (flow === 'login' || flow === 'registration') {
      if (!Authentication.getLoginUrlSfCookie()) {
        const expiresLoginUrlSf = new Date();
        expiresLoginUrlSf.setHours(expiresLoginUrlSf.getHours() + 168); // 7 days from now
        window.CookieUtil?.set(
          'loginUrlSf',
          {
            location: location || Authentication.getCurrentLocation(),
            title: encodeURIComponent(document.title),
          },
          {
            expires: expiresLoginUrlSf,
          },
        );
      }
    }
    window.CookieUtil?.set(
      'redirectionCookie',
      {
        location: location || Authentication.getCurrentLocation(),
        title: encodeURIComponent(document.title),
        flow,
      },
      {
        expires,
      },
    );
  }

  static getRedirectionCookie() {
    return window.CookieUtil?.get('redirectionCookie', true);
  }

  static expireRedirectionCookie() {
    window.CookieUtil?.remove('redirectionCookie');
    return !Authentication.getRedirectionCookie();
  }

  static getLoginCookie(cookieName) {
    if (!cookieName) {
      return false;
    }
    return window.CookieUtil?.get(cookieName, cookieName === 'userinfo');
  }

  static getLoginCookies() {
    const [userId, cmeToken, fgp, userinfo] = [
      'userId',
      'cmeToken',
      '__Secure-Fgp',
      'userinfo',
    ].map((cookieName) => Authentication.getLoginCookie(cookieName));
    return {
      userId,
      cmeToken,
      fgp,
      userinfo,
    };
  }

  static async setLoginCookies(cookiesData) {
    if (!Object.keys(cookiesData).length) {
      return;
    }
    Authentication.removeLegacyCookies();
    const { secureFgp, userinfo } = cookiesData;
    const { userId, token } = userinfo;
    const cookies = {
      '__Secure-Fgp': secureFgp,
      userId,
      cmeToken: token,
      userinfo,
    };
    const expires = new Date();
    expires.setDate(expires.getDate() + 180);
    Object.entries(cookies).forEach(([key, value]) => {
      window.CookieUtil?.set(key, value, {
        secure: true,
        sameSite: 'None',
        expires,
      });
    });
    if (window.location.origin !== urlByEnvType()) {
      await transferCookies(urlByEnvType(), cookies);
    }
  }

  static async expireLoginCookies() {
    const cookies = ['__Secure-Fgp', 'userId', 'cmeToken', 'userinfo'];
    cookies.forEach((cookie) => window.CookieUtil?.remove(cookie, {
      secure: true,
      sameSite: 'None',
    }));
    if (window.location.origin !== urlByEnvType()) {
      await deleteCookies(urlByEnvType(), cookies);
    }
    return !Authentication.getLoginCookie('userinfo');
  }

  static removeLegacyCookies() {
    const { location: { hostname } } = window;
    [
      'userId',
      'cmeToken',
      '__Secure-Fgp',
      'userinfo',
    ].forEach((name) => {
      window.CookieUtil?.remove(name, { domain: `.${hostname}`, path: '/' });
      window.CookieUtil?.remove(name, { domain: `.${hostname}`, path: '' });
      window.CookieUtil?.remove(name, { domain: `.${hostname}` });
    });
  }

  static getLoginUrlSfCookie() {
    return window.CookieUtil?.get('loginUrlSf', true);
  }

  static expireLoginUrlSfCookie() {
    window.CookieUtil?.remove('loginUrlSf');
    return !Authentication.getLoginUrlSfCookie();
  }

  static setAuthActionCookie(flow) {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);
    window.CookieUtil?.set('authAction', flow, {
      expires,
    });
  }

  static getAuthActionCookie() {
    return window.CookieUtil?.get('authAction');
  }

  static expireAuthActionCookie() {
    window.CookieUtil?.remove('authAction');
  }

  checkRedirection(redirectionCookie = Authentication.getRedirectionCookie()) {
    if (!redirectionCookie) {
      return false;
    }
    Authentication.expireRedirectionCookie();
    let newLocation = redirectionCookie.location;
    const redirectionFlow = redirectionCookie.flow;
    if (newLocation.charAt(0) === '/' && newLocation.charAt(1) === '/') {
      newLocation = newLocation.substring(1, newLocation.length);
    }
    Authentication.setAuthActionCookie(redirectionFlow);
    // only redirect if url have changed...
    if (Authentication.getCurrentLocation() !== newLocation) {
      if (
        ((redirectionFlow === 'login'
          || redirectionFlow === 'registration')
          && this.authenticationData.isLoggedIn)
          || (redirectionFlow === 'logout' && !this.authenticationData.isLoggedIn)
      ) {
        window.location.replace(newLocation);
        return true;
      }
    } else {
      this.callHandlers(`${redirectionFlow}_redirection`);
      Authentication.expireAuthActionCookie();
    }
    return true;
  }

  login = (
    targetLocation = Authentication.getCurrentLocation(),
    target = '',
    targetDescription = '',
  ) => {
    if (this.loginUrl.length) {
      Authentication.setRedirectionCookie('login', targetLocation);
      // call handlers
      this.callHandlers('login');
      this.uriUtil.href(this.loginUrl);
      const { targetDescription: td, targetLocation: tl } = Authentication.URLParams;
      this.uriUtil.addQuery({
        [td]: encodeURIComponent(targetDescription),
        [tl]: encodeURIComponent(targetLocation),
      });
      // redirect
      if (target) {
        this.uriUtil.open(target);
      } else {
        this.uriUtil.assign();
      }
      return true;
    }
    return false;
  };

  registration = (
    targetLocation = Authentication.getCurrentLocation(),
    target = '',
    targetDescription = '',
    noActivationPrompt = false,
  ) => {
    if (this.registerUrl.length) {
      Authentication.setRedirectionCookie('registration', targetLocation);
      // call handlers
      this.callHandlers('registration');
      this.uriUtil.href(this.registerUrl);
      const {
        targetDescription: td,
        targetLocation: tl,
        appendEmail: ae,
        noActivationPrompt: nap,
      } = Authentication.URLParams;
      this.uriUtil.addQuery({
        [td]: targetDescription,
        [tl]: targetLocation,
        [ae]: true,
        [nap]: noActivationPrompt,
      });
      // redirect
      if (target) {
        this.uriUtil.open(target);
      } else {
        this.uriUtil.assign();
      }
      return true;
    }
    return false;
  };

  logout = async () => {
    const logoutUrl = '/';
    window.LocalStorageUtil?.remove('ali');
    window.LocalStorageUtil?.remove('userInfo');
    if (!this.isProtectedPage) {
      Authentication.setRedirectionCookie('logout');
    }
    await Authentication.expireLoginCookies();
    Authentication.expireLoginUrlSfCookie();
    // dispatch
    store.dispatch(authLogout());
    // call handlers
    this.callHandlers('logout');
    // logout from UNO and redirect
    if (this.logoutProfileUrl) {
      openHiddenIframe(this.logoutProfileUrl)
        .then(() => window.location.assign(logoutUrl))
        // eslint-disable-next-line no-console
        .catch(() => console.warn('Could not log out user.'));
    } else {
      window.location.assign(logoutUrl);
    }
    return true;
  };

  setHandler = (event, method) => {
    if (!event || typeof event !== 'string' || typeof method !== 'function') {
      // eslint-disable-next-line no-console
      console.error(
        'Authentication -> setHandler - Invalid arguments: ',
        event,
        method,
      );
      return;
    }
    if (this.handlers[event] === undefined) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(method);
  };

  callHandlers(event) {
    if (Array.isArray(this.handlers[event])) {
      this.handlers[event].forEach((method) => method());
    }
  }

  hasLoggedInHere(loginFrom) {
    let alreadyLoggedIn = false;
    if (
      this.authenticationData.isLoggedIn
      && !window.LocalStorageUtil.get('ali')
    ) {
      window.LocalStorageUtil.set('ali', true);
      alreadyLoggedIn = true;
    }
    return (
      alreadyLoggedIn
      && Authentication.getCurrentLocation().indexOf(loginFrom) > -1
    );
  }

  async processUserData(user = {}) {
    const guidPattern = /ur\d+/gi;
    //  salesforce userdata
    await this.processSalesforceData(user);
    if (!this.isMobileLogin) {
      const isFirstLoadAfterLogin = this.hasLoggedInHere(user.loginFrom);
      Authentication.setDataLayer('LoggedInHere', {
        userId: !guidPattern.test(user.onePass) ? user.userId : user.onePass,
        company: user.company,
        companyType: user.companyType,
        country: user.country,
        jobRole: user.jobRole,
        hasLoggedInHere: isFirstLoadAfterLogin,
        hasRegisteredHere: user.firstLogIn && isFirstLoadAfterLogin,
      });
      if (user.firstLogIn) {
        Authentication.setDataLayer('FreshRegistration', {
          email: user.email,
          urCode: user.onePass,
          redirectionCookie: user.loginFrom,
        });
      }
      this.authenticationData.loginInfo = Authentication.makeUpResponse(user);
      this.resolveLoginPromise(this.authenticationData.loginInfo);
    } else {
      window.location.replace(
        `${this.schemaForMobile}://?${JSON.stringify(user)}`,
      );
    }
  }

  async processSalesforceData(user) {
    if (this.authenticationData.isLoggedIn) {
      const userInfo = window.LocalStorageUtil?.get('userInfo', true);
      if (!userInfo?.userId) {
        const userData = await getUserInfo(user);
        window.LocalStorageUtil?.set('userInfo', userData);
      }
    } else {
      window.LocalStorageUtil?.remove('userInfo');
    }
  }

  async checkLoginStatus() {
    const authAction = Authentication.getAuthActionCookie();
    if (authAction) {
      this.callHandlers(`${authAction}_redirection`);
      Authentication.expireAuthActionCookie();
    }
    const {
      userId: _userId,
      cmeToken: _cmeToken,
      fgp: _fgp,
      userinfo: _userinfo,
    } = Authentication.getLoginCookies();
    let isLoggedIn = false;
    if (_cmeToken && _userId) {
      ({ isLoggedIn } = await getIsLoggedIn({
        secureFgp: _fgp,
        userId: _userId,
        cmeToken: _cmeToken,
      }));
    }
    this.authenticationData.isLoggedIn = isLoggedIn;
    if (isLoggedIn) {
      this.processUserData(_userinfo);
    } else {
      const redirectionCookie = Authentication.getRedirectionCookie();
      if (redirectionCookie?.flow === 'logout') {
        this.resolveLoginPromise();
        this.checkRedirection(redirectionCookie);
        return false;
      }
      if (document.referrer === 'https://login.cmegroup.com/') {
        this.login(window.location.href);
        return false;
      }
      const xAuthToken = this.uriUtil.getQuery('X-Auth-Token');
      if (!xAuthToken) {
        this.resolveLoginPromise();
        return false;
      }
      const user = await getLoginData(xAuthToken);
      if (!user?.userinfo?.userId) {
        this.resolveLoginPromise();
        return false;
      }
      await Authentication.setLoginCookies(user);
      this.authenticationData.isLoggedIn = true;
      this.processUserData(user.userinfo);
      this.checkRedirection(redirectionCookie);
    }
    return true;
  }

  static setDataLayer(
    event,
    data,
  ) {
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        ...data,
        event,
      });
    }
  }

  static makeUpResponse(data) {
    const fixEncode = (text) => decodeURI(text).replace(/\+/g, ' ');
    return {
      ...data,
      userId: `${data.userId}`,
      userName: fixEncode(data.userName),
      firstName: fixEncode(data.firstName),
      lastName: fixEncode(data.lastName),
      jobRole: fixEncode(data.jobRole),
      company: fixEncode(data.company),
      companyType: fixEncode(data.companyType),
    };
  }
}

export const authentication = new Authentication();
