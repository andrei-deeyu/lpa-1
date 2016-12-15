//
// JS for the mentor web app
// Author: Ido Green 
// Date: 4/2016
// V0.9
//
// A 🐱 App
////
(function() {
  $(".save-alert").hide();
  $("#alert-warning-sign-in").hide();
  $("#spin").hide();
  addToHomescreen({
    startDelay: 15
  });

  var startupNameList = [];
  var curMentorEmail = "";

  //
  // Handle the intro help and later the help function
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

  // AUTH fun
  // start the connection with Firebase
  //
  var config = {
    apiKey: "AIzaSyDqCyeurfP9lw5oN6-UhLS3VUDvUBBamrQ",
    authDomain: "lpa-mex.firebaseapp.com",
    databaseURL: "https://lpa-mex.firebaseio.com",
    storageBucket: "lpa-mex.appspot.com",
    messagingSenderId: "133369152659"
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

      curMentorEmail = authUserData.email;
      curMentorEmail = curMentorEmail.replace(/\./g, "-");
      fetchMentor(curMentorEmail);
      // init our mentor with what we have from google-login
      $("#logout-but").text("Logout " + authUserData.displayName);
      $("#form-name-field").val(authUserData.displayName);
      $("#form-pic-url").val(authUserData.photoURL);

      readStartups(authData);
      readAttendees(authData);
      readMentors(authData);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in-mentor',
        eventAction: 'authenticated user.uid: ' + authData.uid,
        eventLabel: 'authentication: ' + curMentorEmail
      });
    } else {
      console.log("User is logged out");
      logoutUI();
      bootbox.alert('<center><button type="submit" class="btn btn-success btn-lg sign-in-but-modal">Sign In</button><br><br><img src="img/lpa-logo-40.jpg" alt="logo"/></center>');
    }
  });

  //
  // Logout UI updater
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
        eventCategory: 'sign-in-mentor',
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
  // Sign in user
  //
  $("#google-sign-in-but").click(function() {
    loginWithGoogle();
    return false;
  });

  //
  // logout action
  //
  $("#logout-but").click(function() {
    firebase.auth().signOut().then(function() {
      // Sign-out successful
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
  // Reload the schedule from Firebase per date
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
      eventCategory: 'schedule-mentor',
      eventAction: 'reload-schedule: ' + curMentorEmail,
      eventLabel: 'for day: ' + scDay
    });

    ref.child("sessions").child(scDay).child("mentors").child(curMentorEmail).once("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        //console.log("The sessions: " + JSON.stringify(sessions));
        var html = "";
        $.each(sessions, function(key, scData) {
          // per startup set the mentors + comments. 
          // key: hour-1 up to hour-9
          var meetingNotesKey = scDay + "/mentors/" + curMentorEmail + "/" + key + "/notes";
          var startupNotesKey = scDay + "/startups/" + scData.startup + "/notes/" + curMentorEmail + "/" + key;
          var startupBackupNotesKey = "/startups/" + scData.startup + "/" + scDay + "/notes/" + curMentorEmail + "/" + key;
          var photosHTML = '<h5><b>Photos</b></h5> <div class="row">' + //col-lg-2 col-md-2 col-sm-3
            '<div class="img-1-upload"> <label for="camera-' + key + '" class="cam-label-but"> <span class="glyphicon glyphicon-camera"></span> Camera </label> \
              <input type="file" accept="image/*" capture="camera" id="camera-' + key + '" class="camera-but"> </div> \
            <div class="" id="img-place-holder-' + key + '" data-imgs-num="1"> </div> \
            </div> ';
          //console.log("=== Update mentors and comments for: " + key + " | data: " + scData);  getHourAsRange(key)
          html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            '<button class="btn btn-warning fetch-notes-button" data-key="' + scData.startup + '">' + scData.startup + '</button>' + '  ' +
            scData.starttime + " - " + scData.endtime +
            ' <button class="btn expend-notes-but btn-info" type="button" data-textarea-key="' + key + '" data-note-key="' + startupBackupNotesKey +
            '" data-toggle="collapse" data-target="#mentor-note-p-' + key +
            '" aria-expanded="false" aria-controls="collapseMentorDetails"> <span class="glyphicon glyphicon-resize-vertical" aria-hidden="true"></span>Open</button>' +
            ' </h3><b>Location: ' + scData.location + '</b> </div> ' +
            '<div id="mentor-note-p-' + key + '" class="panel-body collapse">' +
            '<p class="" id="meet-details-' + key + '"> ' +
            '<h5><label>Did the attendees were open and receptive? (1-5)</label></h5> <br>\
                <input type="text" class="note-slider" id="note-receptive-' + key + '" name="note-receptive" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
                <br><h5> <label>Was the session effective? (1-5)</label></h5><br> \
                <input type="text" class="note-slider" id="note-effective-' + key + '" name="note-effective" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
                <br><br> \
            <b>What did you talked about?</b> \
            <textarea id="' + key + '" class="form-control col-lg-10 meeting-notes-text" data-key="' + meetingNotesKey +
            '" data-startup="' + startupNotesKey + '" data-notes-backup="' + startupBackupNotesKey +
            '" data-starttime="' + scData.starttime + '" data-endtime="' + scData.endtime + '" name="meeting-notes">' +
            '</textarea>  <br><b>What are the action items?</b> \
            <textarea id="ai-' + key + '" class="form-control col-lg-10 meeting-notes-text" data-key="ai-' + meetingNotesKey +
            '" data-startup="ai-' + startupNotesKey + '" data-notes-backup="ai-' + startupBackupNotesKey +
            '" name="meeting-notes">' +
            '</textarea> ' + photosHTML + '<br><button class="btn btn-warning meeting-save-button">Save Notes</button> </p> </div> </div> </div>';

        });
        $("#mentor-schedule-list").html(html);
        $(".note-slider").slider({ tooltip: 'always' });
      } else {
        bootbox.alert("<h3>Could not find anything for this date.</h3> <br>Unscheduled meeting? \
         You can click on 'Ad Hoc Meeting' button.<br>Please check with the organizers before you do it. <br>Thanks!");
        $("#mentor-schedule-list").html("");
        ga('send', {
          hitType: 'event',
          eventCategory: 'schedule-mentor',
          eventAction: 'reload-empty-schedule: ' + curMentorEmail,
          eventLabel: 'for day: ' + scDay
        });
      }
    });
  });

  //
  // let mentor take notes on ad hoc session
  //
  function addUnscheduledNotes() {
    bootbox.hideAll();
    var scDay = $("#schedule-day-1").val();
    var key = "hour-" + Date.now();
    var selStartup = "todo";
    var meetingNotesKey = scDay + "/mentors/" + curMentorEmail + "/" + key + "/notes";
    var startupBackupNotesKey = "/startups/" + selStartup + "/" + scDay + "/notes/" + curMentorEmail + "/" + key;
    var startupNotesKey = scDay + "/startups/" + selStartup + "/notes/" + curMentorEmail + "/" + key;
    var startTime = (new Date()).getHours() + ":00";
    var endTime = (new Date()).getHours() + ":30";
    var selHtml = getStartupSelect();
    bootbox.confirm({
      message: '<label>The Startup </label>  ' + selHtml + '<h5><label><br>Did the attendees were open and receptive? (1-5)</label></h5><br>\
      <input type="text" class="note-slider" id="note-receptive-' + key +
        '" name="note-receptive" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
      <br><h5> <label>Was the session effective? (1-5)</label></h5><br> \
      <input type="text" class="note-slider" id="note-effective-' + key +
        '" name="note-effective" data-provide="slider" data-slider-min="1" data-slider-max="5" data-slider-step="1" data-slider-value="3" data-slider-tooltip="hide"> \
      <br><br> \
      What did you talked about? \
      <textarea id="' + key + '" class="form-control col-lg-10 meeting-notes-text" data-key="' + meetingNotesKey +
        '" data-startup="' + startupNotesKey + '" data-notes-backup="' + startupBackupNotesKey +
        '" data-starttime="' + startTime + '" data-endtime="' + endTime + '" name="meeting-notes">' +
        '</textarea>  <br>What are the action items? \
      <textarea id="ai-' + key + '" class="form-control col-lg-10 meeting-notes-text" data-key="ai-' + meetingNotesKey +
        '" data-startup="ai-' + startupNotesKey + '" data-notes-backup="ai-' + startupBackupNotesKey +
        '" name="meeting-notes"> </textarea> <h5>Photos</h5> ' +
        '<div class="row">' +
        '<div class="col-lg-5 col-md-5 col-sm-5 img-1-upload"> <label for="camera-1" class="cam-label-but"> <span class="glyphicon glyphicon-camera"></span> Camera </label> \
        <input type="file" accept="image/*" capture="camera" id="camera-1" class="camera-but"> </div> \
      <div class="col-lg-3 col-md-3 col-sm-3" id="img-place-holder" data-imgs-num="1"> </div> \
      </div> \
        <button id="adhoc-save-but">Save</button</p>',
      buttons: {
        confirm: {
          label: 'Save Notes',
          className: 'btn-success'
        },
        cancel: {
          label: 'Cancel',
          className: 'btn-danger'
        }
      },
      callback: function(result) {
        if (result) {
          var selStartup = $("#att-startup-list-select option:selected").text();
          startupBackupNotesKey = "/startups/" + selStartup + "/" + scDay + "/notes/" + curMentorEmail + "/" + key;
          startupNotesKey = scDay + "/startups/" + selStartup + "/notes/" + curMentorEmail + "/" + key;

          $("#" + key).attr('data-notes-backup', startupBackupNotesKey);
          $("#ai-" + key).attr('data-notes-backup', 'ai-' + startupBackupNotesKey);

          $("#" + key).attr('data-startup', startupNotesKey);
          $("#ai-" + key).attr('data-startup', 'ai-' + startupNotesKey);
          // console.log("Saving startup: " + selStartup + " stkey: " + 
          //   $("#"+key).attr('data-notes-backup') + " startupNotesKey: " +   $("#"+key).attr('data-startup') + 
          //   " mentor: "+ curMentorEmail + " key: "+key);
          saveMeetingNotes($("#adhoc-save-but"), selStartup);
        }
      }
    });

    $('.note-slider').slider({ tooltip: 'always' });
    $('#att-startup-list-select').selectpicker();
  }

  //
  // Ad hoc notes for unscheduled meeting
  //
  $('body').on('click', '#add-unschedule-notes', function(event) {
    addUnscheduledNotes();
  });

  //
  // Listen to the camera button
  //
  $('body').on('change', '.camera-but', function(event) {
    if (event.target && event.target.files[0]) {
      var imgsElemId = "#img-place-holder";
      var picKey = "";
      if (event.target.id != "camera-1") {
        // let's have the specific id for the list of meetings
        picKey = (event.target.id).substring(6);
        imgsElemId += picKey;
      }

      var imgNum = $(imgsElemId).attr("data-imgs-num");
      $(imgsElemId).append('<a id="pic-' + imgNum + picKey +
        '-link" href="#" target="_blank" class="pic-link"> </a> <img id="pic-' + imgNum + picKey +
        '" height="130" class="pic-src"> ');
      var picElem = $("#pic-" + imgNum + picKey);
      uploadImage(event, picElem[0]);
      var nImgNum = ++imgNum;
      $(imgsElemId).attr('data-imgs-num', nImgNum);
    }
  });


  //
  // Fetch the note per specific session
  //
  $('body').on('click', '.expend-notes-but', function(event) {
    var key = $(this).data("note-key");
    var textareaKey = $(this).data("textarea-key");
    var receptiveSliderKey = "note-receptive-" + textareaKey;
    var effectiveSliderKey = "note-effective-" + textareaKey;
    var imgsKey = "img-place-holder-" + textareaKey;
    var readRef = firebase.database().ref("/notes-backup/" + key);
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-mentor',
      eventAction: 'fetch-a-note',
      eventLabel: 'key: ' + key
    });

    readRef.once("value", function(snapshot) {
      var noteData = snapshot.val();
      if (noteData != null && noteData.meetingNotes) {
        $("#" + textareaKey).val(noteData.meetingNotes);
      }
      if (noteData != null && noteData.actionItems) {
        $("#ai-" + textareaKey).val(noteData.actionItems);
      }
      if (noteData != null && noteData.receptive) {
        $("#" + receptiveSliderKey).slider('setValue', noteData.receptive);
      }
      if (noteData != null && noteData.effective) {
        $("#" + effectiveSliderKey).slider('setValue', noteData.effective);
      }
      if (noteData != null && noteData.imgs) {
        var imgsHTML = "";
        for (var i = 0; i < noteData.imgs.length; i++) {
          imgsHTML += '<a id="pic-' + (i + 1) + textareaKey + '-link" href="' + noteData.imgs[i] +
            '" target="_blank" class="pic-link"> <img id="pic-' +
            (i + 1) + textareaKey + '" height="130" class="pic-src" src="' + noteData.imgs[i] + '"> </a>';
        }
        $("#" + imgsKey).html(imgsHTML);
        $("#" + imgsKey).attr('data-imgs-num', i);
      }
    });

  });

  //
  // Fetch all the notes per startup
  //
  $('body').on('click', '.fetch-notes-button', function(event) {
    var startupName = $(this).data("key");
    var readRef = firebase.database().ref("/notes-backup/startups/" + startupName);
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-mentor',
      eventAction: 'fetch-notes',
      eventLabel: 'startup: ' + startupName
    });

    readRef.orderByKey().once("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        //console.log("The sessions: " + JSON.stringify(sessions));
        var html = "";
        $.each(sessions, function(keyDate, scData) {
          // per startup - show all the notes
          var curNotes = "";
          var curSt = scData.notes;
          if (curSt != undefined) {
            for (var tmpMentorEmail in curSt) {
              var hours = curSt[tmpMentorEmail];
              Object.keys(hours).forEach(function(key) {
                var val = hours[key];
                var noteDate = val.date.replace("T", " ");
                var startTime = val.starttime;
                var endTime = val.endtime;
                var meetingTime = startTime + " - " + endTime;
                if (startTime === undefined || startTime === null) {
                  meetingTime = getHourAsRange(key); // The old way in v1.0
                }
                var notesHtml = "";
                if (val.meetingNotes && val.meetingNotes.length > 2) {
                  notesHtml = val.meetingNotes.replace(/\n/g, "<br>");
                }

                var actionItemsHtml = "";
                if (val.actionItems && val.actionItems.length > 2) {
                  actionItemsHtml = val.actionItems.replace(/\n/g, "<br>");
                }
                var tmpMentorEmailStr = tmpMentorEmail.replace(/-/g, ".");
                var tmpMentorDetails = '<button class="btn btn-sm btn-info fetch-mentor-button" data-key="' + tmpMentorEmail + '">' +
                  tmpMentorEmailStr + '</button>';

                html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
                  keyDate + " | " + meetingTime + ' </h3> </div> <div class="panel-body">' +
                  '<b>Mentor:</b> ' + tmpMentorDetails + '<br><b>Updated At: </b>' + noteDate +
                  '<p><b>Meeting Notes:</b><br>' + notesHtml + '</p>' +
                  '<b>Action Items:</b> ' + actionItemsHtml +
                  ' </div> </div>';
              });
            }
          }
        });
        if (html.length < 1) {
          html = "<h2>No Notes for " + startupName + " :/</h2>";
        }
        $("#startup-details-modal-body").html(html);
        $('#startup-details-modal').modal('show');

      } else {
        bootbox.alert("Could not find notes for you :/");
        $("#startup-details-modal-body").html("");
      }
      //$('body').scrollTop(60);
    });
  });

  //
  // Save the meeting notes
  //
  $('#mentor-schedule-list').on('click', '.meeting-save-button', function() {
    saveMeetingNotes($(this), "");
  });

  //
  //
  //
  function saveMeetingNotes(thisElem, startupName) {
    // save the meeting notes
    var tas = thisElem.parent().find('textarea');
    var notes = $("#" + tas[0].id).val();
    var actionItems = $("#" + tas[1].id).val();
    if (notes.length < 3) {
      bootbox.alert("<h4>Please fill the notes and write in few sentences what you talked about.</h4>");
      return;
    }
    if (actionItems.length < 3) {
      bootbox.alert("<h4>Please write the action items that you gave the startups.</h4>");
      return;
    }
    var sliders = thisElem.parent().find('input');
    var receptiveVal = $("#" + sliders[0].id).slider('getValue');
    var effectiveVal = $("#" + sliders[1].id).slider('getValue');

    var imgsElem = thisElem.parent().find('a');
    //console.log("Links to images: ", imgsElem);
    var imgsLinks = [];
    for (var i = 0; i < imgsElem.length; i++) {
      if (imgsElem[i].href && imgsElem[i].href.length > 10) {
        imgsLinks.push(imgsElem[i].href);
      }
    }
    // 2016-10-17/mentors/greenido@gmail-com/hour-1476728831043/notes
    var keyToSession = tas.data('key');
    var keyToStartup = tas.data('startup');

    // /startups/Aliada/2016-10-17/notes/greenido@gmail-com/hour-1476728831043"
    var keyToNotesBackup = tas.data('notes-backup');
    var startTime = tas.data('starttime');
    var endTime = tas.data('endtime');
    //console.log("keyToSession: " + keyToSession + " Notes: " + notes);
    if (keyToSession == undefined || keyToSession == null) {
      bootbox.alert("Sorry - Can't save your notes. Please take them in another way and let the organizers know about it.");
      return;
    }
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-mentor',
      eventAction: 'save-notes',
      eventLabel: 'keyToNotesBackup: ' + keyToNotesBackup
    });
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);

    // We hold the open/close button to trigger it when the save operation is done.
    var closingButton = thisElem.parent().parent().find('button')[1];

    // save under the mentor - this is where we fetch the schedule for the mentors
    ref.child("sessions").child(keyToSession).set({
      receptive: receptiveVal,
      effective: effectiveVal,
      meetingNotes: notes,
      actionItems: actionItems,
      starttime: startTime,
      endtime: endTime,
      imgs: imgsLinks,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Meeting notes for: " + keyToSession + " could not be saved :( Details: " + error);
      } else {
        $(".save-alert").show();
        closingButton.click();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
    // save under the startup
    ref.child("sessions").child(keyToStartup).set({
      receptive: receptiveVal,
      effective: effectiveVal,
      meetingNotes: notes,
      actionItems: actionItems,
      starttime: startTime,
      endtime: endTime,
      imgs: imgsLinks,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Meeting notes for: " + keyToStartup + " could not be saved :( Details: " + error);
      }
    });
    // save under notes for backup in case we re-set the schedule
    // TODO: copy the notes to the new schedule?
    ref.child("notes-backup").child(keyToNotesBackup).set({
      receptive: receptiveVal,
      effective: effectiveVal,
      meetingNotes: notes,
      actionItems: actionItems,
      starttime: startTime,
      endtime: endTime,
      imgs: imgsLinks,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        console.log("Meeting notes for: " + keyToStartup + " could not be saved :( Details: " + error);
      }
    });

    if (startupName.length > 1) {
      // we need to save the startup as we are on ad hoc meeting
      var tmpInx = keyToSession.lastIndexOf('/');
      var tmpKey = keyToSession.substring(0, tmpInx);
      ref.child("sessions").child(tmpKey).set({
        startup: startupName,
        location: "earth",
        starttime: startTime,
        endtime: endTime
      }, function(error) {
        if (error) {
          console.log("Error in saving the startup: " + startupName + " for ad hoc meeting. Err: " + error);
        } else {
          // let's reload the schedule with this new meeting/notes
          $("#sc-reload-button").click();
        }
      });
      ga('send', {
        hitType: 'event',
        eventCategory: 'startup-notes-mentor',
        eventAction: 'save-notes-ad-hoc-meeting',
        eventLabel: 'keyToNotesBackup: ' + keyToNotesBackup
      });
    }

  }
  //
  // TODO: remove it once we don't need to support the old way of meeting times
  //
  function getHourAsRange(key) {
    if (key.indexOf("1") > 0) {
      return "10:00 - 11:00";
    } else if (key.indexOf("2") > 0) {
      return "11:00 - 12:00";
    } else if (key.indexOf("3") > 0) {
      return "12:00 - 13:00";
    } else if (key.indexOf("4") > 0) {
      return "13:00 - 14:00";
    } else if (key.indexOf("5") > 0) {
      return "14:00 - 15:00";
    } else if (key.indexOf("6") > 0) {
      return "15:00 - 16:00";
    } else if (key.indexOf("7") > 0) {
      return "16:00 - 17:00";
    } else if (key.indexOf("8") > 0) {
      return "17:00 - 18:00";
    } else if (key.indexOf("9") > 0) {
      return "18:00 - 19:00";
    } else {
      return "--";
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Startups
  //////////////////////////////////////////////////////////////////////////////

  //
  // Get list of startups
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
  // Read the list of startups and display it
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
        var founded = (startupData.dateFounded).substring(0, 7);
        var videoButton = "";
        if (startupData.video && startupData.video.length > 5) {
          var videoLink = addhttp(startupData.video);
          videoButton = '<a href="' + videoLink + '" target="_blank" class="btn btn-info ">Intro Clip</a>  ';
        }
        var twitterLink = "";
        if (startupData.twitter && startupData.twitter.length > 2) {
          twitterLink = '&nbsp;&nbsp;<b>Twitter:</b> <a href="http://twitter.com/' + startupData.twitter + '" target="_blank">' + startupData.twitter + '</a>';
        }
        var onePagerButton = "";
        if (startupData.historyUrl && startupData.historyUrl.length > 4) {
          var onePagerLink = addhttp(startupData.historyUrl);
          onePagerButton = '<a href="' + onePagerLink + '" target="_blank" class="btn btn-info">First Day Evaluation</a>  ';
        }
        $("#startups-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          startupData.name + "&nbsp;&nbsp;<img src='" + startupLogoUrl + "' class='logo-img' alt='startup logo'>" +
          '</h3> </div> <div class="panel-body startup-edit" data-key="' + key + '"> <div class="startup-card-desc">' + startupData.description +
          '</div><b>From: </b>' + startupData.country + '  ' + startupData.city +
          '<b> Founded: </b>' + founded + '<br><b>Employees: </b>' + startupData.numEmployees +
          twitterLink + '<br>' + videoButton + '&nbsp;&nbsp;' + onePagerButton +
          '&nbsp;&nbsp;&nbsp;<button class="btn btn-warning fetch-notes-button" data-key="' +
          startupData.name + '">Notes</button> </div> </div>'
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
  // Save mentors
  //
  $("#form-save-mentor").click(function() {
    if (authUserData) {
      console.log("User " + authUserData.uid + " is logged in with " + authUserData.provider);
    } else {
      console.log("User is logged out");
      $("#alert-warning-sign-in").show();
      setTimeout(function() {
        $("#alert-warning-sign-in").hide();
      }, 2000);
      return;
    }

    // Validation - TODO: take it out to a function
    var name = $("#form-name-field").val();
    var emailKey = $("#form-email-field").val();
    var tel = $("#form-phone-field").val();
    // name validation
    if (name.length < 2) {
      $("#nameError").html("Please give a name - C'mon dude");
      $("#nameError").removeClass("sr-only");
      $("#nameError").addClass("alert");
      $("#form-name-field").focus();
      setTimeout(function() {
        $("#nameError").removeClass("alert");
        $("#nameError").addClass("sr-only");
      }, 1500);
      return;
    }

    // email validation
    if ($("#form-email-field").val().length < 2) {
      $("#emailError").html("Please give an email - Don't worry we will never spam you.");
      $("#emailError").removeClass("sr-only");
      $("#emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#emailError").removeClass("alert");
        $("#emailError").addClass("sr-only");
      }, 1500);
      return;
    }
    var emailRegEx = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
    if (!emailRegEx.test(emailKey)) {
      $("#emailError").html("Please give a valid email (e.g. momo@okko.com");
      $("#emailError").removeClass("sr-only");
      $("#emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#emailError").removeClass("alert");
        $("#emailError").addClass("sr-only");
      }, 1500);
      return;
    }
    // if (tel.length < 10) {
    //   $("#phoneError").html("Please give a phone - So we can call you late at night");
    //   $("#phoneError").removeClass("sr-only");
    //   $("#phoneError").addClass("alert");
    //   $("#form-name-field").focus();
    //   setTimeout(function() {
    //     $("#phoneError").removeClass("alert");
    //     $("#phoneError").addClass("sr-only");
    //   }, 1500);
    //   return;
    // }

    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);

    // save mentor's details in firebase
    var mentorKey = emailKey.replace(/\./g, "-");
    ref.child("mentors").child(mentorKey).set({
      name: name,
      email: emailKey,
      phone: tel,
      country: $("#form-country-field").val(),
      city: $("#form-city-field").val(),
      domain: $("#form-domain-select option:selected").text(),
      domainSec: $("#form-domain-sec-select option:selected").text(),
      twitter: $("#form-twitter-field").val(),
      bio: $("#form-bio").val(),
      funFact: $("#form-fun-fact").val(),
      expertise: $("#form-expertise").val(),
      linkedin: $("#form-linkedin-url").val(),
      site: $("#form-personal-url").val(),
      pic: $("#form-pic-url").val(),
      comments: $("#form-comments").val(),
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        alert("Data could not be saved :( Details: " + error);
      } else {
        console.log(name + " saved!");
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
    ga('send', {
      hitType: 'event',
      eventCategory: 'save-mentor',
      eventAction: 'save-mentor-info-fields',
      eventLabel: 'key: ' + emailKey
    });
  });

  //
  // read the list of mentors and display it
  //
  function readMentors(authData) {
    var readRef = firebase.database().ref("mentors");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The mentors: " + JSON.stringify(snapshot.val()));
      $("#mentors-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var mentorData = childSnapshot.val();
        if (mentorData.name != "--N/A--") {
          var mPicUrl = addhttp(mentorData.pic);
          var divDetailKey = key.replace("@", "");
          var mBio = "";
          if (mentorData.bio && mentorData.bio != undefined) {
            mBio = (mentorData.bio).replace(/\n/g, "<br>");
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
            '<h4><b>Expertise</b></h4> ' + mentorData.expertise +
            '<h4><b>Bio</b></h4> ' + mBio + ' </div> </div>'
          );
        }

      });
    });
  }

  //
  // clear the values of the mentor
  //
  $("#form-cancel-mentor").click(function() {
    $("#form-name-field").val("");
    $("#form-email-field").val("");
    $("#form-phone-field").val("");
    $("#form-country-field").val("");
    $("#form-city-field").val("");
    $("#form-domain-select").selectpicker('val', "UX");
    $("#form-domain-sec-select").selectpicker('val', "UX");
    $("#form-twitter-field").val();
    $("#form-bio").val();
    $("#form-fun-fact").val();
    $("#form-expertise").val("");
    $("#form-linkedin-url").val("");
    $("#form-personal-url").val("");
    $("#form-pic-url").val("");
    $("#form-comments").val("");
    $("#form-name-field").focus();
    //$('body').scrollTop(60);
    ga('send', {
      hitType: 'event',
      eventCategory: 'clear-mentor',
      eventAction: 'clear-mentor-info-fields',
      eventLabel: 'key: ' + curMentorEmail
    });
  });

  //
  // fetch mentor data base on its key (=email)
  //
  function fetchMentor(key) {
    var ref = firebase.database().ref("/mentors/" + key);
    ref.on("value", function(mentorSnap) {
      var mentor = mentorSnap.val();
      if (mentor != null) {
        //$("#form-name-field").val(mentor.name);
        var mEmail = key.replace(/\-/g, ".");
        $("#form-email-field").val(mEmail);
        $("#form-phone-field").val(mentor.phone);
        $("#form-country-field").val(mentor.country);
        $("#form-city-field").val(mentor.city);
        $("#form-domain-select").selectpicker('val', mentor.domain);
        $("#form-domain-sec-select").selectpicker('val', mentor.domainSec);
        $("#form-twitter-field").val(mentor.twitter);
        $("#form-bio").val(mentor.bio);
        $("#form-fun-fact").val(mentor.funFact);
        $("#form-expertise").val(mentor.expertise);
        $("#form-linkedin-url").val(mentor.linkedin);
        $("#form-personal-url").val(mentor.site);
        $("#form-pic-url").val(mentor.pic);
        $("#form-comments").val(mentor.comments);
        $("#notes-for-mentor").val(mentor.notesForDay);
        $("#form-name-field").focus();
        //$('body').scrollTop(60);
      } else {
        ga('send', {
          hitType: 'event',
          eventCategory: 'check-mentor',
          eventAction: 'fetch-not-registered-mentor',
          eventLabel: 'key: ' + key
        });
        bootbox.alert("It looks like you are not registered. Please ask for organizers to put you on the list, cool?");
        ref.unauth();
        setTimeout(function() {
          location.reload();
        }, 2000);
      }
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Attendees
  //////////////////////////////////////////////////////////////////////////////

  //
  // read the list of Attendees and display it
  //
  function readAttendees(authData) {
    var readRef = firebase.database().ref("/attendees/");
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
        $("#att-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          attData.name + '<img src="' + picUrl + '" class="att-pic-card" alt="attendee picture"/> ' +
          '</h3> </div> <div class="panel-body att-edit" data-key="' + key + '"> <h4>' + attData.startup +
          role + '</h4>' + "<b>email:</b><a href='mailto:" + attData.email + "' target='_blank'>" + attData.email + "</a>" +
          '<br><b>Linkedin:</b> <a href="http://www.linkedin.com/in/' +
          attData.linkedin + '" target="_blank">' + attData.linkedin + '</a><br><b>Fun Fact:</b> ' + attData.funFact +
          ' </div> </div>'
        );
      });
    });
  }

  //
  //
  //
  $('body').on('click', '.fetch-mentor-button', function(event) {
    var mentor = $(this).data("key");
    showMentorDetails(mentor);
  });

  //
  // fetch mentor data base on its key (=email)
  //
  function showMentorDetails(key) {
    if (key === "na@na-com") {
      return;
    }
    $('#startup-details-modal').modal('hide');
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
        $("#mentor-notes-details-modal-body").html(html);
        $("#mentor-notes-details-modal").modal('show');
        //bootbox.alert(html);
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
      eventCategory: 'mentor-gen-error',
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
  // a = new Date()
  //
  function timeConverter(a) {
    //var a = new Date(UNIX_timestamp * 1000);
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

  //
  // Upload images to firebase storage
  //
  function uploadImage(e, pic) {
    var file = e.target.files[0];
    pic.src = URL.createObjectURL(file);
    console.log("Working on picID: " + pic.id + " | Src: " + pic.src);
    var metadata = {
      contentType: 'image/jpeg'
    };

    var uploadTask = storageRef.child('images/' + file.name).put(file, metadata);
    uploadTask.picId = pic.id;
    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
      function(snapshot) {
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progress = Math.round(progress);
        console.log('Upload is ' + progress + '% done');
        $("#" + uploadTask.picId + "-link").html("%" + progress);
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED:
            console.log('Upload is paused');
            $("#" + uploadTask.picId + "-link").html("Upload is paused");
            break;
          case firebase.storage.TaskState.RUNNING:
            console.log('Upload is running with ' + pic.id);
            break;
        }
      },
      function(error) {
        switch (error.code) {
          case 'storage/unauthorized':
            // TODO - notify the user
            console.log("NOT unauthorized to upload");
            break;
          case 'storage/canceled':
            console.log("user canceled the upload");
            break;
          case 'storage/unknown':
            // TODO: Unknown error occurred, inspect error.serverResponse
            console.log("Unknown error occurred, inspect error.serverResponse", error);
            break;
        }
      },
      function() {
        // Upload completed successfully
        var downloadURL = uploadTask.snapshot.downloadURL;
        console.log("The downloadURL: " + downloadURL);
        //$("#" + uploadTask.picId).data("pic-url", downloadURL);
        $("#" + uploadTask.picId + "-link").attr("href", downloadURL);
      });
  }
})();
