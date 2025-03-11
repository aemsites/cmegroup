function init() {
  if (document.cookie.indexOf('redirectionCookie') < 0) { window.location.href = '/'; }
}

export default async function decorate(block) {
  block.innerHTML = `
    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    <p>One moment please, we're logging you in...</p>
  `;

  init();
}
