var firebaseApi = (function() {

  let CACHE = {};

  function getMentorIdFromEmail(email) {
    return email.replace(/\./g, "-");
  };

  let api = {
    CURRENT_MENTOR_ID: null,
    CURRENT_MENTOR: null,
    CACHE: CACHE,
    fetchSchedule: (day, mentorId) => new Promise(function(resolve, reject) {
      firebase.database()
        .ref('sessions/' + day + '/mentors/' + mentorId)
        .once('value')
        .then(snapshots => {
          let sessions = [];
          snapshots.forEach(snapshot => {
            let session = snapshot.val();
            session.path = snapshot.ref.path.toString();
            session.date = day;
            session.mentorId = mentorId;
            sessions.push(session);
          });
          resolve(sessions);
        });
    }),
    fetchMentor: mentorId => new Promise(function(resolve) {
      firebase.database().ref('mentors/' + mentorId).once('value').then(snapshot => {
        firebaseApi.CURRENT_MENTOR = snapshot.val();
        resolve(firebaseApi.CURRENT_MENTOR);
      });
    }),
    fetchMentorsList: () => new Promise(function(resolve) {
      firebase.database().ref('mentors/').once('value').then(snapshots => {
          let values = [];
          snapshots.forEach(snapshot => {
            values.push(snapshot.val());
          });
          resolve(values);
        });
    }),
    fetchAttendeesList: () => new Promise(function(resolve) {
      firebase.database().ref('attendees/').once('value').then(snapshots => {
          let values = [];
          snapshots.forEach(snapshot => {
            values.push(snapshot.val());
          });
          resolve(values);
        });
    }),
    fetchStartupsList: () => new Promise(function(resolve) {
      firebase.database().ref('startups/').once('value').then(snapshots => {
          CACHE.startups = {};
          let values = [];
          snapshots.forEach(snapshot => {
            let startup = snapshot.val();
            startup.key = snapshot.key;
            CACHE.startups[startup.key] = startup;
            values.push(startup);
          });
          resolve(values);
        });
    }),
    fetchStartupNotes: (startupKey) => new Promise(function(resolve) {
      firebase.database().ref('notes-backup/startups/' + startupKey).once(
          'value').then(snapshots => {
        CACHE.startups[startupKey].sessions = [];
        snapshots.forEach(snapshot => {
          let notes = snapshot.val().notes;
          Object.keys(notes).forEach(mentorKey => {
            Object.keys(notes[mentorKey]).forEach(hourKey => {
              notes[mentorKey][hourKey].mentorKey = mentorKey;
              CACHE.startups[startupKey].sessions.push(notes[mentorKey][hourKey]);
            })
          })
        });
        resolve(CACHE.startups[startupKey].sessions);
      });
    }),
    saveSessionNotes: (note, startup, session) => new Promise(function(resolve) {
      let today = new Date();
      let sessionDate = today.toISOString().slice(0, 10);
      let hourId = 'hour-' + today.getTime();
      let sessionPath = session ? session.path : ['', 'sessions',
          sessionDate,'mentors', api.CURRENT_MENTOR_ID, hourId].join('/');
      // Save notes in 3 locations: mentor, startup, backup.
      // e.g. /sessions/2016-10-19/mentors/ewa@gmail-com/hour-1/notes
      let mentorNotesPath = sessionPath + '/notes';
      // e.g. /sessions/2016-05-01/startups/Aliada/notes/ewa@gmail-com/hour-1
      let startupNotesPath = ['', 'sessions', sessionDate, 'startups',
          startup, 'notes', api.CURRENT_MENTOR_ID, hourId].join('/');
      // e.g. /notes-backup/2016-06-08/startups/BankFacil/notes/e@g-com/hour-2
      let backupNotesPath = ['', 'notes-backup', sessionDate, 'startups',
          startup, 'notes', api.CURRENT_MENTOR_ID, hourId].join('/');
      if (!session) {
        session = {
          location: 'Ad hoc',
          name: firebase.auth().currentUser.displayName,
          starttime: today.getHours() + ':00',
          startup: startup,
          notes: note
        };
        today.setHours(today.getHours() + 1);
        session.endtime = today.getHours() + ':00';
        Promise.all([
          firebase.database().ref(sessionPath).set(session),
          firebase.database().ref(startupNotesPath).set(note),
          firebase.database().ref(backupNotesPath).set(note)
        ]).then(resolve);
      } else {
        Promise.all([
          firebase.database().ref(mentorNotesPath).set(note),
          firebase.database().ref(startupNotesPath).set(note),
          firebase.database().ref(backupNotesPath).set(note)
        ]).then(resolve);
      }
    }),
    saveMentor: (mentorId, mentor) => new Promise(function(resolve) {
      let mentorPath = 'mentors/' + mentorId;
      firebase.database().ref(mentorPath).set(mentor).then(resolve);
    }),
    getCurrentMentorSchedule: day => new Promise(function(resolve) {
      let mentorId = firebaseApi.CURRENT_MENTOR_ID;
      firebaseApi.fetchSchedule(day, mentorId).then(resolve);
    }),
    uploadImage: (file, progressCallback, completeCallback) =>  {
      let metadata = {
        contentType: 'image/jpeg'
      };
      let errorCallback = null;
      let task = firebase.storage().ref().child('images/' + file.name).put(file, metadata);
      task.on(firebase.storage.TaskEvent.STATE_CHANGED,
        progressCallback, errorCallback, function() {
          completeCallback(task.snapshot)
        });
    }
  };

  var config = {
    apiKey: "AIzaSyBhd3NDwiqErIPa5Py55Mp0mpa2Jd4atrk",
    authDomain: "lpa-3.firebaseapp.com",
    databaseURL: "https://lpa-3-14341.firebaseio.com/",
    storageBucket: "lpa-3-14341.appspot.com",
  };
  firebase.initializeApp(config);


  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      api.CURRENT_MENTOR_ID = getMentorIdFromEmail(
          firebase.auth().currentUser.email);
      let today = new Date().toISOString().slice(0, 10);
      api.getCurrentMentorSchedule(today).then(UI.displaySchedule);
      api.fetchMentorsList().then(UI.updateMentorsList);
      api.fetchAttendeesList().then(UI.updateAttendeesList);
      api.fetchStartupsList().then(UI.updateStartupsList);
    } else {
      api.CURRENT_MENTOR_ID = null;
    }
  });

  return api;
})();
