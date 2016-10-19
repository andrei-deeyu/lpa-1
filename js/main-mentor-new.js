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
(function(firebase, authModule) {

  /**
   * UI Elements cache.
   */
  const ELEMENTS = {
    signOut: document.getElementById('lpa-sign-out'),
    signIn: document.getElementById('lpa-sign-in'),
    mentorsListTemplate: document.getElementById('lpa-mentors-list-template'),
    mentorsList: document.getElementById('lpa-mentors-list'),
    attendeesListTemplate: document.getElementById('lpa-attendees-list-template'),
    attendeesList: document.getElementById('lpa-attendees-list'),
    mainNav: document.getElementById('lpa-main-nav'),
    message: document.getElementById('lpa-message'),
    toast: document.getElementById('lpa-toast')
  };

  /**
   * Component responsible for HTML modification.
   */
  let UI = {
    updateUser: function(user) {
      document.body.classList.toggle('lpa-signed-in', !!user);
      if (user) {
        UI.showSubpage('schedule');
      } else {
        UI.showSubpage('signin');
        ELEMENTS.mentorsList.innerHTML = '';
      }
    },
    updateMentorsList: function(mentorSnapshots) {
      ELEMENTS.mentorsList.innerHTML = '';
      if (mentorSnapshots) {
        mentorSnapshots.forEach(function(mentorSnapshot) {
          let node = ELEMENTS.mentorsListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="name"]').innerText = mentorSnapshot.val().name;
          node.querySelector('[data-field="bio"]').innerText = mentorSnapshot.val().bio;
          ELEMENTS.mentorsList.appendChild(node);
        });
      }
    },
    updateAttendeesList: function(attendeeSnapshots) {
      ELEMENTS.attendeesList.innerHTML = '';
      if (attendeeSnapshots) {
        attendeeSnapshots.forEach(function(attendeeSnapshot) {
          let node = ELEMENTS.attendeesListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="name"]').innerText = attendeeSnapshot.val().name;
          ELEMENTS.attendeesList.appendChild(node);
        });
      }
    },
    showSubpage: function(subpageName) {
      document.querySelectorAll('.lpa-subpage').forEach(function(subpage) {
        subpage.classList.remove('lpa-active');
      });
      let subpage = document.getElementById('lpa-' + subpageName + '-subpage');
      subpage.classList.add('lpa-active');
    },
    updateOnlineStatus: function() {

    }
  };

  /**
   * Event listeners.
   */
  ELEMENTS.mainNav.addEventListener('click', function(e) {
    e.preventDefault();
    let subpageName = e.target.getAttribute('data-subpage');
    if (subpageName) {
      UI.showSubpage(subpageName);
    }
  });
  ELEMENTS.signIn.addEventListener('click', authModule.authWithGoogle);
  ELEMENTS.signOut.addEventListener('click', function(e) {
    e.preventDefault();
    authModule.signOut();
  });

  firebase.auth().onAuthStateChanged(function(user) {
    UI.updateUser(user);
    if (user) {
      // Fetch mentors from the backend.
      firebase.database().ref('mentors/').once('value').then(function(snapshot) {
        UI.updateMentorsList(snapshot);
      });
      // Fetch attendees from the backend.
      firebase.database().ref('attendees/').once('value').then(function(snapshot) {
        UI.updateAttendeesList(snapshot);
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
    ELEMENTS.message.innerHTML = 'You are in offline mode. Data may be stale.';
    ELEMENTS.message.classList.remove('hide');
  };

  window.addEventListener("offline", function(e) {
    ELEMENTS.message.innerHTML = 'You are in offline mode. Data may be stale.';
    ELEMENTS.message.classList.remove('hide');
  }, false);


  window.addEventListener("online", function(e) {
    ELEMENTS.message.classList.add('hide');
  }, false);




})(firebase, authModule);
