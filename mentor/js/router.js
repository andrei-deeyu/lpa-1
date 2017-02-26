/**
 * JS for the mentor web app
 * Author: Ido Green, Ewa Gasperowicz
 * Date: 10/2016
 * V0.9
 * A 🐱 App
 *
 * TODO: Add Analytics support.
 * TODO: Add Transition animations.
 * TODO: Use ES6 modules.
 */
var router = (function(firebaseApi, authModule) {

  const BASE_URL = '/mentor';

  function getParentNodeByType(el, nodeType) {
    while (el && el.tagName !== nodeType) {
       el = el.parentNode;
    }
    return el;
  };

  function navigate(e) {
    e.preventDefault();
    let linkEl = getParentNodeByType(e.target, 'A');
    let subpageName = linkEl.getAttribute('data-subpage');
    let url = BASE_URL + '/' + subpageName;
    if (subpageName) {
      window.history.pushState(null, null, url);
      UI.showSubpage(subpageName);
    }
  };

  let router = {
    go: (subpageName, itemKey) => {
      let name = (subpageName === 'startups' && itemKey) ? 'startup' : subpageName;
      let subpage = UI.showSubpage(name);
      let initPage = subpage.getAttribute('data-init');
      if (initPage) {
        let item = firebaseApi.CACHE[subpageName][itemKey];
        UI[initPage](item);
      }
    }
  };

  window.addEventListener("popstate", function(e) {
    let urlParts = window.location.pathname.split('/');
    if (urlParts.length > 2 && urlParts[3]) {
      router.go(urlParts[2], urlParts[3]);
    }
  }, false);

  return router;
})(firebaseApi, authModule);
