var firebaseApi = (function() {

  let CACHE = {};

  let api = {
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
    fetchMentorsList: () => new Promise(function(resolve) {
      firebase.database().ref('mentors/').once('value').then(snapshots => {
          let values = [];
          snapshots.forEach(snapshot => values.push(snapshot.val()));
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
      firebase.database().ref('/notes-backup/startups/' + startupKey).once('value').then(snapshots => {
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
    saveSessionNotes: (note, startup, path) => new Promise(function(resolve) {
      let pathParts = path.split('/');
      // Save notes in 3 locations: mentor, startup, backup.
      // e.g. /sessions/2016-10-19/mentors/ewa@gmail-com/hour-1/notes
      let mentorNotesPath = path + '/notes';
      // e.g. /sessions/2016-05-01/startups/Aliada/notes/ewa@gmail-com/hour-1
      let startupNotesPath = [pathParts[0], pathParts[1], pathParts[2],
          'startups', startup, 'notes', pathParts[4], pathParts[5]].join('/');
      // e.g. /notes-backup/2016-06-08/startups/BankFacil/notes/e@g-com/hour-2
      let backupNotesPath = ['', 'notes-backup', pathParts[2],
          'startups', startup, 'notes', pathParts[4], pathParts[5]].join('/');
      Promise.all([
        firebase.database().ref(mentorNotesPath).set(note),
        firebase.database().ref(startupNotesPath).set(note),
        firebase.database().ref(backupNotesPath).set(note)
      ]).then(resolve);
    })
  };

  var config = {
    apiKey: "AIzaSyBhd3NDwiqErIPa5Py55Mp0mpa2Jd4atrk",
    authDomain: "lpa-3.firebaseapp.com",
    databaseURL: "https://lpa-3-14341.firebaseio.com/",
    storageBucket: "lpa-3-14341.appspot.com",
  };
  firebase.initializeApp(config);

  return api;
})();
