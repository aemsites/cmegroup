// import store from 'store';
import { authentication } from './Authentication.js';
import {
  i18n,
  showAuthToast,
} from '../utils.js';

export class AuthRedirectionHandler {
  async initializeLabels() {
    const [
      logoutToast,
    ] = await Promise.all([
      i18n('You are now logged out from CMEGroup.com. You may still be logged into other CME Group applications. To completely log out from all CME applications, please close your browser'),
    ]);

    this.logoutToast = logoutToast;
  }

  handleLoad() {
    authentication?.setHandler('logout_redirection', async () => {
      await this.initializeLabels();
      showAuthToast(
        this.logoutToast,
        'success',
        true,
      );
    });
  }
}

export const authRedirectionHandler = new AuthRedirectionHandler();
