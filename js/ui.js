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
    mainNav: document.getElementById('lpa-main-nav'),
    message: document.getElementById('lpa-message'),
    datepicker: document.getElementById('schedule-datepicker'),
    scheduleList: document.getElementById('lpa-schedule-list'),
    scheduleListTemplate: document.getElementById('lpa-schedule-list-template')
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
    showSubpage: function(subpageName) {
      document.querySelectorAll('.lpa-subpage').forEach(function(subpage) {
        subpage.classList.remove('lpa-active');
      });
      let subpage = document.getElementById('lpa-' + subpageName + '-subpage');
      subpage.classList.add('lpa-active');
    },
    displaySchedule: function(schedule) {
      ELEMENTS.scheduleList.innerHTML = '';
      if (schedule) {
        console.log(Object.keys(schedule));
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
    }
  };

  return UI;
})();
