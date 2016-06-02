//
// JS for the mentor web app
// Author: Ido Green 
// Date: 4/2016
//
(function() {
  $(".save-alert").hide();
  $("#alert-warning-sign-in").hide();
  $("#spin").hide();

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
    $("#joyRideTipContent").joyride({ autoStart: true });
  });

  // AUTH fun
  // start the connection with Firebase
  //
  var ref = new Firebase("https://lpa-1.firebaseio.com");
  authUserData = null;

  //
  // Create a new Firebase reference, and a new instance of the Login client
  //
  var chatRef = new Firebase('https://lpa-1.firebaseio.com/chats/mentors');
  //
  // Init the chat module
  //
  function initChat(authData) {
    var chat = new FirechatUI(chatRef, document.getElementById('firechat-wrapper'));
    chat.setUser(authData.uid, authData[authData.provider].displayName);
  }

  //
  // Authentication actions
  //
  ref.onAuth(function(authData) {
    if (authData) {
      if (authData.provider !== "google") {
        bootbox.alert("You must sign-in with your Google ID.<br>So first logout from the Admin App.<br>Thank you!");
        return;
      }

      initChat(authData);
      authUserData = authData;
      localStorage.setItem("lpa1-g-authData", JSON.stringify(authData));
      $("#sc-reload-button").prop('disabled', false);
      console.log("User " + authData.uid + " is logged in with " + authData.provider);
      $("#login-form").html("<img src='" + authData.google.profileImageURL + "' class='g-mentor-logo' alt='mentor logo' />");
      $("#logout-div").html("<form class='navbar-form navbar-right' role='form'><button id='logout-but' class='btn btn-success'>Logout</button> </form>");

      curMentorEmail = authData.google.email;
      curMentorEmail = curMentorEmail.replace(/\./g, "-");
      fetchMentor(curMentorEmail);
      // init our mentor with what we have from google-login
      $("#logout-but").text("Logout " + authData.google.displayName);
      $("#form-name-field").val(authData.google.displayName);
      $("#form-pic-url").val(authData.google.profileImageURL);

      readStartups(authData);
      readAttendees(authData);
      readMentors(authData);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in-mentor',
        eventAction: 'authenticated user.uid: ' + authData.uid,
        eventLabel: 'authentication'
      });
    } else {
      console.log("User is logged out");
      logoutUI();
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
  // Sign in user/password
  //
  $("#google-sign-in-but").click(function() {
    $("#spin").show();
    ref.authWithOAuthPopup("google", function(error, authData) {
      $("#spin").hide();
      if (error) {
        console.log("Login Failed!", error);
        ga('send', {
          hitType: 'event',
          eventCategory: 'sign-in-mentor',
          eventAction: 'sign-in-button',
          eventLabel: 'authentication failed: ' + error,
        });
        $("#err-modal").modal('show');
      } else {
        $("#sc-reload-button").prop('disabled', false);
        console.log("Authenticated with payload:", authData);
      }
    }, {
      scope: "email"
    });
    return false;
  });

  //
  // logout action
  //
  $("#logout-but").click(function() {
    ref.unauth();
    logoutUI();
    return false;
  });


  //////////////////////////////////////////////////////////////////////////////
  // Fetch schedule
  //////////////////////////////////////////////////////////////////////////////
  //
  // Reload the schedule from firebase per date
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

    var readRef = new Firebase("https://lpa-1.firebaseio.com/sessions/" + scDay + "/mentors/" + curMentorEmail);
    readRef.orderByKey().on("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        console.log("The sessions: " + JSON.stringify(sessions));
        var html = "";
        $.each(sessions, function(key, scData) {
          // per startup set the mentors + comments
          var meetingNotesKey = scDay + "/mentors/" + curMentorEmail + "/" + key + "/notes";
          var startupNotesKey = scDay + "/startups/" + scData.startup + "/notes/" + curMentorEmail + "/" + key;
          var startupBackupNotesKey = "/startups/" + scData.startup + "/" + scDay + "/notes/" + curMentorEmail + "/" + key;

          console.log("=== Update mentors and comments for: " + key + " | data: " + scData);
          html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            scData.startup + ' | ' + getHourAsRange(key) +
            ' <button class="btn expend-notes-but" type="button" data-textarea-key="' + key + '" data-note-key="' + startupBackupNotesKey +
            '" data-toggle="collapse" data-target="#mentor-note-p-' + key +
            '" aria-expanded="false" aria-controls="collapseMentorDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"></span></button>' +
            ' </h3><b>Location: ' + scData.location + '</b> </div> <div id="mentor-note-p-' + key + '" class="panel-body collapse">' +
            '<p class="" id="meet-details-' + key + '">Meeting Notes:<br> \
            <textarea id="' + key + '" class="form-control col-lg-10 meeting-notes-text" data-key="' + meetingNotesKey +
            '" data-startup="' + startupNotesKey + '" data-notes-backup="' + startupBackupNotesKey +
            '" name="meeting-notes">' +
            '</textarea>  <button class="btn btn-warning meeting-save-button">Save Notes</button> </p> </div> </div> </div>';
          // TODO: add an option to take photos: 
          // <div class="row"> <div class="col-lg-3 col-md-3"> <input type="file" name="file" class="input-img" id="notesImg" accept="image/*"> 
          // <button type="submit" class="btn btn-info meeting-img-button">Upload Image</button> 
        });
        $("#mentor-schedule-list").html(html);
      } else {
        bootbox.alert("Could not find anything for this date.");
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
  // Fetch the note per specific session
  //
  $('body').on('click', '.expend-notes-but', function(event) {
    var key = $(this).data("note-key");
    var textareaKey = $(this).data("textarea-key");
    var readRef = new Firebase("https://lpa-1.firebaseio.com/notes-backup/" + key);
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
    });

  });

  //
  // Fetch all the notes per startup
  //
  $('body').on('click', '.fetch-notes-button', function(event) {
    var startupName = $(this).data("key");
    var readRef = new Firebase("https://lpa-1.firebaseio.com/notes-backup/startups/" + startupName);
    ga('send', {
      hitType: 'event',
      eventCategory: 'startup-notes-mentor',
      eventAction: 'fetch-notes',
      eventLabel: 'startup: ' + startupName
    });

    readRef.orderByKey().on("value", function(snapshot) {
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
                var notesHtml = val.meetingNotes.replace(/\n/g, "<br>");
                html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
                  startupName + ' | ' + getHourAsRange(key) + ' </h3> </div> <div class="panel-body">' +
                  '<b>Mentor:</b> ' + tmpMentorEmail + '<br><b>Date: ' + noteDate +
                  '</b> <p><b>Meeting Notes:</b><br>' + notesHtml + '</p> </div> </div>';
              });
            }
          }
        });
        if (html.length < 1) {
          html = "<h2>No Notes for " + startupName + " :/</h2>";
        }
        $("#startup-notes").html(html);
      } else {
        bootbox.alert("Could not find notes for you :/");
        $("#startup-notes").html("");
      }
      $('body').scrollTop(60);
    });
  });

  //
  // Save the meeting notes
  //
  $('#mentor-schedule-list').on('click', '.meeting-save-button', function() {
    // save the meeting notes
    var ta = $(this).closest('p').find('textarea');
    var notes = ta.val();
    var keyToSession = ta.data('key');
    var keyToStartup = ta.data('startup');
    var keyToNotesBackup = ta.data('notes-backup');
    console.log("keyToSession: " + keyToSession + " Notes: " + notes);
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
    // save under the mentor
    ref.child("sessions").child(keyToSession).set({
      meetingNotes: notes,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Meeting notes for: " + keyToSession + " could not be saved :( Details: " + error);
      } else {
        console.log(keyToSession + " notes Saved!");
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
    // save under the startup
    ref.child("sessions").child(keyToStartup).set({
      meetingNotes: notes,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Meeting notes for: " + keyToStartup + " could not be saved :( Details: " + error);
      } else {
        console.log(keyToSession + " notes Saved!");
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
    // save under notes for backup in case we re-set the schedule
    // TODO: copy the notes to the new schedule?
    ref.child("notes-backup").child(keyToNotesBackup).set({
      meetingNotes: notes,
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        console.log("Meeting notes for: " + keyToStartup + " could not be saved :( Details: " + error);
      } else {
        console.log(keyToSession + " notes Saved to backup!");
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
  });

  //
  //
  //
  function getHourAsRange(key) {
    if (key.indexOf("1") > 0) {
      return "9:00 - 10:00";
    } else if (key.indexOf("2") > 0) {
      return "10:00 - 11:00";
    } else if (key.indexOf("3") > 0) {
      return "11:00 - 12:00";
    } else if (key.indexOf("4") > 0) {
      return "12:00 - 13:00";
    } else if (key.indexOf("5") > 0) {
      return "13:00 - 14:00";
    } else if (key.indexOf("6") > 0) {
      return "14:00 - 15:00";
    } else if (key.indexOf("7") > 0) {
      return "15:00 - 16:00";
    } else if (key.indexOf("8") > 0) {
      return "16:00 - 17:00";
    } else if (key.indexOf("9") > 0) {
      return "17:00 - 18:00";
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
    var readRef = new Firebase("https://lpa-1.firebaseio.com/startups/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The Startups: " + JSON.stringify(snapshot.val()));
      $("#startups-list").html("");
      startupNameList = [];
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key();
        startupNameList.push(key);
        var startupData = childSnapshot.val();
        var startupLogoUrl = addhttp(startupData.logo);
        $("#startups-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          startupData.name + "&nbsp;&nbsp;<img src='" + startupLogoUrl + "' class='logo-img' alt='startup logo'>" +
          '</h3> </div> <div class="panel-body startup-edit" data-key="' + key + '"> <div class="startup-card-desc">' + startupData.description +
          '</div>From: <b>' + startupData.country + '  ' + startupData.city +
          '</b> Founded: <b>' + startupData.dateFounded + '</b><br>Employees: <b>' + startupData.numEmployees +
          '</b><br> <h4> <span class="label label-warning"> <a href="' + startupData.video +
          '" target="_blank">Application Video</a> </span> ' +
          ' &nbsp;&nbsp; <span class="label label-success"><a href="' +
          startupData.historyUrl + '" target="_blank">History File</a> </span></h4>' + '<button class="btn btn-lg btn-warning fetch-notes-button" data-key="' +
          startupData.name + '">Notes</button></div> </div>'
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
    var authData = ref.getAuth();
    if (authData) {
      console.log("User " + authData.uid + " is logged in with " + authData.provider);
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
    if (tel.length < 10) {
      $("#phoneError").html("Please give a phone - So we can call you late at night");
      $("#phoneError").removeClass("sr-only");
      $("#phoneError").addClass("alert");
      $("#form-name-field").focus();
      setTimeout(function() {
        $("#phoneError").removeClass("alert");
        $("#phoneError").addClass("sr-only");
      }, 1500);
      return;
    }

    console.log("saving to Firebase: " + name + " , " + emailKey);
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);

    // save it in firebase
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
    })
  });

  //
  // read the list of mentors and display it
  //
  function readMentors(authData) {
    var readRef = new Firebase("https://lpa-1.firebaseio.com/mentors/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The mentors: " + JSON.stringify(snapshot.val()));
      $("#mentors-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key();
        var mentorData = childSnapshot.val();
        if (mentorData.name != "--N/A--") {
          var mPicUrl = addhttp(mentorData.pic);
          var divDetailKey = key.replace("@", "");
          $("#mentors-list").append(
            '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
            mentorData.name + '<img src="' + mPicUrl + '" class="att-pic-card" alt="mentor picture" /> ' +
            ' &nbsp; &nbsp;<button class="btn" type="button" data-toggle="collapse" data-target="#mentor-panel-' + divDetailKey +
            '" aria-expanded="false" aria-controls="collapseMentorDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"></span></button>' +
            '</h3> </div> <div id="mentor-panel-' + divDetailKey + '" class="panel-body mentor-edit collapse" data-key="' + key +
            '"> <h5><a href="mailto:' + mentorData.email + '" target="_blank">' + mentorData.email + '</a></h5>' +
            '<b>Phone:</b> <a href="tel:' + mentorData.phone + '">' + mentorData.phone + "</a><br>" +
            '<b>Domain:</b> ' + mentorData.domain + ' - <b>Secondary:</b> ' + mentorData.domainSec +
            '<br><b>Expertise:</b> ' + mentorData.expertise + ' </div> </div>'
          );
        }

      });
    });
  }

  //
  // read the list of mentors and display it
  //
  // function checkIfMentorValid(authData) {
  //   var readRef = new Firebase("https://lpa-1.firebaseio.com/mentors/");
  //   var curMentorEmail = authData.google.email;
  //   readRef.orderByKey().on("value", function(snapshot) {
  //     var mentorsDataStr = JSON.stringify(snapshot.val());
  //     //console.log("The mentors: " + mentorsDataStr);
  //     if (mentorsDataStr.indexOf(curMentorEmail) > 0) {
  //       console.log("This mentor is not part of the white list");
  //       bootbox.alert("You are not on the mentor list.<br>Please talk with the LPA team.<br>Be strong.");

  //     }
  //   });
  // }

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
    $('body').scrollTop(60);
  });

  //
  // fetch mentor data base on its key (=email)
  //
  function fetchMentor(key) {
    var ref = new Firebase("https://lpa-1.firebaseio.com/mentors/" + key);
    ref.on("value", function(mentorSnap) {
      var mentor = mentorSnap.val();
      if (mentor != null) {
        console.log("Setting data for: " + JSON.stringify(mentor));
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
        $("#form-name-field").focus();
        $('body').scrollTop(60);
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

  //
  // enable removing mentors
  //
  $('body').on('click', '.remove-mentor', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("Are you sure? For Real?", function(result) {
      if (result == true) {
        var fredRef = new Firebase('https://lpa-1.firebaseio.com/mentors/' + key);
        var onComplete = function(error) {
          if (error) {
            console.log('Synchronization failed');
          } else {
            console.log('Synchronization succeeded - mentor was removed');
            $("#mentors-list").html('<div id="loading-mentors"><h2><i class="fa fa-spinner fa-spin"></i> </h2></div>');
            readMentors(authUserData);
          }
        };
        fredRef.remove(onComplete);
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  // Attendees
  //////////////////////////////////////////////////////////////////////////////

  //
  // read the list of Attendees and display it
  //
  function readAttendees(authData) {
    var readRef = new Firebase("https://lpa-1.firebaseio.com/attendees/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The attendees: " + JSON.stringify(snapshot.val()));
      $("#att-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key();
        var attData = childSnapshot.val();
        var picUrl = addhttp(attData.pic);
        //console.log("key: " + key + " data: " + attData);
        $("#att-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          attData.name + '<img src="' + picUrl + '" class="att-pic-card" alt="attendee picture"/> ' +
          '</h3> </div> <div class="panel-body att-edit" data-key="' + key + '"> <h4>' + attData.startup + '</h4>' +
          "<b>email:</b><a href='mailto:" + attData.email + "' target='_blank'>" + attData.email + "</a>" +
          '<br><b>Linkedin:</b> <a href="http://www.linkedin.com/in/' +
          attData.linkedin + '" target="_blank">' + attData.linkedin + '</a><br><b>Fun Fact:</b> ' + attData.funFact +
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
      eventCategory: 'mentor-gen-error',
      eventAction: 'msg: ' + msg,
      eventLabel: 'url: ' + url + " line: " + lineNumber
    });
  };

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
