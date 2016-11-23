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

  UI.ELEMENTS.startupShowNotes.addEventListener('click', function(e) {
    UI.ELEMENTS.startupNotes.classList.toggle('hidden');
    let startupKey = window.location.pathname.split('/')[3];
    firebaseApi.fetchStartupNotes(startupKey).then(UI.displayStartupNotes);
  });

  if (!UI.ELEMENTS.startupSurvey.showModal) {
    dialogPolyfill.registerDialog(UI.ELEMENTS.startupSurvey);
  }

  UI.ELEMENTS.startupSurvey.querySelector('.close').addEventListener('click', function() {
    UI.ELEMENTS.startupSurvey.close();
  });

  UI.ELEMENTS.chooseStartup.addEventListener('click', function(e) {
    let startupKey = e.target.getAttribute('data-key');
    UI.resetSurvey(startupKey);
  });

  UI.ELEMENTS.startupSurveyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      dialog.showModal();
      let startupKey = window.location.pathname.split('/')[3] || 'a startup';
      UI.resetSurvey(startupKey);
    });
  });

  UI.ELEMENTS.startupSurvey.querySelector(
    '#lpa-startup-survey-receptive').addEventListener('change', function(e) {
    UI.ELEMENTS.startupSurvey.querySelector(
      'span[for="lpa-startup-survey-receptive"]').innerHTML = e.target.value;
  });

  UI.ELEMENTS.startupSurvey.querySelector(
    '#lpa-startup-survey-effective').addEventListener('change', function(e) {
    UI.ELEMENTS.startupSurvey.querySelector(
      'span[for="lpa-startup-survey-effective"]').innerHTML = e.target.value;
  });

  UI.ELEMENTS.startupSurvey.addEventListener('submit', function(e) {
    e.preventDefault();
    // TODO: implement save notes action.
  });

  UI.ELEMENTS.startupsList.addEventListener('click', function(e) {
    var li = getParentNodeByType(e.target, 'LI');
    if (li) {
      var url = BASE_URL + '/startups/' + li.getAttribute('data-key');
      go(url);
    }
  });

  function getParentNodeByType(el, nodeType) {
    while (el && el.tagName !== nodeType) {
       el = el.parentNode;
    }
    return el;
  }

  function getMentorIdFromEmail(email) {
    return email.replace(/\./g, "-");
  }

  function getSchedule(day) {
    let mentorId = getMentorIdFromEmail(firebase.auth().currentUser.email);
    firebaseApi.fetchSchedule(day, mentorId).then(UI.displaySchedule);
  }

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

  firebase.auth().onAuthStateChanged(function(user) {
    UI.updateUser(user);
    if (user) {
      getSchedule(new Date().toISOString().slice(0, 10));
      firebaseApi.fetchMentorsList().then(UI.updateMentorsList);
      firebaseApi.fetchAttendeesList().then(UI.updateAttendeesList);
      firebaseApi.fetchStartupsList().then(UI.updateStartupsList);
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
