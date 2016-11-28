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
var UI = (function(firebaseApi, authModule) {

  /**
   * UI Elements cache.
   */
  const ELEMENTS = {
    mentorsListTemplate: document.getElementById('lpa-mentors-list-template'),
    mentorsList: document.getElementById('lpa-mentors-list'),
    attendeesListTemplate: document.getElementById('lpa-attendees-list-template'),
    attendeesList: document.getElementById('lpa-attendees-list'),
    startupsListTemplate: document.getElementById('lpa-startups-list-template'),
    startupsList: document.getElementById('lpa-startups-list'),
    mainNav: document.getElementById('lpa-main-nav'),
    mdlLayout: document.querySelector('.mdl-layout'),
    drawer: document.getElementById('lpa-drawer'),
    drawerNav: document.getElementById('lpa-drawer-nav'),
    message: document.getElementById('lpa-message'),
    datepicker: document.getElementById('schedule-datepicker'),
    scheduleList: document.getElementById('lpa-schedule-list'),
    scheduleListTemplate: document.getElementById('lpa-schedule-list-template'),
    startupPageContent: document.getElementById('lpa-startup'),
    startupPageTemplate: document.getElementById('lpa-startup-template'),
    surveyBtn: document.getElementById('lpa-survey-btn'),
    surveyBtns: document.querySelectorAll('.lpa-survey-btn'),
    survey: document.getElementById('lpa-survey'),
    surveySubmit: document.getElementById('lpa-survey-submit'),
    startupShowNotes: document.getElementById('lpa-startup-show-notes'),
    startupNotesTemplate: document.getElementById('lpa-startup-notes-template'),
    startupNotes: document.getElementById('lpa-startup-notes'),
    chooseStartupBtn: document.getElementById('lpa-choose-startup-btn'),
    chooseStartupMenu: document.getElementById('lpa-choose-startup-menu'),
    chooseStartup: document.getElementById('lpa-choose-startup')
  };

  function getParentNodeByType(el, nodeType) {
    while (el && el.tagName !== nodeType) {
       el = el.parentNode;
    }
    return el;
  };

  /**
   * Component responsible for HTML modification.
   */
  let UI = {
    ELEMENTS: ELEMENTS,
    updateUser: function(user) {
      document.body.classList.toggle('lpa-signed-in', !!user);
      if (user) {
        UI.showSubpage('schedule');
      } else {
        UI.showSubpage('signin');
        ELEMENTS.mentorsList.innerHTML = '';
      }
      if (ELEMENTS.drawer.classList.contains('is-visible')) {
        ELEMENTS.mdlLayout.MaterialLayout.toggleDrawer();
      }
    },
    updateMentorsList: function(mentorSnapshots) {
      ELEMENTS.mentorsList.innerHTML = '';
      if (mentorSnapshots) {
        mentorSnapshots.forEach(function(mentorSnapshot) {
          let node = ELEMENTS.mentorsListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="name"]').innerText = mentorSnapshot.name;
          node.querySelector('[data-field="bio"]').innerText = mentorSnapshot.bio;
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
          node.querySelector('[data-field="name"]').innerText = attendeeSnapshot.name;
          ELEMENTS.attendeesList.appendChild(node);
        });
      }
    },
    updateStartupsList: function(startups) {
      // Update /startups page.
      ELEMENTS.startupsList.innerHTML = '';
      // Update startups dropdown in the survey.
      ELEMENTS.chooseStartupMenu.innerHTML = '';
      if (startups) {
        startups.forEach(function(startup) {
          let node = ELEMENTS.startupsListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.setAttribute('data-key', startup.key);
          node.querySelector('[data-field="name"]').innerText = startup.name;
          node.querySelector('[data-field="description"]').innerText = startup.description;
          node.querySelector('[data-field="country"]').innerText = startup.country;
          node.querySelector('[data-field="city"]').innerText = startup.city;
          ELEMENTS.startupsList.appendChild(node);
          let li = document.createElement('li');
          li.classList.add('mdl-menu__item');
          li.setAttribute('data-key', startup.key);
          li.innerHTML = startup.name;
          ELEMENTS.chooseStartupMenu.appendChild(li);
        });
        ELEMENTS.chooseStartupMenu.classList.add('mdl-menu',
            'mdl-menu--bottom-right', 'mdl-js-menu', 'mdl-js-ripple-effect');
        // Upgrade dynamicly created element to use MDL features.
        componentHandler.upgradeElement(ELEMENTS.chooseStartupMenu);
      }
    },
    updateStartup: function(startup) {
      ELEMENTS.startupPageContent.innerHTML = '';
      let node = ELEMENTS.startupPageTemplate.cloneNode(true);
      node.removeAttribute('id');
      node.classList.remove('lpa-template');
      node.querySelector('[data-field="name"]').innerText = startup.name;
      node.querySelector('[data-field="country"]').innerText = startup.country;
      ELEMENTS.startupPageContent.appendChild(node);
    },
    displayStartupNotes: function(sessions) {
      ELEMENTS.startupNotes.innerHTML = '';
      if (sessions) {
        sessions.forEach(function(session) {
          let node = ELEMENTS.startupNotesTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="date"]').innerText = session.date;
          node.querySelector('[data-field="mentor"]').innerText = session.mentorKey;
          node.querySelector('[data-field="notes"]').innerText = session.meetingNotes;
          node.querySelector('[data-field="action-items"]').innerText = session.actionItems;
          ELEMENTS.startupNotes.appendChild(node);
        });
      }
    },
    showSubpage: function(subpageName) {
      document.querySelectorAll('.lpa-subpage').forEach(function(subpage) {
        subpage.classList.remove('lpa-active');
      });
      let subpage = document.getElementById('lpa-' + subpageName + '-subpage');
      subpage.classList.add('lpa-active');
      return subpage;
    },
    displaySchedule: function(schedule) {
      ELEMENTS.scheduleList.innerHTML = '';
      if (schedule.length) {
        schedule.forEach(function(session) {
          let node = ELEMENTS.scheduleListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="starttime"]').innerText = session.starttime;
          node.querySelector('[data-field="location"]').innerText = session.location;
          node.querySelector('[data-field="startup"]').innerText = session.startup;
          ELEMENTS.scheduleList.appendChild(node);
          let mentorId = firebaseApi.CURRENT_MENTOR_ID;
          node.querySelector('.lpa-survey-btn').addEventListener(
              'click', UI.showSurvey.bind(null, session, mentorId));
        });
      } else {
        ELEMENTS.scheduleList.innerHTML = '<li>Sorry, no sessions found for this date.</li>';
      }
    },
    showSurvey: function(session, mentorId) {
      //console.log('session', session.startup)
      let startupKey = session ? session.startup : window.location.pathname.split('/')[3];
      UI.resetSurvey(startupKey, mentorId, session);
      ELEMENTS.survey.showModal();
    },
    resetSurvey: function(startupKey, mentorId, session) {
      mentorId = mentorId || session.mentorId;
      ELEMENTS.chooseStartup.classList.toggle('hidden', startupKey && session);
      ELEMENTS.survey.querySelector(
          '#lpa-survey-startup').value = startupKey;
      startupKey = startupKey || 'a startup';
      ELEMENTS.survey.querySelector(
          '.mdl-dialog__title').innerHTML = 'Add notes for ' + startupKey;
      let today = new Date();
      let todayIso = today.toISOString();
      let sessionCopy = session || {
        path: null,
        date: todayIso.slice(0, 10),
        starttime: todayIso.slice(11, 16),
        endtime: todayIso.slice(11, 16)
      };
      sessionCopy.path = ['sessions', sessionCopy.date, 'mentors',
          mentorId, 'hour-' + today.getTime(), 'notes'].join('/');
      let sessionText = session ?
          'Session: ' + sessionCopy.date + ' at ' + sessionCopy.starttime :
          'Unscheduled session: ' + sessionCopy.date + ' ' + sessionCopy.starttime;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-session-datetime').innerHTML = sessionText;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-session').value = sessionCopy.path;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-date').value = sessionCopy.date;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-starttime').value = sessionCopy.starttime;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-endtime').value = sessionCopy.endtime;
    },
    addListeners: function() {
      ELEMENTS.mainNav.addEventListener('click', function(e) {
        e.preventDefault();
        let subpageName = e.target.getAttribute('data-subpage');
        if (subpageName) {
          UI.showSubpage(subpageName);
        }
      });
      ELEMENTS.drawerNav.addEventListener('click', function(e) {
        e.preventDefault();
        let subpageName = e.target.getAttribute('data-subpage');
        if (subpageName) {
          UI.showSubpage(subpageName);
          ELEMENTS.mdlLayout.MaterialLayout.toggleDrawer();
        }
      });
      ELEMENTS.mdlLayout.querySelectorAll('.lpa-sign-in').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          authModule.authWithGoogle();
        });
      });
      ELEMENTS.mdlLayout.querySelectorAll('.lpa-sign-out').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          authModule.signOut();
        });
      });
      ELEMENTS.datepicker.setAttribute('value', new Date().toISOString().slice(0, 10));
      ELEMENTS.datepicker.addEventListener('change', function(e) {
        firebaseApi.getCurrentMentorSchedule(
            e.target.value).then(UI.displaySchedule);
      });

      ELEMENTS.startupShowNotes.addEventListener('click', function(e) {
        ELEMENTS.startupNotes.classList.toggle('hidden');
        let startupKey = window.location.pathname.split('/')[3];
        firebaseApi.fetchStartupNotes(startupKey).then(UI.displayStartupNotes);
      });

      if (!ELEMENTS.survey.showModal) {
        dialogPolyfill.registerDialog(ELEMENTS.survey);
      }

      ELEMENTS.survey.querySelector('.close').addEventListener('click', function() {
        ELEMENTS.survey.close();
      });

      ELEMENTS.chooseStartupMenu.addEventListener('click', function(e) {
        let startupKey = e.target.getAttribute('data-key');
        let mentorId = firebaseApi.CURRENT_MENTOR_ID;
        UI.resetSurvey(startupKey, mentorId);
      });

      ELEMENTS.surveyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          let mentorId = firebaseApi.CURRENT_MENTOR_ID;
          UI.showSurvey(null, mentorId);
        });
      });

      ELEMENTS.survey.querySelector(
        '#lpa-survey-receptive').addEventListener('change', function(e) {
        ELEMENTS.survey.querySelector(
          'span[for="lpa-survey-receptive"]').innerHTML = e.target.value;
      });

      ELEMENTS.survey.querySelector(
        '#lpa-survey-effective').addEventListener('change', function(e) {
        ELEMENTS.survey.querySelector(
          'span[for="lpa-survey-effective"]').innerHTML = e.target.value;
      });

      ELEMENTS.survey.addEventListener('submit', e => e.preventDefault());
      ELEMENTS.surveySubmit.addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: implement save notes action.
        let fields = ELEMENTS.survey.querySelector('form').elements;
        let sessionPath = fields['lpa-survey-session'].value;
        let startup = fields['lpa-survey-startup'].value;
        let today = new Date();
        let note = {
          'actionItems' : fields['lpa-survey-actionitems'].value,
          'date' : today.toISOString(),
          'effective' : fields['lpa-survey-effective'].value,
          'endtime' : fields['lpa-survey-endtime'].value,
          'starttime' : fields['lpa-survey-starttime'].value,
          'meetingNotes' : fields['lpa-survey-notes'].value,
          'receptive' : fields['lpa-survey-receptive'].value,
          'unixTime' : today.getTime()
        }
        firebaseApi.saveSessionNotes(note, startup, sessionPath).then(() => {
          ELEMENTS.survey.close();
        });
      });

      ELEMENTS.startupsList.addEventListener('click', function(e) {
        var li = getParentNodeByType(e.target, 'LI');
        if (li) {
          var url = BASE_URL + '/startups/' + li.getAttribute('data-key');
          go(url);
        }
      });
    }
  };

  return UI;
})(firebaseApi, authModule);
