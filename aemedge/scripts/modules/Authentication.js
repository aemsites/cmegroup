// import store from 'store';
import { URIUtil, openHiddenIframe } from '../utils/index.js';
// import { authLogin, authLogout } from '../actions/authentication';
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
          // dispatch redux
          // store.dispatch(authLogin(fn !== reject ? value : undefined));
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
    // if (
    //   typeof window.authenticationOptions !== 'undefined'
    //   && typeof window.globalConfig !== 'undefined'
    // ) {
    //   this.loginProcessUrl = window.authenticationOptions.loginProcessUrl || '';
    //   this.loginUrl = window.authenticationOptions.loginUrl || '';
    //   this.registerUrl = window.authenticationOptions.registerUrl || '';
    //   this.logoutUrl = window.authenticationOptions.logoutUrl || '';
    //   this.logoutProfileUrl = window.authenticationOptions.logoutProfileUrl || '';
    //   this.isMobileLogin = window.authenticationOptions.mobileLogin || false;
    //   this.schemaForMobile = window.authenticationOptions.schemaForMobile || '';
    //   this.isProtectedPage = window.globalConfig.isProtectedPage || false;
    //   this.authorMode = window.globalConfig.authorMode || false;
    //   this.loginProcessUrl = '/content/cmegroup/en/login-confirmed.html';
    //   return true;
    // }
    // // eslint-disable-next-line no-console
    // console.warn('Warning: Authentication config not found!');
    // return false;

    this.loginProcessUrl = '/login-confirmed';
    this.loginUrl = 'http://authnr.cmegroup.com/idp/startSSO.ping?PartnerSpId=https://current.www-qa.cmegroup.com';
    this.registerUrl = 'https://login.cmegroup.com/sso/register/';
    this.logoutUrl = '/libs/cmegroup/security/logout';
    this.logoutProfileUrl = 'https://myprofile.cmegroup.com/admin/ssoflo';
    this.isMobileLogin = false;
    this.schemaForMobile = '';
    this.isProtectedPage = false;
    this.authorMode = false;

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

  setRedirectionCookie(flow, location) {
    // remove cookie after 30 minutes of creation to prevent users hitting login svc over and over
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);
    if (flow === 'login' || flow === 'registration') {
      window.CookieUtil?.set('saml_request_path', this.loginProcessUrl, {
        expires,
      });
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
    window.CookieUtil?.remove('saml_request_path');
    return !Authentication.getRedirectionCookie();
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

  checkRedirection() {
    const redirectionCookie = Authentication.getRedirectionCookie();
    if (redirectionCookie) {
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
    }
    return false;
  }

  login = (
    targetLocation = Authentication.getCurrentLocation(),
    target = '',
    targetDescription = '',
  ) => {
    if (this.loginUrl.length) {
      this.setRedirectionCookie('login', targetLocation);
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
      this.setRedirectionCookie('registration', targetLocation);
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

  logout = () => {
    if (this.logoutUrl.length) {
      window.localStorage.removeItem('ali');
      if (!this.isProtectedPage) {
        this.setRedirectionCookie('logout');
      }
      Authentication.expireLoginUrlSfCookie();
      // dispatch redux
      // store.dispatch(authLogout());
      // call handlers
      this.callHandlers('logout');
      // logout from UNO and redirect
      if (this.logoutProfileUrl) {
        openHiddenIframe(this.logoutProfileUrl)
          .then(() => window.location.assign(this.logoutUrl))
          // eslint-disable-next-line no-console
          .catch(() => console.warn('Could not log out user.'));
      } else {
        window.location.assign(this.logoutUrl);
      }
      window.LocalStorageUtil?.remove('userInfo');
      return true;
    }
    return false;
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
      && !window.localStorage.getItem('ali')
    ) {
      window.localStorage.setItem('ali', true);
      alreadyLoggedIn = true;
    }
    return (
      alreadyLoggedIn
      && Authentication.getCurrentLocation().indexOf(loginFrom) > -1
    );
  }

  async processUserData(user) {
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
      if (!userInfo) {
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
    const data = await getIsLoggedIn();
    if (data) {
      this.authenticationData.isLoggedIn = data.isLoggedIn;
      const redirectionCookie = Authentication.getRedirectionCookie();
      const loginUrlSfCookie = Authentication.getLoginUrlSfCookie();
      if (this.authenticationData.isLoggedIn) {
        const userInfo = window.CookieUtil?.get('userinfo', true) || {};
        this.processUserData(userInfo);
      } else if (redirectionCookie || this.authorMode) {
        if (!this.authorMode && redirectionCookie.flow === 'logout') {
          this.resolveLoginPromise();
          this.checkRedirection();
        } else {
          const location = this.authorMode
            ? Authentication.getCurrentLocation()
            : encodeURIComponent(loginUrlSfCookie?.location);
          const user = await getLoginData(location, loginUrlSfCookie?.title);
          if (user) {
            if (user.userId) {
              this.authenticationData.isLoggedIn = true;
              this.processUserData(user);
              if (this.loginProcessUrl) {
                this.checkRedirection();
              }
            } else {
              // if user doesn't login in saml...
              this.resolveLoginPromise();
            }
          } else {
            this.resolveLoginPromise();
          }
        }
      } else {
        this.resolveLoginPromise();
      }
    } else {
      this.resolveLoginPromise();
    }
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
      userId: `${data.userId} `,
      userName: fixEncode(data.userName),
      firstName: fixEncode(data.firstName),
      lastName: fixEncode(data.lastName),
      jobRole: fixEncode(data.jobRole),
      company: fixEncode(data.company),
      companyType: fixEncode(data.companyType),
    };
  }

  inLoginProcess() {
    return this.loginProcessUrl.indexOf(window.location.pathname) > -1;
  }
}

export const authentication = new Authentication();
