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
var UI = (function() {

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
    startupsListTemplate: document.getElementById('lpa-startups-list-template'),
    startupsList: document.getElementById('lpa-startups-list'),
    mainNav: document.getElementById('lpa-main-nav'),
    message: document.getElementById('lpa-message'),
    datepicker: document.getElementById('schedule-datepicker'),
    scheduleList: document.getElementById('lpa-schedule-list'),
    scheduleListTemplate: document.getElementById('lpa-schedule-list-template'),
    startupPageContent: document.getElementById('lpa-startup'),
    startupPageTemplate: document.getElementById('lpa-startup-template'),
    startupSurveyBtn: document.getElementById('lpa-startup-survey-btn'),
    startupSurveyBtns: document.querySelectorAll('.lpa-survey-btn'),
    startupSurvey: document.getElementById('lpa-startup-survey'),
    startupShowNotes: document.getElementById('lpa-startup-show-notes'),
    startupNotesTemplate: document.getElementById('lpa-startup-notes-template'),
    startupNotes: document.getElementById('lpa-startup-notes'),
    chooseStartupBtn: document.getElementById('lpa-choose-startup-btn'),
    chooseStartup: document.getElementById('lpa-choose-startup')
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
      ELEMENTS.chooseStartup.innerHTML = '';
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
          ELEMENTS.chooseStartup.appendChild(li);
        });
        ELEMENTS.chooseStartup.classList.add('mdl-menu',
            'mdl-menu--bottom-right', 'mdl-js-menu', 'mdl-js-ripple-effect');
        // Upgrade dynamicly created element to use MDL features.
        componentHandler.upgradeElement(ELEMENTS.chooseStartup);
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
      if (schedule) {
        let keys = Object.keys(schedule);
        keys.forEach(function(key) {
          let session = schedule[key];
          let node = ELEMENTS.scheduleListTemplate.cloneNode(true);
          node.removeAttribute('id');
          node.classList.remove('lpa-template');
          node.querySelector('[data-field="starttime"]').innerText = session.starttime;
          node.querySelector('[data-field="location"]').innerText = session.location;
          node.querySelector('[data-field="startup"]').innerText = session.startup;
          ELEMENTS.scheduleList.appendChild(node);
        });
      } else {
        ELEMENTS.scheduleList.innerHTML = '<li>Sorry, no sessions found for this date.</li>';
      }
    },
    resetSurvey: function(startupKey) {
      ELEMENTS.startupSurvey.querySelector(
          '.mdl-dialog__title').innerHTML = 'Add notes for ' + startupKey;
      ELEMENTS.startupSurvey.querySelector(
          '#lpa-startup-survey-startup').value = startupKey;
    }
  };

  return UI;
})();
