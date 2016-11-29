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



(function(firebaseApi, authModule, UI) {

  const BASE_URL = '/index-mentor-new.html';

  UI.addListeners();

  function go(url) {
    window.history.pushState(null, null, url);
    var urlParts = url.split('/');
    let subpageName = (urlParts[2] === 'startups' && urlParts[3]) ? 'startup' : urlParts[2];
    let subpage = UI.showSubpage(subpageName);
    let itemKey = urlParts[3];
    let initPage = subpage.getAttribute('data-init');
    if (initPage) {
      let item = firebaseApi.CACHE[urlParts[2]][itemKey];
      UI[initPage](item);
    }
  }

  firebase.auth().onAuthStateChanged(user => {
    firebaseApi.fetchMentor(firebaseApi.CURRENT_MENTOR_ID).then(mentor => {
      UI.updateMentor();
    }).catch(e=>console.log(e));
    UI.updateUser(user);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }

  if (!navigator.onLine) {
    UI.ELEMENTS.message.innerHTML = 'You are in offline mode. Data may be stale.';
    UI.ELEMENTS.message.classList.remove('hide');
  };

  window.addEventListener("offline", function(e) {
    UI.ELEMENTS.message.innerHTML = 'You are in offline mode. Data may be stale.';
    UI.ELEMENTS.message.classList.remove('hide');
  }, false);


  window.addEventListener("online", function(e) {
    UI.ELEMENTS.message.classList.add('hide');
  }, false);

})(firebaseApi, authModule, UI);
