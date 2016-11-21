var firebaseApi = (function() {

  let api = {
    fetchSchedule: (day, mentorId) => new Promise(function(resolve) {
      firebase.database()
        .ref('sessions/' + day + '/mentors/' + mentorId)
        .once('value')
        .then(snapshot => resolve(snapshot.val()));
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
