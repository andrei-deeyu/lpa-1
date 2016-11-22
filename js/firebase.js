var firebaseApi = (function() {

  let CACHE = {};

  let api = {
    CACHE: CACHE,
    fetchSchedule: (day, mentorId) => new Promise(function(resolve) {
      firebase.database()
        .ref('sessions/' + day + '/mentors/' + mentorId)
        .once('value')
        .then(snapshot => {
          resolve(snapshot.val());
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
