//
// JS for the attendee web app
// Author: Ido Green 
// Date: 4/2016
// V0.9
//
// A 🐱 App
//
(function() {
  $(".save-alert").hide();
  $("#alert-warning-sign-in").hide();
  $("#spin").hide();

  var startupNameList = [];
  var curAttendeeEmail = "";
  var curAttendeeStartup = "";

  //
  // handle the intro help and later the help function
  //
  if (!localStorage.getItem("lpa-1-showed-help")) {
    $('#joyRideTipContent').joyride({
      autoStart: true,
      localStorage: true,
      localStorageKey: 'lpa-1-showed-help',
      modal: true,
      expose: true
    });
  }
  $("#help-but").click(function() {
    $('.navbar-toggle').click();
    $("#joyRideTipContent").joyride({ autoStart: true });
  });

  //
  // AUTH fun
  // start the connection with firebase DB
  //
  var config = {
    apiKey: "AIzaSyDImJzAqBmZVXdaK55jVfRuoaHVLBDFgxU",
    authDomain: "lpa-1.firebaseapp.com",
    databaseURL: "https://lpa-1.firebaseio.com",
    storageBucket: "project-1969056342883930904.appspot.com",
    messagingSenderId: "575025255250"
  };
  // Initialize Firebase
  firebase.initializeApp(config);
  var ref = firebase.database().ref();
  var storageRef = firebase.storage().ref();

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  authUserData = null;

  //
  // Authentication actions
  //
  firebase.auth().onAuthStateChanged(function(authData) {
    if (authData) {
      if (authData.providerData[0] && authData.providerData[0].providerId !== "google.com") {
        bootbox.alert("You must sign-in with your Google ID.<br>So first logout from the Admin App.<br>Thank you!");
        return;
      }

      authUserData = authData.providerData[0];
      localStorage.setItem("lpa1-g-authData", JSON.stringify(authData));
      $("#sc-reload-button").prop('disabled', false);
      console.log("User " + authData.uid + " is logged in with ", authData.providerData);
      $("#login-form").html("<img src='" + authUserData.photoURL + "' class='g-mentor-logo' alt='mentor logo' />");
      $("#logout-div").html("<form class='navbar-form navbar-right' role='form'><button id='logout-but' class='btn btn-success'>Logout</button> </form>");

      curAttendeeEmail = authUserData.email;
      curAttendeeEmail = curAttendeeEmail.replace(/\./g, "-");
      fetchAttendee(curAttendeeEmail);
      // init our mentor with what we have from google-login
      $("#logout-but").text("Logout " + authUserData.displayName);
      $("#form-name-field").val(authUserData.displayName);
      $("#form-pic-url").val(authUserData.photoURL);

      readStartups(authData);
      readAttendees(authData);
      readMentors(authData);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in-attendee',
        eventAction: 'authenticated user.uid: ' + authData.uid,
        eventLabel: 'authentication: ' + curAttendeeEmail
      });
    } else {
      console.log("User is logged out");
      logoutUI();
      bootbox.alert('<center><button type="submit" class="btn btn-success btn-lg sign-in-but-modal">Sign In</button><br><br><img src="img/lpa-logo-40.jpg" alt="logo"/></center>');
    }
  });

  //
  // Logout UI 
  //
  function logoutUI() {
    $("#sc-reload-button").prop('disabled', true);
    $("#logout-div").html("");
    $("#login-form").html('<button type="submit" id="google-sign-in-but" class="btn btn-success">Sign in</button> <span id="spin"><i class="fa fa-spinner fa-spin"></i></span>');
    $("#spin").hide();
  }

  //
  //
  //
  function loginWithGoogle() {
    $("#spin").show();
    firebase.auth().signInWithPopup(provider).then(function(result) {
      $("#spin").hide();
      var token = result.credential.accessToken;
      var user = result.user;
      console.log("Got user: ", user);
      $("#sc-reload-button").prop('disabled', false);
      console.log("Authenticated with payload:", result);
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      var email = error.email;
      var credential = error.credential;
      console.log("Login Failed!", error);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in-attendee',
        eventAction: 'sign-in-button',
        eventLabel: 'authentication failed. errCode: ' + errorCode +
          ' msg: ' + errorMessage + ' email: ' + email + ' credential: ' + credential
      });
      $("#err-modal").modal('show');
    });
  }

  //
  // handle the sign in button from the modal
  //
  $('body').on('click', '.sign-in-but-modal', function(event) {
    bootbox.hideAll();
    loginWithGoogle();
    return false;
  });

  //
  // Sign in user/password
  //
  $("#google-sign-in-but").click(function() {
    loginWithGoogle();
    return false;
  });

  //
  // logout button
  //
  $("#logout-but").click(function() {
    firebase.auth().signOut().then(function() {
      logoutUI();
    }, function(error) {
      console.log("Could not sign-out. err: " + error);
    });
    return false;
  });

  //////////////////////////////////////////////////////////////////////////////
  // Fetch schedule
  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // Reload the schedule that the attendee got (= per her startup)
  //
  $("#sc-reload-button").click(function() {
    var scDay = $("#schedule-day-1").val();
    if (scDay == null || scDay == "") {
      bootbox.alert("You must set a date in order to reload schedule. Daaa!");
      $("#schedule-day-1").focus();
      return;
    }
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule-attendee',
      eventAction: 'reload-schedule: ' + curAttendeeStartup,
      eventLabel: 'for day: ' + scDay
    });
    ref.child("sessions").child(scDay).child("startups").child(curAttendeeStartup).once("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        $("#sc-reload-button").text("Reload " + curAttendeeStartup);
        //console.log("The sessions: " + JSON.stringify(sessions));
        var commentsForTheDay = "Nothing for now. But remember: <h5>A lion runs the fastest when he is hungry.</h5><img src='img/lion-250.jpeg' alt='Ido famous lion' />";
        if (sessions.comments && sessions.comments.length > 2) {
          commentsForTheDay = (sessions.comments).replace(/\n/g, "<br>");
        }
        var scHtml = "";
        scHtml += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title"> Notes For The Day' +
          '  <button class="btn expend-comments-day-but" type="button" data-toggle="collapse" data-target="#att-comments-day" \
          aria-expanded="false" aria-controls="collapseCommentsDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"> \
          </span></button> </h3> </div> <div id="att-comments-day" class="panel-body collapse">' + commentsForTheDay + '</div> </div>';

        // we know it's the mentors and hours  getHourAsRange(tKey) 
        for (var i = 0; i < sessions.mentors.length; i++) {
          var tKey = "hour-" + (i + 1);
          var startupBackupNotesKey = "/startups/" + curAttendeeStartup + "/" + scDay + "/attendees-notes/" + sessions.mentors[i][0] +
            "/" + curAttendeeEmail + "/" + tKey;
          if (sessions.mentors[i][0] !== "na@na-com") {
            var startTime = sessions.mentors[i][3];
            var endTime = sessions.mentors[i][4];
            scHtml += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
              '<button class="btn btn-warning fetch-mentor-button" data-key="' + sessions.mentors[i][0] + '">' + sessions.mentors[i][1] +
              '</button>' + ' | ' + startTime + " - " + endTime +
              ' <button class="btn expend-notes-but" type="button" data-textarea-key="' + tKey + '" data-note-key="' + startupBackupNotesKey +
              '" data-toggle="collapse" data-target="#att-note-p-' + tKey +
              '" aria-expanded="false" aria-controls="collapseAttDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"></span></button>' +
              ' </h3><b>Location: ' + sessions.mentors[i][2] + '</b> </div> <div id="att-note-p-' + tKey + '" class="panel-body collapse">' +
              '<p class="" id="meet-details-' + tKey + '"> ' +
              '<h5><label>Did the mentor listen to you and explain their advice? (1-5)</label></h5> <br>\
                <input type="text" class="note-slider" id="note-listen-' + tKey + '" name="note-listen" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
                <br><h5> <label>Was the session effective? (1-5)</label></h5><br> \
                <input type="text" class="note-slider" id="note-effective-' + tKey + '" name="note-effective" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
                <br><br> \
            <h5>Meeting Notes</h5>What did you talk about? Any action items? \
            <textarea id="' + tKey + '" class="form-control col-lg-10 meeting-notes-text" data-notes-backup="' + startupBackupNotesKey +
              '" data-starttime="' + startTime + '" data-endtime="' + endTime + '" name="meeting-notes">' +
              '</textarea>  <br><button class="btn btn-warning meeting-save-button">Save Notes</button> </p> </div> </div> </div>';
          }

        }
        $("#attendee-schedule-list").html(scHtml);
        $(".note-slider").slider({ tooltip: 'always' });
      } else {
        if (curAttendeeStartup == "") {
          bootbox.alert("Please check why you are not part of any startup.");
          $("#sc-reload-button").text("Reload");
        } else {
          bootbox.alert("Could not find anything for " + curAttendeeStartup + " at this date.");
          ga('send', {
            hitType: 'event',
            eventCategory: 'schedule-attendee',
            eventAction: 'reload-empty-schedule: ' + curAttendeeStartup,
            eventLabel: 'for day: ' + scDay
          });
        }
      }
    });
  });

  //
  //
  //
  $('body').on('click', '.fetch-mentor-button', function(event) {
    var mentor = $(this).data("key");
    showMentorDetails(mentor);
  });

  //
  // Fetch the note per specific session
  //
  $('body').on('click', '.expend-notes-but', function(event) {
    var key = $(this).data("note-key");
    var textareaKey = $(this).data("textarea-key");
    var listenSliderKey = "note-listen-" + textareaKey;
    var effectiveSliderKey = "note-effective-" + textareaKey;
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-attendee',
      eventAction: 'fetch-a-note',
      eventLabel: 'key: ' + key
    });
    var readRef = firebase.database().ref("/notes-backup/" + key);
    readRef.once("value", function(snapshot) {
      var noteData = snapshot.val();
      if (noteData != null && noteData.meetingNotes) {
        $("#" + textareaKey).val(noteData.meetingNotes);
      }
      if (noteData != null && noteData.receptive) {
        $("#" + listenSliderKey).slider('setValue', noteData.receptive);
      }
      if (noteData != null && noteData.effective) {
        $("#" + effectiveSliderKey).slider('setValue', noteData.effective);
      }
    });
  });

  //
  // Save the meeting notes
  //
  $('#attendee-schedule-list').on('click', '.meeting-save-button', function() {
    var ta = $(this).parent().find('textarea');
    var notes = ta.val();
    var startTime = ta.data('starttime');
    var endTime = ta.data('endtime');
    var sliders = $(this).parent().find('input');
    var listenVal = $("#" + sliders[0].id).slider('getValue');
    var effectiveVal = $("#" + sliders[1].id).slider('getValue');

    var keyToNotesBackup = ta.data('notes-backup');
    //console.log("keyToSession: " + keyToSession + " Notes: " + notes);
    if (keyToNotesBackup == undefined || keyToNotesBackup == null) {
      bootbox.alert("Sorry - Can't save your notes. Please take them in another way and let the organizers know about it.");
      return;
    }
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-attendee',
      eventAction: 'save-notes',
      eventLabel: 'keyToNotesBackup: ' + keyToNotesBackup
    });
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);

    // save under notes for backup in case we re-set the schedule
    ref.child("notes-backup").child(keyToNotesBackup).set({
      receptive: listenVal,
      effective: effectiveVal,
      meetingNotes: notes,
      starttime: startTime,
      endtime: endTime,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        console.log("Meeting notes for: " + keyToNotesBackup + " could not be saved :( Details: " + error);
      } else {
        console.log(keyToNotesBackup + " notes Saved to backup!");
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 2500);
      }
    });
  });

  //
  // fetch mentor data base on its key (=email)
  //
  function showMentorDetails(key) {
    if (key === "na@na-com") {
      return;
    }
    
    var ref = firebase.database().ref("mentors/" + key);
    ref.on("value", function(mentorSnap) {
      var mentor = mentorSnap.val();
      if (mentor != null) {
        var picUrl = addhttp(mentor.pic);
        var html = "<h3><img class='g-mentor-logo' src='" + picUrl + "' alt='mentor-image' />  " + mentor.name + "</h3>";
        var mEmail = key.replace(/\-/g, ".");
        var mBio = "";
        if (mentor.bio && mentor.bio != undefined) {
          mBio = (mentor.bio).replace(/\n/g, "<br>");
        }
        html += "<b>Email: </b>" + mEmail;
        html += "<br><b>From: </b>" + mentor.country + " " + mentor.city;
        html += "<br><b>Domain expertises: </b>" + mentor.domain + " " + mentor.domainSec;
        html += "<h4>Bio </h4>" + mBio;
        html += "<br><b>Fun Fact: </b>" + mentor.funFact;
        html += "<br><b>Twitter: </b> <a href='http://www.twitter.com/" + mentor.twitter + "' target='_blank'>" + mentor.twitter + "</a>";
        html += "<br><b>Linkedin: </b> <a href='http://www.linkedin.com/in/" + mentor.linkedin + "' target='_blank'>" + mentor.linkedin + "</a>";
        bootbox.alert(html);
      } else {
        ga('send', {
          hitType: 'event',
          eventCategory: 'check-mentor',
          eventAction: 'fetch-not-registered-mentor-from-attendee-app',
          eventLabel: 'key: ' + key
        });
        bootbox.alert("It looks like this mentor is not registered. Please check with the organizers, cool?");
      }
    });
  }


  //////////////////////////////////////////////////////////////////////////////
  // Startups
  //////////////////////////////////////////////////////////////////////////////

  //
  // get list of startups
  //
  function getStartupSelect() {
    var html = '<select id="att-startup-list-select" class="selectpicker" data-style="btn-info">';
    var len = startupNameList.length;
    for (var i = 0; i < len; i++) {
      html += '<option>' + startupNameList[i] + '</option>'
    }
    html += '</select>';
    return html;
  }

  //
  // read the list of startups and display it
  //
  function readStartups(authData) {
    var readRef = firebase.database().ref("startups");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The Startups: " + JSON.stringify(snapshot.val()));
      $("#startups-list").html("");
      startupNameList = [];
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        startupNameList.push(key);
        var startupData = childSnapshot.val();
        var startupLogoUrl = addhttp(startupData.logo);
        var twitterLink = "";
        if (startupData.twitter && startupData.twitter.length > 2) {
          twitterLink = '&nbsp;&nbsp;<b>Twitter:</b> <a href="http://twitter.com/' + startupData.twitter + '" target="_blank">' + startupData.twitter + '</a>';
        }
        $("#startups-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          startupData.name + "&nbsp;&nbsp;<img src='" + startupLogoUrl + "' class='logo-img' alt='startup logo'>" +
          '</h3> </div> <div class="panel-body startup-edit" data-key="' + key + '"> <div class="startup-card-desc">' +
          startupData.description + '</div><b>From:</b> ' +
          startupData.country + '  ' + startupData.city +
          '<b>  Founded:</b> ' + startupData.dateFounded + '</b><br><b>Employees:</b> ' + startupData.numEmployees + twitterLink +
          ' </div> </div>'
        );
      });
      var selHtml = getStartupSelect();
      $("#att-startup-sel-div").html("");
      $("#att-startup-sel-div").append(selHtml);
      $('#att-startup-list-select').selectpicker();
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Mentors
  //////////////////////////////////////////////////////////////////////////////

  //
  // read the list of mentors and display it
  //
  function readMentors(authData) {
    var readRef = firebase.database().ref("mentors");
    readRef.orderByKey().on("value", function(snapshot) {
      $("#mentors-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var mentorData = childSnapshot.val();
        if (mentorData.name != "--N/A--") {
          var mPicUrl = addhttp(mentorData.pic);
          //console.log("key: " + key + " data: " + mentorData);    <div class="collapse" id="collapse-bio-links">
          var divDetailKey = key.replace("@", "");
          var mBio = "";
          if (mentorData.bio && mentorData.bio != undefined) {
            mBio = '<h4><b>Bio</b></h4> ' + (mentorData.bio).replace(/\n/g, "<br>");
          }
          var twitterStr = "";
          if (mentorData.twitter) {
            twitterStr = "<br><Br><b>Twitter: </b><a target='_blank' href='https://twitter.com/" + mentorData.twitter + "'>" + 
              mentorData.twitter + " </a>";
          }
          var funFact = "";
          if (mentorData.funFact && mentorData.funFact.length > 3) {
            funFact = "<h5>Fun Fact: " + mentorData.funFact + "</h5>";
          }
          var site = "";
          if (mentorData.site) {
            site = "<br><b>Site:</b> <a target='_blank' href='" + mentorData.site + "'>" + mentorData.site +  "</a>";
          }
          var linkedin = "";
          if (mentorData.linkedin && mentorData.linkedin.length > 4) {
            var linkedinUrl = mentorData.linkedin;
            if (mentorData.linkedin.indexOf("www.linkedin.com") < 0) {
              linkedinUrl = "http://www.linkedin.com/in/" + mentorData.linkedin;
            }

            linkedin = "<br><b>Linkedin:</b> <a href='" + linkedinUrl + "' target='_blank'>" +
              mentorData.linkedin + " </a>";
          }
          var expertiseStr = "";
          if (mentorData.expertise) {
            expertiseStr = "<br><b>Expertise</b> " + mentorData.expertise ;
          }
          $("#mentors-list").append(
            '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
            mentorData.name + '<img src="' + mPicUrl + '" class="att-pic-card" alt="mentor picture" /> ' +
            ' &nbsp; &nbsp;<button class="btn" type="button" data-toggle="collapse" data-target="#mentor-panel-' + divDetailKey +
            '" aria-expanded="false" aria-controls="collapseMentorDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"></span></button>' +
            '</h3> </div> <div id="mentor-panel-' + divDetailKey + '" class="panel-body mentor-edit collapse" data-key="' + key +
            '"> <h5><a href="mailto:' + mentorData.email + '" target="_blank">' + mentorData.email + '</a></h5>' +
            '<b>Phone:</b> <a href="tel:' + mentorData.phone + '">' + mentorData.phone + "</a><br>" +
            '<b>Domain:</b> ' + mentorData.domain + ' - <b>Secondary:</b> ' + mentorData.domainSec +
            expertiseStr + twitterStr + linkedin + funFact + site +
            mBio + ' </div> </div>'
          );
        }
      });
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Attendees
  //////////////////////////////////////////////////////////////////////////////

  //
  // fetch mentor data base on its key (=phone number)
  //
  function fetchAttendee(key) {
    var ref = firebase.database().ref("attendees/" + key);
    ref.on("value", function(attSnap) {
      var att = attSnap.val();
      if (att != null) {
        curAttendeeStartup = att.startup;
        $("#att-name-field").val(att.name);
        $("#att-email-field").val(att.email);
        $("#att-startup-list-select").selectpicker('val', att.startup);
        $("#att-role").val(att.role);
        $("#att-linkedin-url").val(att.linkedin);
        $("#att-fun-fact").val(att.funFact);
        $("#att-pic-url").val(att.pic);
        $("#att-name-field").focus();
        $('body').scrollTop(60);

        localStorage.setItem("lpa1-g-att-email", curAttendeeEmail);
        localStorage.setItem("lpa1-g-att-startup", curAttendeeStartup);
      } else {
        ga('send', {
          hitType: 'event',
          eventCategory: 'check-attendee',
          eventAction: 'fetch-not-registered-attendee',
          eventLabel: 'key: ' + key
        });
        localStorage.removeItem("lpa1-g-att-email");
        localStorage.removeItem("lpa1-g-att-startup");
        $("#sc-reload-button").prop('disabled', true);
        bootbox.alert("Please check with the organizer why you aren't part of any startup");

        setTimeout(function() {
          ref.unauth();
          location.reload();
        }, 6000);
      }
    });
  }

  //
  // Save Attendee
  //
  $("#att-save-button").click(function() {
    var name = $("#att-name-field").val();
    var email = $("#att-email-field").val();
    // name validation
    if (name.length < 2) {
      $("#att-nameError").html("Please give a name - C'mon dude");
      $("#att-nameError").removeClass("sr-only");
      $("#att-nameError").addClass("alert");
      $("#form-name-field").focus();
      setTimeout(function() {
        $("#att-nameError").removeClass("alert");
        $("#att-nameError").addClass("sr-only");
      }, 1500);
      return;
    }

    // email validation
    if ($("#att-email-field").val().length < 2) {
      $("#att-emailError").html("Please give an email - Don't worry we will never spam you.");
      $("#att-emailError").removeClass("sr-only");
      $("#att-emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#att-emailError").removeClass("alert");
        $("#att-emailError").addClass("sr-only");
      }, 1500);
      return;
    }
    var emailRegEx = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
    if (!emailRegEx.test(email)) {
      $("#att-emailError").html("Please give a valid email (e.g. momo@okko.com");
      $("#att-emailError").removeClass("sr-only");
      $("#att-emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#att-emailError").removeClass("alert");
        $("#att-emailError").addClass("sr-only");
      }, 1500);
      return;
    }

    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);
    emailKey = email.replace(/\./g, '-');
    ref.child("attendees").child(emailKey).set({
      name: name,
      email: email,
      startup: $("#att-startup-list-select option:selected").text(),
      role: $("#att-role").val(),
      linkedin: $("#att-linkedin-url").val(),
      pic: $("#att-pic-url").val(),
      funFact: $("#att-fun-fact").val(),
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Attendee could not be saved :( Details: " + error);
      } else {
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
  });

  //
  // read the list of Attendees and display it
  //
  function readAttendees(authData) {
    var readRef = firebase.database().ref("attendees");
    readRef.orderByKey().on("value", function(snapshot) {
      $("#att-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var attData = childSnapshot.val();
        var picUrl = addhttp(attData.pic);
        var role = attData.role;
        if (role === undefined || role === null) {
          role = "";
        } else {
          role = " | " + role;
        }
        var funFact = "";
        if (attData.funFact && attData.funFact.length > 3) {
          funFact = "<br><b>Fun Fact: </b>" + attData.funFact;
        }
        var linkedin = "";
        if (attData.linkedin && attData.linkedin.length > 4) {
          var linkedinUrl = attData.linkedin;
          if (attData.linkedin.indexOf("www.linkedin.com") < 0) {
            linkedinUrl = "http://www.linkedin.com/in/" + attData.linkedin;
          }
          linkedin = "<br><b>Linkedin:</b> <a href='" + linkedinUrl + "' target='_blank'>" +
            attData.linkedin + " </a>";
        }

        $("#att-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          attData.name + '<img src="' + picUrl + '" class="att-pic-card" alt="attendee picture"/>' +
          '</h3> </div> <div class="panel-body att-edit" data-key="' + key + '"><h4>' + attData.startup + role + '</h4>' +
          "<b>email: </b> <a href='mailto:" + attData.email + "' target='_blank'>" + attData.email + "</a>" +
          linkedin + funFact +
          ' </div> </div>'
        );
      });
    });
  }

  //////////////////////////////////////////////////////////////////////////////////
  // Utils
  //////////////////////////////////////////////////////////////////////////////////

  //
  // Catch errors and send them to GA
  //
  window.onerror = function(msg, url, lineNumber) {
    console.log("Err:" + msg + " url: " + url + " line: " + lineNumber);
    ga('send', {
      hitType: 'event',
      eventCategory: 'attendee-gen-error',
      eventAction: 'msg: ' + msg,
      eventLabel: 'url: ' + url + " line: " + lineNumber
    });
  };

  //
  // Get a formated date (of now) and set it to our schedule input
  //
  Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  });
  $("#schedule-day-1").val(new Date().toDateInputValue());

  //
  //
  //
  function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + '/' + month + '/' + year + ' - ' + hour + ':' + min + ':' + sec;
    return time;
  }

  //
  // check if our url contain http and if not - add it.
  //
  function addhttp(url) {
    if (!/^(f|ht)tps?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    return url;
  }

  //
  // auto resize iframe for the full space it can take.
  //
  function autoResize(id) {
    var newheight;
    var newwidth;
    if (document.getElementById) {
      newheight = document.getElementById(id).contentWindow.document.body.scrollHeight;
      newwidth = document.getElementById(id).contentWindow.document.body.scrollWidth;
    }
    document.getElementById(id).height = (newheight) + "px";
    document.getElementById(id).width = (newwidth) + "px";
  }

  // check for online / lie-fi / offline
  window.addEventListener("offline", function(e) {
    console.log('You are OFFLINE');
    $("#online-status").html(" Offline");
  }, false);

  window.addEventListener("online", function(e) {
    console.log("we are back online!");
    $("#online-status").html(" Online");
  }, false);
})();
