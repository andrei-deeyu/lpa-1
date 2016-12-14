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
