var authModule = (function(firebaseAuth) {
  let auth = firebaseAuth();
  let provider = new firebaseAuth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');

  return {
    authWithGoogle: function() {
      auth.signInWithRedirect(provider).then(function(result) {
        // User signed in!
      }).catch(function(error) {
        ga('send', {
          hitType: 'event',
          eventCategory: 'sign-in-mentor',
          eventAction: 'sign-in-button',
          eventLabel: 'authentication failed. errCode: ' + error.code +
            ' msg: ' + error.message + ' email: ' + error.email + ' credential: ' + error.credential
        });
      });
    },

    signOut: function(e) {
      firebase.auth().signOut().then(function() {
        // Sign-out successful.
      }, function(error) {
        // An error happened.
      });
    }

  };
})(firebase.auth);
