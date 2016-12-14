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
var UI = (function(firebaseApi, authModule, router) {

  const BASE_URL = '/index-mentor-new.html';

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
    userNav: document.getElementById('lpa-user-nav'),
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
    surveyNotesField: document.getElementById('lpa-survey-notes'),
    surveyActionItemsField: document.getElementById('lpa-survey-actionitems'),
    startupShowNotes: document.getElementById('lpa-startup-show-notes'),
    startupNotesTemplate: document.getElementById('lpa-startup-notes-template'),
    startupNotes: document.getElementById('lpa-startup-notes'),
    chooseStartupBtn: document.getElementById('lpa-choose-startup-btn'),
    chooseStartupMenu: document.getElementById('lpa-choose-startup-menu'),
    chooseStartup: document.getElementById('lpa-choose-startup'),
    profileForm: document.getElementById('lpa-profile-form'),
    profileSubmit: document.getElementById('lpa-profile-submit'),
    camera: document.getElementById('lpa-camera'),
    cameraPreview: document.getElementById('lpa-camera-preview')
  };

  function getParentNodeByType(el, nodeType) {
    while (el && el.tagName !== nodeType) {
       el = el.parentNode;
    }
    return el;
  };

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
  };

  function navigate(e) {
    e.preventDefault();
    let linkEl = getParentNodeByType(e.target, 'A');
    let subpageName = linkEl.getAttribute('data-subpage');
    if (subpageName) {
      window.history.pushState(null, null, BASE_URL + '/' + subpageName);
      UI.showSubpage(subpageName);
    }
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
    updateMentor: () => {
      let fields = ELEMENTS.profileForm;
      let mentor = firebaseApi.CURRENT_MENTOR;
      fields['lpa-profile-name'].value = mentor.name || '';
      fields['lpa-profile-email'].value = mentor.email || '';
      fields['lpa-profile-phone'].value = mentor.phone || '';
      fields['lpa-profile-country'].value = mentor.country || '';
      fields['lpa-profile-city'].value = mentor.city || '';
      fields['lpa-profile-twitter'].value = mentor.twitter || '';
      fields['lpa-profile-bio'].innerHTML = mentor.bio || '';
      fields['lpa-profile-funfact'].innerHTML = mentor.funFact || '';
      fields['lpa-profile-expertise'].innerHTML = mentor.expertise || '';
      fields['lpa-profile-linkedin'].value = mentor.linkedin || '';
      fields['lpa-profile-site'].value = mentor.site || '';
      fields['lpa-profile-pictureurl'].value = mentor.pic || '';
      fields['lpa-profile-comments'].value = mentor.comments || '';
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
      window.scrollTo(0, 0);
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
              'click', UI.showSurvey.bind(null, session));
        });
      } else {
        ELEMENTS.scheduleList.innerHTML = '<li>Sorry, no sessions found for this date.</li>';
      }
    },
    showSurvey: function(session) {
      UI.resetSurvey(session);
      ELEMENTS.survey.showModal();
    },
    resetSurvey: function(session) {
      let startup = session ? session.startup : window.location.pathname.split('/')[3];
      if (startup) {
        ELEMENTS.survey.querySelector(
            '#lpa-survey-startup').value = startup;
        ELEMENTS.chooseStartup.classList.add('hidden');
      } else {
        ELEMENTS.chooseStartup.classList.remove('hidden');
      }
      startup = startup || 'a startup';
      ELEMENTS.survey.querySelector(
          '.mdl-dialog__title').innerHTML = 'Add notes for ' + startup;
      let today = new Date();
      let todayIso = today.toISOString();
      ELEMENTS.survey.session = session;
      console.log(session)
      let sessionText = session ?
          'Session: ' + session.date + ' at ' + session.starttime :
          'Unscheduled session: ' + todayIso.slice(0, 10) + ' ' + todayIso.slice(11, 16);
      ELEMENTS.survey.querySelector(
          '#lpa-survey-session-datetime').innerHTML = sessionText;
      let notes = session ? session.notes : {};
        ELEMENTS.survey.querySelector(
            '#lpa-survey-receptive').value = notes.receptive || 3;
        ELEMENTS.survey.querySelector(
            '#lpa-survey-effective').value = notes.effective || 3;
        ELEMENTS.surveyNotesField.innerHTML = notes.meetingNotes || '';
        ELEMENTS.surveyNotesField.parentNode.classList.toggle(
          'is-dirty', notes.meetingNotes);
        ELEMENTS.surveyActionItemsField.innerHTML = notes.actionitems || '';
        ELEMENTS.surveyNotesField.parentNode.classList.toggle(
          'is-dirty', !!notes.meetingNotes);
      ELEMENTS.surveyNotesField.parentNode.classList.remove('is-invalid');
      ELEMENTS.survey.querySelector('.lpa-survey-error').classList.add('hidden');
    },
    addListeners: function() {
      ELEMENTS.mainNav.addEventListener('click', navigate);
      ELEMENTS.userNav.addEventListener('click', e => {
        ELEMENTS.mainNav.querySelectorAll('.is-active').forEach(function(link) {
          link.classList.remove('is-active');
        });
        navigate(e);
      });
      ELEMENTS.drawerNav.addEventListener('click', function(e) {
        navigate(e);
        ELEMENTS.mdlLayout.MaterialLayout.toggleDrawer();
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
        ELEMENTS.survey.querySelector(
            '#lpa-survey-startup').value = startupKey;
        ELEMENTS.survey.querySelector(
            '.mdl-dialog__title').innerHTML = 'Add notes for ' + startupKey;
      });

      ELEMENTS.surveyBtn.addEventListener('click', function() {
        let mentorId = firebaseApi.CURRENT_MENTOR_ID;
        UI.showSurvey();
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
        let fields = ELEMENTS.survey.querySelector('form').elements;
        let session = ELEMENTS.survey.session;
        let startup = fields['lpa-survey-startup'].value;
        let imgs = [];
        ELEMENTS.survey.querySelectorAll('.lpa-survey-img').forEach(img => {
          imgs.push(img.src);
        });
        let today = new Date();
        let note = {
          'actionItems' : fields['lpa-survey-actionitems'].value,
          'date' : today.toISOString(),
          'effective' : fields['lpa-survey-effective'].value,
          'endtime' : fields['lpa-survey-endtime'].value,
          'starttime' : fields['lpa-survey-starttime'].value,
          'meetingNotes' : fields['lpa-survey-notes'].value,
          'receptive' : fields['lpa-survey-receptive'].value,
          'imgs': imgs,
          'unixTime' : today.getTime()
        };

        let valid = true;
        if (!fields['lpa-survey-notes'].value) {
          fields['lpa-survey-notes'].parentNode.classList.add('is-invalid');
          valid = false;
        }
        if (!startup) {
          ELEMENTS.survey.querySelector(
              '.lpa-survey-error').classList.remove('hidden');
          valid = false;
        }
        if (valid) {
          firebaseApi.saveSessionNotes(note, startup, session).then(() => {
            ELEMENTS.survey.close();
          });
        }
      });

      ELEMENTS.startupsList.addEventListener('click', function(e) {
        var li = getParentNodeByType(e.target, 'LI');
        if (li) {
          var url = BASE_URL + '/startups/' + li.getAttribute('data-key');
          go(url);
        }
      });
      ELEMENTS.profileSubmit.addEventListener('click', function(e) {
        let fields = ELEMENTS.profileForm.elements;
        let mentorId = firebaseApi.CURRENT_MENTOR_ID;
        let mentor = {
          'name': fields['lpa-profile-name'].value,
          'email': fields['lpa-profile-email'].value, // should be not editable?
          'phone': fields['lpa-profile-phone'].value,
          'country': fields['lpa-profile-country'].value,
          'city': fields['lpa-profile-city'].value,
          //'domain': fields['lpa-profile-name'].value,
          //'domainSec': $("#form-domain-sec-select option':selected").text(),
          'twitter': fields['lpa-profile-twitter'].value,
          'bio': fields['lpa-profile-bio'].value,
          'funFact': fields['lpa-profile-funfact'].value,
          'expertise': fields['lpa-profile-expertise'].value,
          'linkedin': fields['lpa-profile-linkedin'].value,
          'site': fields['lpa-profile-site'].value,
          'pic': fields['lpa-profile-pictureurl'].value,
          'comments': fields['lpa-profile-comments'].value,
          'unixTime': new Date().getTime(),
          'date': new Date().toISOString()
        };
        firebaseApi.saveMentor(mentorId, mentor);
      });
      ELEMENTS.camera.addEventListener('change', e => {
        let file = e.target.files[0];
        let link = document.createElement('a');
        link.setAttribute('target', '_blank');
        ELEMENTS.cameraPreview.appendChild(link);
        let imgUrl = URL.createObjectURL(file);
        link.setAttribute('style', 'background-image: url(\'' + imgUrl + '\')');
        let progressCallback = function(snapshot) {
            let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            link.innerHTML = Math.round(progress) + '%';
        };
        let completeCallback = function(snapshot) {
          link.setAttribute('href', snapshot.downloadURL);
          link.innerHTML = '';
        };
        firebaseApi.uploadImage(file, progressCallback, completeCallback);
      });
    }
  };
  return UI;
})(firebaseApi, authModule, router);
