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

  const YOUTUBE_REGEX = /www\.youtube\.com\/watch\?v\=(\w+)\&*.*/;
  const VIMEO_REGEX = /www\.vimeo\.com\/(\w+)\&*.*/;

  const BASE_URL = '/mentor';

  /**
   * UI Elements cache.
   */
  const ELEMENTS = {
    main: document.getElementById('lpa-main'),
    mentorsList: document.getElementById('lpa-mentors-list'),
    attendeesList: document.getElementById('lpa-attendees-list'),
    startupsList: document.getElementById('lpa-startups-list'),
    mainNav: document.getElementById('lpa-main-nav'),
    userNav: document.getElementById('lpa-user-nav'),
    mdlLayout: document.querySelector('.lpa-layout'),
    drawer: document.getElementById('lpa-drawer'),
    drawerNav: document.getElementById('lpa-drawer-nav'),
    message: document.getElementById('lpa-message'),
    datepicker: document.getElementById('schedule-datepicker'),
    scheduleList: document.getElementById('lpa-schedule-list'),
    startupPageContent: document.getElementById('lpa-startup'),
    surveyBtn: document.getElementById('lpa-survey-btn'),
    surveyBtns: document.querySelectorAll('.lpa-survey-btn'),
    survey: document.getElementById('lpa-survey'),
    surveySubmit: document.getElementById('lpa-survey-submit'),
    surveyNotesField: document.getElementById('lpa-survey-notes'),
    surveyActionItemsField: document.getElementById('lpa-survey-actionitems'),
    startupShowNotes: document.getElementById('lpa-startup-show-notes'),
    startupNotes: document.getElementById('lpa-startup-notes'),
    chooseStartupBtn: document.getElementById('lpa-choose-startup-btn'),
    chooseStartupMenu: document.getElementById('lpa-choose-startup-menu'),
    chooseStartup: document.getElementById('lpa-choose-startup'),
    profileForm: document.getElementById('lpa-profile-form'),
    profileSubmit: document.getElementById('lpa-profile-submit'),
    camera: document.getElementById('lpa-camera'),
    cameraPreview: document.getElementById('lpa-camera-preview')
  };

  const TEMPLATES = {
    mentorsListTemplate: document.getElementById('tmpl-mentors-list'),
    attendeesListTemplate: document.getElementById('tmpl-attendees-list'),
    startupsListTemplate: document.getElementById('tmpl-startups-list'),
    startupTemplate: document.getElementById('tmpl-startup'),
    startupNoteTemplate: document.getElementById('tmpl-startup-note'),
    scheduleListTemplate: document.getElementById('tmpl-schedule-list')
  };

  function sendGaEvent(category, action, label) {
    ga('send', {
      hitType: 'event',
      eventCategory: category,
      eventAction: action,
      eventLabel: label
    });
  };

  function getParentNodeByType(el, nodeType) {
    while (el && el.tagName !== nodeType) {
       el = el.parentNode;
    }
    return el;
  };

  function createCameraTile() {
    let link = document.createElement('a');
    link.setAttribute('target', '_blank');
    link.classList.add('lpa-survey-img');
    return link;
  };

  function resetTextField(field, value) {
    field.innerHTML = value || '';
    field.value = value || '';
    field.parentNode.classList.toggle('is-dirty', field.value);
    field.parentNode.classList.remove('is-invalid');
  }

  function navigate(e, opt_elType) {
    e.preventDefault();
    let elType = opt_elType || 'A';
    let linkEl = getParentNodeByType(e.target, elType);
    let subpageName = linkEl.getAttribute('data-subpage');
    if (subpageName) {
      let url = BASE_URL + '/' + subpageName;
      let itemKey = linkEl.getAttribute('data-key');
      if (itemKey) {
        url = url + '/' + itemKey;
      }
      window.history.pushState(null, null, url);
      UI.showSubpage(subpageName, itemKey);
    }
  };

  /**
   * @param {Element} node Node template to fill in.
   * @param {Array} fields List of field names to be populated.
   * @param {Object} obj Source of data. Keys correspond to field names.
   * @param {string} attr Attribute/method to use to set the value of the field.
   */
  function populate(node, fields, obj, attr) {
    for (var i = 0; i < fields.length; i++) {
      let selector = '[data-field="' + fields[i].toLowerCase() + '"]';
      node.querySelector(selector)[attr] = obj[fields[i]] || '';
    }
  };

  function fillStartupTemplate(template, startup) {
    let node = template.content.cloneNode(true);
    populate(node, ['name', 'description', 'country', 'city', 'dateFounded', 'numEmployees'],
        startup, 'innerText');
    node.querySelector('[data-field="logo"]').src = startup.logo;
    return node;
  }

  /**
   * Component responsible for HTML modification.
   */
  let UI = {
    ELEMENTS: ELEMENTS,
    updateUser: function(user) {
      document.body.classList.toggle('lpa-signed-in', !!user);
      document.body.classList.toggle(
          'lpa-registered', !!firebaseApi.CURRENT_MENTOR);
      if (user) {
        if (!firebaseApi.CURRENT_MENTOR) {
          UI.showSubpage('unregistered');
        } else {
          UI.showSubpage('schedule');
        }
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
      let mentor = firebaseApi.CURRENT_MENTOR || {};
      let fieldNames = ['name', 'email', 'phone', 'country', 'city', 'twitter',
        'linkedin', 'site', 'comments', 'pic'];
      for (var i = 0; i < fieldNames.length; i++) {
        let field = fields['lpa-profile-' + fieldNames[i]];
        field.value = mentor[fieldNames[i]] || '';
        field.parentNode.MaterialTextfield.checkDirty();
      }
      fieldNames = ['bio', 'funFact', 'expertise'];
      for (var i = 0; i < fieldNames.length; i++) {
        let field = fields['lpa-profile-' + fieldNames[i].toLowerCase()];
        field.innerHTML = mentor[fieldNames[i]] || '';
        field.parentNode.MaterialTextfield.checkDirty();
      }
    },
    updateMentorsList: function(mentorSnapshots) {
      ELEMENTS.mentorsList.innerHTML = '';
      if (mentorSnapshots) {
        mentorSnapshots.forEach(function(mentorSnapshot) {
          let node = TEMPLATES.mentorsListTemplate.content.cloneNode(true);
          let links = {
            'site': mentorSnapshot.site,
            'email': 'mailoto:' + mentorSnapshot.email,
            'twitter': 'https://twitter.com/' + mentorSnapshot.twitter,
            'linkedin': 'https://pl.linkedin.com/in/' + mentorSnapshot.linkedin
          };
          populate(node, ['site', 'email', 'twitter', 'linkedin'],
                   links, 'href');
          populate(node, ['name', 'city', 'country', 'domain', 'domainSec',
                   'expertise'], mentorSnapshot, 'innerText');
          let pic = node.querySelector('[data-field="pic"]');
          ELEMENTS.mentorsList.appendChild(node);
          if (mentorSnapshot.pic) {
            if (mentorSnapshot.pic.indexOf('http') != 0) {
              mentorSnapshot.pic = 'http://' + mentorSnapshot.pic;
            }
            pic.innerText = ' ';
            pic.setAttribute('style', 'background: url("'+ mentorSnapshot.pic + '") center/cover;');
          }
        });
      }
    },
    updateAttendeesList: function(attendeeSnapshots) {
      ELEMENTS.attendeesList.innerHTML = '';
      if (attendeeSnapshots) {
        attendeeSnapshots.forEach(function(attendeeSnapshot) {
          let node = TEMPLATES.attendeesListTemplate.content.cloneNode(true);
          populate(node, ['name', 'role', 'startup', 'funfact'],
                   attendeeSnapshot, 'innerText');
          let links = {
            'email': 'mailto:' + attendeeSnapshot.email,
            'linkedin': 'https://pl.linkedin.com/in/' + attendeeSnapshot.linkedin
          };
          populate(node, ['email', 'linkedin'], links, 'href');
          let pic = node.querySelector('[data-field="pic"]');
          ELEMENTS.attendeesList.appendChild(node);
          if (attendeeSnapshot.pic) {
            pic.innerHTML = '';
            pic.setAttribute('style', 'background: url("'+ attendeeSnapshot.pic + '") center/cover;');
          }
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
          let node = fillStartupTemplate(TEMPLATES.startupsListTemplate, startup);
          let nodeEl = node.firstElementChild;
          ELEMENTS.startupsList.appendChild(node);
          nodeEl.setAttribute('data-key', startup.key);
          nodeEl.setAttribute('data-subpage', 'startup');
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
    updateStartup: function(startupKey) {
      let startup = firebaseApi.CACHE['startups'][startupKey];
      ELEMENTS.startupPageContent.innerHTML = '';
      ELEMENTS.startupShowNotes.classList.remove('lpa-open');
      ELEMENTS.startupNotes.innerHTML = '';
      ELEMENTS.startupNotes.classList.add('hidden');
      let node = fillStartupTemplate(TEMPLATES.startupTemplate, startup);
      let nodeEl = node.firstElementChild;
      nodeEl.setAttribute('data-key', startup.key);
      node.querySelector('[data-field="twitter"]').setAttribute(
          'href', 'https://twitter.com/' + startup.twitter);
      let video;
      if (startup.video) {
        let youtubeIdMatch = startup.video.match(YOUTUBE_REGEX);
        if (youtubeIdMatch && youtubeIdMatch[1]) {
          video = document.createElement('iframe');
          video.setAttribute('height', 315);
          video.setAttribute('width', 560);
          video.setAttribute('src', 'https://www.youtube.com/embed/' + youtubeIdMatch[1]);
        }
        let vimeoIdMatch = startup.video.match(VIMEO_REGEX);
        if (vimeoIdMatch && vimeoIdMatch[1]) {
          video = document.createElement('iframe');
          video.setAttribute('height', 427);
          video.setAttribute('width', 640);
          video.setAttribute('src', 'https://player.vimeo.com/video/' + vimeoIdMatch[1]);
        }
        if (!youtubeIdMatch && !vimeoIdMatch) {
          video = document.createElement('a');
          video.classList.add('material-icons', 'lpa-icon-big');
          video.innerHTML = 'movie';
          if (!startup.video.startsWith('http')) {
            startup.video = 'http://' + startup.video;
          }
          video.setAttribute('href', startup.video);
          video.setAttribute('target', '_blank');
        }
        node.appendChild(video);
      }
      ELEMENTS.startupPageContent.appendChild(node);
    },
    displayStartupNotes: function(sessions) {
      ELEMENTS.startupNotes.innerHTML = '';
      if (sessions) {
        sessions.forEach(function(session) {
          let node = TEMPLATES.startupNoteTemplate.content.cloneNode(true);
          session.date = session.date.slice(0, 10);
          populate(node, ['date', 'mentorKey', 'meetingNotes', 'actionItems'],
                   session, 'innerText');
          ELEMENTS.startupNotes.appendChild(node);
        });
      }
    },
    showSubpage: function(subpageName, itemKey) {
      let subpages = document.querySelectorAll('.lpa-subpage');
      for (var i = 0; i < subpages.length; i++) {
        subpages[i].classList.remove('lpa-active');
      }
      let subpage = document.getElementById('lpa-' + subpageName + '-subpage');
      PAGES[subpageName] && PAGES[subpageName].init && PAGES[subpageName].init(itemKey);
      subpage.classList.add('lpa-active');
      if (ELEMENTS.main.scrollTo) {
        ELEMENTS.main.scrollTo(0, 0);
      };
      ELEMENTS.main.scrollIntoView();
      return subpage;
    },
    displaySchedule: function(schedule) {
      ELEMENTS.scheduleList.innerHTML = '';
      if (schedule.length) {
        schedule.forEach(function(session) {
          let node = TEMPLATES.scheduleListTemplate.content.cloneNode(true);
          populate(node, ['starttime', 'location', 'startup'], session, 'innerText');
          let mentorId = firebaseApi.CURRENT_MENTOR_ID;
          node.firstElementChild.querySelector('.lpa-survey-btn').addEventListener(
              'click', UI.showSurvey.bind(null, session.path));
          ELEMENTS.scheduleList.appendChild(node);
        });
      } else {
        ELEMENTS.scheduleList.innerHTML = '<li>Sorry, no sessions found for this date.</li>';
        sendGaEvent('schedule-mentor',
            'reload-empty-schedule: ' + firebaseApi.CURRENT_MENTOR_ID);
      }
    },
    showSurvey: function(sessionPath) {
      UI.resetSurvey(sessionPath);
      ELEMENTS.survey.showModal();
    },
    resetSurvey: function(sessionPath) {
      let session = firebaseApi.CACHE.sessions[sessionPath] || null;
      let startup = session ? session.startup : window.location.pathname.split('/')[3];
      if (startup) {
        ELEMENTS.survey.querySelector('#lpa-survey-startup').value = startup;
        ELEMENTS.chooseStartup.classList.add('hidden');
      } else {
        ELEMENTS.survey.querySelector('#lpa-survey-startup').value = null;
        ELEMENTS.chooseStartup.classList.remove('hidden');
      }
      startup = startup || 'a startup';
      ELEMENTS.survey.querySelector(
          '.mdl-dialog__title').innerHTML = 'Add notes for ' + startup;
      let today = new Date();
      let todayIso = today.toISOString();
      ELEMENTS.survey.session = session;
      let sessionText = session ?
          'Session: ' + session.date + ' at ' + session.starttime :
          'Unscheduled session: ' + todayIso.slice(0, 10) + ' ' + todayIso.slice(11, 16);
      ELEMENTS.survey.querySelector(
          '#lpa-survey-session-datetime').innerHTML = sessionText;
      let notes = session ? session.notes : {};
      ELEMENTS.cameraPreview.innerHTML = '';
      if (notes.imgs) {
        for (var i = 0; i < notes.imgs.length; i++) {
          let link = createCameraTile();
          ELEMENTS.cameraPreview.appendChild(link);
          link.setAttribute('style', 'background-image: url(\'' + notes.imgs[i] + '\')');
          link.setAttribute('href', notes.imgs[i]);
        }
      }
      ELEMENTS.survey.querySelector(
          '#lpa-survey-receptive').value = notes.receptive || 3;
      ELEMENTS.survey.querySelector(
          '#lpa-survey-effective').value = notes.effective || 3;
      resetTextField(ELEMENTS.surveyNotesField, notes.meetingNotes);
      resetTextField(ELEMENTS.surveyActionItemsField, notes.actionItems);
      ELEMENTS.survey.querySelector('.lpa-survey-error').classList.add('hidden');
    },
    addListeners: function() {
      ELEMENTS.mainNav.addEventListener('click', navigate);
      ELEMENTS.userNav.addEventListener('click', e => {
        let links = ELEMENTS.mainNav.querySelectorAll('.is-active');
        for (var i = 0; i < links.length; i++) {
          links[i].classList.remove('is-active');
        }
        navigate(e);
      });
      ELEMENTS.drawerNav.addEventListener('click', function(e) {
        navigate(e);
        ELEMENTS.mdlLayout.MaterialLayout.toggleDrawer();
      });
      let signInEls = ELEMENTS.mdlLayout.querySelectorAll('.lpa-sign-in');
      for (var i = 0; i < signInEls.length; i++) {
        signInEls[i].addEventListener('click', e => {
          e.preventDefault();
          authModule.authWithGoogle();
        });
      }
      let signOutEls = ELEMENTS.mdlLayout.querySelectorAll('.lpa-sign-out');
      for (var i = 0; i < signOutEls.length; i++) {
        signOutEls[i].addEventListener('click', e => {
          e.preventDefault();
          authModule.signOut();
        });
      }
      ELEMENTS.datepicker.setAttribute('value', new Date().toISOString().slice(0, 10));
      ELEMENTS.datepicker.addEventListener('change', function(e) {
        sendGaEvent('schedule-mentor',
            'reload-schedule: ' + firebaseApi.CURRENT_MENTOR_ID,
            'for day: ' + e.target.value);
        firebaseApi.getCurrentMentorSchedule(
            e.target.value).then(UI.displaySchedule);
      });

      ELEMENTS.startupShowNotes.addEventListener('click', function(e) {
        e.preventDefault();
        ELEMENTS.startupShowNotes.classList.toggle('lpa-open');
        ELEMENTS.startupNotes.classList.toggle('hidden');
        let startupKey = window.location.pathname.split('/')[3];
        sendGaEvent('startup-notes-mentor', 'fetch-notes', 'startup: ' + startupKey);
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
        let imgEls = ELEMENTS.survey.querySelectorAll('.lpa-survey-img');
        for (var i = 0; i < imgEls.length; i++) {
          imgs.push(imgEls[i].href);
        }
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
        navigate(e, 'LI');
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
          'pic': fields['lpa-profile-pic'].value,
          'comments': fields['lpa-profile-comments'].value,
          'unixTime': new Date().getTime(),
          'date': new Date().toISOString()
        };
        sendGaEvent('save-mentor', 'save-mentor-info-fields',
          'key: ' + firebaseApi.CURRENT_MENTOR_ID);
        firebaseApi.saveMentor(mentorId, mentor);
      });
      ELEMENTS.camera.addEventListener('change', e => {
        let file = e.target.files[0];
        let link = createCameraTile();
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
          ELEMENTS.surveySubmit.disabled = false;
        };
        ELEMENTS.surveySubmit.disabled = true;
        firebaseApi.uploadImage(file, progressCallback, completeCallback);
      });
    }
  };

  const PAGES = {
    'startup': {
      init: UI.updateStartup
    }
  };
  return UI;
})(firebaseApi, authModule, router);
