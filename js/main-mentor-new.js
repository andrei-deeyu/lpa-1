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

  /**
   * Event listeners.
   */
  UI.ELEMENTS.mainNav.addEventListener('click', function(e) {
    e.preventDefault();
    let subpageName = e.target.getAttribute('data-subpage');
    if (subpageName) {
      UI.showSubpage(subpageName);
    }
  });
  UI.ELEMENTS.signIn.addEventListener('click', authModule.authWithGoogle);
  UI.ELEMENTS.signOut.addEventListener('click', function(e) {
    e.preventDefault();
    authModule.signOut();
  });
  UI.ELEMENTS.datepicker.setAttribute('value', new Date().toISOString().slice(0, 10));
  UI.ELEMENTS.datepicker.addEventListener('change', function(e) {
    getSchedule(e.target.value);
  });

  function getMentorIdFromEmail(email) {
    return email.replace(/\./g, "-");
  }

  function getSchedule(day) {
    let mentorId = getMentorIdFromEmail(firebase.auth().currentUser.email);
    firebaseApi.fetchSchedule(day, mentorId).then(UI.displaySchedule);
  }

  firebase.auth().onAuthStateChanged(function(user) {
    UI.updateUser(user);
    if (user) {
      getSchedule(new Date().toISOString().slice(0, 10));
      firebaseApi.fetchMentorsList().then(UI.updateMentorsList);
      firebaseApi.fetchAttendeesList().then(UI.updateAttendeesList);
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

})(firebaseApi, authModule, UI);
