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

  function sendGaEvent(category, action, label) {
    ga('send', {
      hitType: 'event',
      eventCategory: category,
      eventAction: action,
      eventLabel: label
    });
  };

  firebase.auth().onAuthStateChanged(user => {
    UI.updateUser(user);
    if (user) {
      sendGaEvent('sign-in-mentor', 'authenticated user.uid: ' + user.uid,
          'authentication: ' + firebaseApi.CURRENT_MENTOR_ID);
      firebaseApi.fetchMentor(firebaseApi.CURRENT_MENTOR_ID).then(mentor => {
        UI.updateMentor();
      }).catch(error => {
        ga('send', {
          hitType: 'event',
          eventCategory: 'check-mentor',
          eventAction: 'fetch-not-registered-mentor',
          eventLabel: 'key: ' + firebaseApi.CURRENT_MENTOR_ID
        });
      });
    }
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

  window.onerror = function(msg, url, lineNumber) {
    ga('send', {
      hitType: 'event',
      eventCategory: 'mentor-gen-error',
      eventAction: 'msg: ' + msg,
      eventLabel: 'url: ' + url + " line: " + lineNumber
    });
  };

})(firebaseApi, authModule, UI);
