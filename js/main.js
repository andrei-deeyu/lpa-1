//
// JS for the mentor Admin web app
// Author: Ido Green 
// Date: 4/2016
// V8.0
//
(function() {
  $(".save-alert").hide();
  $("#spin").hide();
  $("#sc-save-button").hide();

  var startupNameList = [];
  var mentorsList = [];
  var locationsList = [];
  var isInSaveOperation = false;
  var gotDataForSchedule = 0;

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
    $("#joyRideTipContent").joyride({ autoStart: true });
  });

  //
  // AUTH fun
  // start the connection with firebase DB
  var config = {
    apiKey: "AIzaSyDImJzAqBmZVXdaK55jVfRuoaHVLBDFgxU",
    authDomain: "lpa-1.firebaseapp.com",
    databaseURL: "https://lpa-1.firebaseio.com",
    storageBucket: "project-1969056342883930904.appspot.com",
  };
  // Initialize Firebase
  firebase.initializeApp(config);
  var ref = firebase.database().ref();
  authUserData = null;

  //
  // Init the chat module
  //
  function initMentorsChat(authData) {
    // Create a new Firebase reference, and a new instance of the Login client
    var mentorsChatRef = firebase.database().ref("mentors"); //new Firebase('https://lpa-1.firebaseio.com/chats/mentors');
    var mChat = new FirechatUI(mentorsChatRef, $("#mentors-firechat-wrapper"));
    mChat.setUser(authData.uid, authData[authData.provider].displayName);
  }

  //
  //
  //
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      authUserData = user;
      $("#sc-save-button").show();
      //TODO: initMentorsChat(authData);
      //localStorage.setItem("lpa1-authData", JSON.stringify(authData));
      console.log("User " + user.uid + " is logged in with " + user.provider);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in-admin',
        eventAction: 'authenticated user.uid: ' + user.uid + ' email: ' + authUserData.email,
        eventLabel: 'authentication'
      });
      $("#login-form").hide();
      $("#logout-div").html("<form class='navbar-form navbar-right' role='form'><button id='logout-but' class='btn btn-success'>Logout</button> </form>");
      readMentors(user);
      readStartups(user);
      readAttendees(user);
      readLocations(user);
    } else {
      console.log("User is logged out");
      $("#login-form").show();
      $("#spin").hide();
      $("#logout-div").html("");
    }
  });

  //
  // Sign in user/password
  //
  $("#sign-in-but").click(function() {
    $("#spin").show();
    var email = $("#email").val();
    var password = $("#passwd").val();

    firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      $("#spin").hide();
      console.log("Login Failed! errCode: " + errorCode + " ErrMsg: " + errorMessage);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-in',
        eventAction: 'admin-sign-in-button',
        eventLabel: 'sign-in-error: ' + errorMessage,
        eventValue: 1
      });
      $("#err-modal").modal('show');
      if (errorCode === 'auth/wrong-password') {
        console.log('Err: Wrong password.');
      } else {
        console.error(error);
      }
    });
    return false;
  });

  //
  // logout
  //
  $('#logout-div').on('click', '#logout-but', function(event) {
    console.log("-- trying to logout --");
    firebase.auth().signOut().then(function() {
      console.log("Sign-out successful");
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-out',
        eventAction: 'sign-out-button-success',
        eventLabel: 'authentication'
      });
    }, function(error) {
      console.log("Could not sign-out. Err: " + error);
      ga('send', {
        hitType: 'event',
        eventCategory: 'sign-out',
        eventAction: 'sign-out-button-failed',
        eventLabel: 'authentication'
      });
    });
    return false;
  });

  //////////////////////////////////////////////////////////////////////////////
  // Schedule magic
  //////////////////////////////////////////////////////////////////////////////
  //
  // Save the current schedule
  //
  function saveSchedule(scDay) {

    isInSaveOperation = true;
    console.log("=== is going INTO save");
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule-admin',
      eventAction: 'save-schedule',
      eventLabel: 'for: ' + scDay + ' By: ' + authUserData.uid
    });

    // clean the schedule for that day
    ref.child("sessions").child(scDay).child("mentors").set({}, function(error) {
      if (error) {
        bootbox.alert("Schedule could not clean mentor schedule for: " + scDay + " Details: " + error);
        ga('send', {
          hitType: 'event',
          eventCategory: 'schedule-admin-error',
          eventAction: 'clean-mentors-schedule',
          eventLabel: 'for: ' + scDay
        });
      }
    });
    ref.child("sessions").child(scDay).child("startups").set({}, function(error) {
      if (error) {
        bootbox.alert("Schedule could not clean startup schedule for: " + scDay + " Details: " + error);
        ga('send', {
          hitType: 'event',
          eventCategory: 'schedule-admin-error',
          eventAction: 'clean-startup-schedule',
          eventLabel: 'for: ' + scDay
        });
      }
    });

    // on each startup we collect the mentors per hours and create sessions
    $(".sc-start-name").each(function() {
      var startupName = $.trim($(this).text());
      var startupKey = startupName.replace(/\s/g, "");
      var mentorPerHour = [];
      for (var j = 1; j < 10; j++) {
        var tmpMentorEmail = $("#mentor-" + startupKey + "-" + j + "-select").val();
        var tmpMentorName = $("#mentor-" + startupKey + "-" + j + "-select option:selected").text();
        var location = $("#meeting-location-" + startupKey + "-" + j + "-select option:selected").text();
        var tmpM = [tmpMentorEmail, tmpMentorName, location];
        mentorPerHour.push(tmpM);

        ref.child("sessions").child(scDay).child("mentors").child(tmpMentorEmail).child("hour-" + j).set({
          name: tmpMentorName,
          startup: startupKey,
          location: location
        }, function(error) {
          if (error) {
            bootbox.alert("Schedule could not be saved :( Details: " + error);
          }
        });
      }
      //
      var startupComments = $("#sc-comments-" + startupKey).val();
      // console.log("Saving startup: " + startupName + " Comments:" + startupComments + " Mentors: " + mentorPerHour);
      // save the sessions per startup
      ref.child("sessions").child(scDay).child("startups").child(startupName).set({
        mentors: mentorPerHour,
        comments: startupComments
      }, function(error) {
        if (error) {
          bootbox.alert("Schedule could not be saved :( Details: " + error);
        } else {
          console.log("Schedule saved!");
          $(".save-alert").show();
          setTimeout(function() {
            $(".save-alert").hide();
          }, 1500);
        }
      });
    });
    isInSaveOperation = false;
    console.log("=== is going OUT of save");
  }

  //
  // Save button action
  //
  $("#sc-save-button").click(function() {
    var scDay = $("#schedule-day-1").val();
    if (scDay === null || scDay === "") {
      bootbox.alert("You must set a date!");
      $("#schedule-day-1").focus();
      return;
    }

    bootbox.confirm("<h5>You are going to save a new schedule for " + scDay + "</h5><h3>Are you sure?</h3>", function(result) {
      if (result === false) {
        return;
      } else {
        // check for duplicate mentors
        var isOk = isScheduleGotErrors();
        if (isOk.length > 3) {
          bootbox.confirm(isOk + "<br><h5>Wanna save it anyway?</h5>", function(result) {
            if (result === false) {
              return;
            } else {
              saveSchedule(scDay);
            }
          });
        } else {
          saveSchedule(scDay);
        }
      }
    });

  });

  //
  // Check if we assign the same mentor to more then one startup in a certain time
  //
  function isScheduleGotErrors() {
    var stLen = startupNameList.length;
    var msg = "Yo! You have assigned the same mentor to more than one startup";
    for (var j = 1; j < 10; j++) {
      var tmpMenForThisHour = [];
      var naLen = 0;
      for (var i = 0; i < stLen; i++) {
        var tmpMentorEmail = $("#mentor-" + startupNameList[i] + "-" + j + "-select").val();
        if (tmpMentorEmail === "na@na-com") {
          naLen++;
        } else {
          tmpMenForThisHour.push(tmpMentorEmail);
        }

      }
      // let's see if we have duplicates
      var uniqueMentor = tmpMenForThisHour.filter(onlyUnique);
      if ((uniqueMentor.length + naLen) < stLen) {
        var hourStr = getHourAsRange("h-" + j);
        msg += "<h5>At " + hourStr + "</h5>";
      }
    }
    msg += "Please resolve this as we can't split mentors (yet).";
    if (msg.indexOf('At') < 0) {
      msg = "";
    }
    return msg;
  }

  //
  // Reload the schedule from firebase
  //
  $("#sc-reload-button").click(function() {
    var scDay = $("#schedule-day-1").val();
    if (scDay === null || scDay === "") {
      bootbox.alert("You must set a date in order to reload schedule. Daaa!");
      $("#schedule-day-1").focus();
      return;
    }
    var readRef = firebase.database().ref("sessions/" + scDay + "/startups");
    //new Firebase("https://lpa-1.firebaseio.com/sessions/" + scDay + "/startups");
    readRef.orderByKey().on("value", function(snapshot) {
      if (isInSaveOperation) {
        console.log("no no not yet - still writing to firebase");
        return;
      }
      var sessions = snapshot.val();
      if (sessions !== null) {
        //console.log("The sessions: " + JSON.stringify(sessions));
        $.each(sessions, function(startupName, scData) {
          // per startup set the mentors + comments
          //console.log("update mentors and comments for: " + startupName);
          $("#sc-comments-" + startupName).val(scData.comments);
          var len = scData.mentors.length + 1;
          for (var j = 1; j < len; j++) {
            var curMentor = scData.mentors[j - 1];
            var key = curMentor[0];
            var name = curMentor[1];
            var loc = curMentor[2];
            //console.log("startup: " + startupName + " key:" + key + " name:" + name);
            $("#mentor-" + startupName + "-" + j + "-select").val(key);
            $("#meeting-location-" + startupName + "-" + j + "-select").val(loc);
          }
        });
      } else {
        if (isInSaveOperation) {
          console.log("no no not yet - still writing to firebase");
          return;
        }
        bootbox.alert("Could not find anything for this date.");
      }
    });
  });

  //
  // Reset the schedule and make it clean again
  //
  $("#sc-reset-button").click(function() {
    buildScheduleRow();
  });

  //
  // We need the list of startups, mentors and location before we can build the UI for the schedule
  //
  function checkWeHaveDataForSchedule() {
    var secTimer;
    checkWeHaveDataForScheduleCounter++;
    console.log(" -- checkWeHaveDataForSchedule -- flag: " + gotDataForSchedule);
    if (gotDataForSchedule < 3) {
      secTimer = setTimeout(checkWeHaveDataForSchedule, 1000); /* this checks the flag every 1 second */
    } else {
      buildScheduleRow();
      // shut the timer
      clearTimeout(secTimer);
    }
    if (checkWeHaveDataForScheduleCounter > MAX_CALLS_FOR_CHECK_DATA) {
      if (firebase.auth().currentUser === null) {
        bootbox.alert("Please sign-in so we could fetch all the information.");
      } else {
        bootbox.alert("Something is not right. We have problems with fetching the data.");
      }
      // shut the timer
      clearTimeout(secTimer);
    }
  }

  var MAX_CALLS_FOR_CHECK_DATA = 10;
  var checkWeHaveDataForScheduleCounter = 0;
  checkWeHaveDataForSchedule();

  //
  // Build the html row of our schedule
  //
  function buildScheduleRow() {
    var html = "";
    var len = startupNameList.length;
    for (var i = 0; i < len; i++) {
      html += '<div class="row">';
      html += '<div class="col-md-2 col-lg-1 text-center sc-start-name">' + startupNameList[i] + ' </div>';
      var startupKey = startupNameList[i].replace(/\s/g, "");
      for (var j = 1; j < 10; j++) {
        html += '<div class="col-md-1 col-lg-1 text-center ">';
        html += getMentorsSelect("mentor-" + startupKey + "-" + j + "-select");
        html += '<br>' + getMeetingLocations("meeting-location-" + startupKey + "-" + j + "-select");
        html += '</div>';
      }
      html += '<div class="col-md-2 col-lg-2 text-center ">';
      html += '<textarea class="form-control sc-comments" id="sc-comments-' + startupKey +
        '" name="sc-comments-' + i + '" placeholder="General Comments For The Day"></textarea>';
      html += '</div>';
      html += '</div> <!-- row -->';
    }

    $("#schedule-tab-table").html(html);
  }

  //
  // get list of mentors in a select 
  //
  function getMentorsSelect(htmlObjId) {
    var html = '<select id="' + htmlObjId + '" class="mentor-selector">';
    var len = mentorsList.length;
    mentorsList.sort(compare);
    for (var i = 0; i < len; i++) {
      var mKey = (mentorsList[i].email).replace(/\./g, "-");
      html += '<option value="' + mKey + '">' + mentorsList[i].name + '</option>';
    }
    html += '</select>';
    return html;
  }

  //
  // helper function to sorting
  //
  function compare(a, b) {
    if (a.name < b.name)
      return -1;
    else if (a.name > b.name)
      return 1;
    else
      return 0;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Notes viewer per startup
  // TODO: per mentor
  //////////////////////////////////////////////////////////////////////////////
  //
  // reset the notes viewer
  //
  $("#notes-viewer-reload-button").click(function() {
    // Fetch the startup notes
    var curStartup = $("#notes-viewer-startup-select").val();
    loadStartupNotes(curStartup);

  });

  //
  // Load the schedule per a attendee
  //
  function loadStartupNotes(curStartup) {
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule',
      eventAction: 'admin-load-startup-notes',
      eventLabel: " Startup: " + curStartup
    });
    var dataSet = [];
    var gotAllData = false;
    var readRef = firebase.database().ref("notes-backup/startups/" + curStartup);
    readRef.orderByKey().on("value", function(snapshot) {
      var notes = snapshot.val();
      if (notes != null) {
        //console.log("notes: " + JSON.stringify(notes));
        for (var x in notes) {
          try {
            var attNotes = Object.keys(notes[x]); // or notes
            for (var j = 0; j < attNotes.length; j++) {
              var noteType = attNotes[j];
              var mentors = Object.keys(notes[x][noteType]);
              for (var i = 0; i < mentors.length; i++) {
                // go on all the mentors
                var mentor = mentors[i];
                var attendee = Object.keys(notes[x][noteType][mentor]);
                if (attendee[0].indexOf("hour") > -1) {
                  // the old/broken format of notes without the mentor
                  var hour = attendee[0];
                  var effective = (notes[x][noteType][mentor][hour]).effective;
                  var receptive = (notes[x][noteType][mentor][hour]).receptive;
                  var actionItems = (notes[x][noteType][mentor][hour]).actionItems;
                  var mNotes = (notes[x][noteType][mentor][hour]).meetingNotes;
                  dataSet.push([x, mentor, "n/a", hour, effective, receptive, actionItems, mNotes]);
                } else {
                  var tmpAtt = attendee[0];
                  var tmpHour = hour[0];
                  var hour = Object.keys(notes[x][noteType][mentor][tmpAtt]);
                  var effective = (notes[x][noteType][mentor][tmpAtt][tmpHour]).effective;
                  var receptive = (notes[x][noteType][mentor][tmpAtt][tmpHour]).receptive;
                  var actionItems = (notes[x][noteType][mentor][tmpAtt][tmpHour]).actionItems;
                  var mNotes = (notes[x][noteType][mentor][tmpAtt][tmpHour]).meetingNotes;
                  dataSet.push([x, mentor, tmpAtt, tmpHour, effective, receptive, actionItems, mNotes]);
                }
              }
            }
          } catch (err) {
            console.log("Error in building the notes table: " + err);
            dataSet.push([x, "", "", "", "", "", "", ""]);
          }
        } // for loop
        console.log("=======   " + dataSet);
        gotAllData = true;
      } else {
        bootbox.alert("Could not find notes for " + curStartup);
      }
    });

    checkWeHaveDataForNotesTable(dataSet, gotAllData);
  }

  var checkWeHaveDataForNotesCounter = 0;
  //
  //
  //
  function checkWeHaveDataForNotesTable(dataSet, gotAllData) {
    var secTimer;
    checkWeHaveDataForNotesCounter++;
    console.log(" -- checkWeHaveDataForNotesCounter -- flag: " + gotAllData);
    if ( !gotAllData) {
      secTimer = setTimeout(checkWeHaveDataForNotesTable, 1000);
    } else {
      $('#startup-notes-table').DataTable({
      data: dataSet,
      columns: [
        { title: "Date" },
        { title: "Mentor" },
        { title: "Attendee" },
        { title: "Hour" },
        { title: "Effective" },
        { title: "Receptive" },
        { title: "Action Items", "width": "280px" },
        { title: "Notes", "width": "350px" }
      ]
    });
      // shut the timer
      clearTimeout(secTimer);
    }
    if (checkWeHaveDataForNotesCounter > MAX_CALLS_FOR_CHECK_DATA) {
      clearTimeout(secTimer);
      bootbox.alert("Could not fetch the notes :/");
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Schedule viewer per mentor / startup
  //////////////////////////////////////////////////////////////////////////////
  //
  // reset the schedule viewer
  //
  $("#sc-viewer-reset-button").click(function() {
    $("#mentor-schedule-list").html("");
  });

  //
  // Reload the mentor or startup schedule
  //
  $("#sc-viewer-reload-button").click(function() {
    if ($("#r-mentor").is(':checked')) {
      // Fetch the mentor schedule only if it's not N/A
      var curMentorEmail = $("#mentor-sel-viewer").val();
      loadMentorSechdule(curMentorEmail);
    }

    if ($("#r-startup").is(':checked')) {
      // Fetch the startup schedule
      var curStartup = $("#sec-viewer-startup-select").val();
      loadStartupSchedule(curStartup);
    }
  });

  //
  // loading the mentor schedule
  //
  function loadMentorSechdule(curMentorEmail) {
    var scDay = $("#schedule-viewer-day").val();
    if (scDay == null || scDay == "") {
      bootbox.alert("You must set a date in order to reload schedule. Daaa!");
      $("#schedule-viewer-day").focus();
      return;
    }
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule',
      eventAction: 'admin-load-mentor-schedule',
      eventLabel: 'day: ' + scDay + " mentor:" + curMentorEmail
    });
    var readRef = firebase.database().ref("sessions/" + scDay + "/mentors/" + curMentorEmail);
    //new Firebase("https://lpa-1.firebaseio.com/sessions/" + scDay + "/mentors/" + curMentorEmail);
    readRef.orderByKey().on("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        //console.log("The sessions: " + JSON.stringify(sessions));
        var html = ""; //"<h3>" + curMentorEmail + "</h3>";
        $("#mentor-schedule-list").html("");
        $.each(sessions, function(key, scData) {
          html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            scData.startup + ' | ' + getHourAsRange(key) + ' </h3> </div> <div class="panel-body">' +
            '<b>Location: ' + scData.location + '</b> <p class="" id="meet-details-' + key + '"></p> </div> </div> </div>';
        });
        $("#mentor-schedule-list").html(html);
      } else {
        bootbox.alert("Could not find anything for this date.");
        $("#mentor-schedule-list").html("");
      }
    });
  }

  //
  // Load the schedule per a attendee
  //
  function loadStartupSchedule(curAttendeeStartup) {
    var scDay = $("#schedule-viewer-day").val();
    if (scDay == null || scDay == "") {
      bootbox.alert("You must set a date in order to reload schedule. Daaa!");
      $("#schedule-viewer-day").focus();
      return;
    }
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule',
      eventAction: 'admin-load-startup-schedule',
      eventLabel: 'day: ' + scDay + " Startup: " + curAttendeeStartup
    });
    var readRef = firebase.database().ref("sessions/" + scDay + "/startups/" + curAttendeeStartup);
    //new Firebase("https://lpa-1.firebaseio.com/sessions/" + scDay + "/startups/" + curAttendeeStartup);
    readRef.orderByKey().on("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        //$("#sc-viewer-reload-button").text("Reload " + curAttendeeStartup);
        //console.log("The sessions: " + JSON.stringify(sessions));
        var scHtml = "<h3>" + curAttendeeStartup + "</h3>";
        $("#mentor-schedule-list").html("");
        var commentsForTheDay = "Nothing for now. But remember: <h5>A lion runs the fastest when he is hungry.</h5><img src='img/lion-250.jpeg' alt='Ido famous lion' />";
        if (sessions.comments && sessions.comments.length > 2) {
          commentsForTheDay = (sessions.comments).replace(/\n/g, "<br>");
        }
        scHtml += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title"> Comments For The Day' +
          '</h3> </div> <div class="panel-body">' + commentsForTheDay + '</div> </div>';

        // we know it's the mentors and hours
        for (var i = 0; i < sessions.mentors.length; i++) {
          scHtml += '<div class="panel panel-default"> <div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            sessions.mentors[i][1] + ' | ' + getHourAsRange("hour-" + (i + 1)) + '</h3> </div> <div class="panel-body">' +
            'Location: ' + sessions.mentors[i][2] + ' </div> </div>';
        }
        $("#mentor-schedule-list").html(scHtml);
      } else {
        $("#mentor-schedule-list").html("");
        if (curAttendeeStartup == "") {
          bootbox.alert("Please check why we don't have schedule for this startup.");
        } else {
          bootbox.alert("Could not find anything for " + curAttendeeStartup + " at this date.");
        }
      }
    });
  }

  //
  // Using these selector for the schedule viewer
  //
  function buildMentorStartupSelectors() {
    var html = '<div class="row"> <div class="input-group radio-viewer"> <input class="" type="radio" id="r-mentor" name="r-sel" checked> Mentor ';
    html += getMentorsSelect("mentor-sel-viewer"); //  input-group-addon col-lg-2 col-md-2
    html += '</div> <div class="input-group radio-viewer"><input type="radio" class="" id="r-startup" name="r-sel"> Startup ';
    html += getStartupSelect("sec-viewer-startup-select", "");
    html += "</div> </div>";
    $("#mentor-startup-viewer").html(html);

    // add the startup selector to the notes tab as well
    var notesHtml = getStartupSelect("notes-viewer-startup-select", "");
    $("#startup-notes-viewer").html(notesHtml);
  }

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
  // get list of startups in a select 
  //
  function getStartupSelect(selId, classForSelect) {

    var html = '<select id="' + selId + '" class="' + classForSelect + '" data-style="btn-info">';
    var len = startupNameList.length;
    for (var i = 0; i < len; i++) {
      html += '<option>' + startupNameList[i] + '</option>';
    }
    html += '</select>';
    return html;
  }

  //
  // Save startups
  //
  $("#st-save-button").click(function() {
    var name = $("#st-name-field").val();
    // we can't have spaces - easy life (for now)
    name = name.replace(/\s/g, "-");
    var desc = $("#st-desc-field").val();

    // name validation
    if (name.length < 2) {
      $("#st-nameError").html("Please give a name - So you could remember this startup in the future!");
      $("#st-nameError").removeClass("sr-only");
      $("#st-nameError").addClass("alert");
      $("#st-name-field").focus();
      setTimeout(function() {
        $("#st-nameError").removeClass("alert");
        $("#st-nameError").addClass("sr-only");
      }, 1500);
      return;
    }
    //console.log("saving startup to Firebase: " + name + " | desc: " + desc);
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);
    ref.child("startups").child(name).set({
      name: name,
      description: desc,
      country: $("#st-country-field").val(),
      city: $("#st-city-field").val(),
      fund: $("#st-fund-select option:selected").text(),
      numEmployees: $("#st-num-employees-select option:selected").text(),
      dateFounded: $("#st-date-field").val(),
      logo: $("#st-logo-url").val(),
      team: $("#st-team-url").val(),
      video: $("#st-video-url").val(),
      historyUrl: $("#st-history-url").val(),
      twitter: $("#st-twitter-field").val(),
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Startup data could not be saved :( Details: " + error);
      } else {
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
  });

  //
  // read the list of startups and display it
  //
  function readStartups(authData) {
    var readRef = firebase.database().ref("startups");
    //new Firebase("https://lpa-1.firebaseio.com/startups/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The Startups: " + JSON.stringify(snapshot.val()));
      $("#startups-list").html("");
      startupNameList = [];
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        startupNameList.push(key);
        var startupData = childSnapshot.val();
        var startupLogoUrl = addhttp(startupData.logo);
        //console.log("key: " + key + " data: " + startupData);
        $("#startups-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          startupData.name + " <img src='" + startupLogoUrl + "' class='logo-img' alt='startup logo'> " +
          '<button type="button" class="edit-startup startup-edit btn btn-info" aria-label="Edit" data-key="' + key +
          '"><span class="glyphicon glyphicon-pencil"></span></button> <button type="button" class="remove-startup btn btn-danger" aria-label="Close" data-key="' +
          key + '"> <span class="glyphicon glyphicon-remove"></span></button>' +
          '</h3> </div> <div class="panel-body startup-edit" data-key="' + key + '"> <b>' + startupData.description + '</b><br>' +
          startupData.country + '<br>' + startupData.city + ' </div> </div>'
        );
      });
      var selHtml = getStartupSelect("att-startup-list-select", "selectpicker");
      $("#att-startup-sel-div").html("");
      $("#att-startup-sel-div").append(selHtml);
      $('#att-startup-list-select').selectpicker();

      // Start with building the basic ui to set a schedule
      //buildScheduleRow();
      gotDataForSchedule++;
      // 
      buildMentorStartupSelectors();
    });
  }

  //
  // Clear the startup values
  //
  $("#st-cancel-button").click(function() {
    $("#st-name-field").val("");
    $("#st-desc-field").val("");
    $("#st-country-field").val("");
    $("#st-city-field").val("");
    $("#st-st-fund-select").val("");
    $("#st-num-employees-select").val("1-10");
    $("#st-date-field").val("");
    $("#st-logo-url").val("");
    $("#st-team-url").val("");
    $("#st-video-url").val("");
    $("#st-history-url").val("");
    $("#st-twitter-field").val(""),
      $("#st-name-field").focus();
    $('body').scrollTop(60);
  });

  //
  // enable to edit startups from the list
  //
  $('body').on('click', '.startup-edit', function(event) {
    var stName = this.dataset.key;
    var ref = firebase.database().ref("startups/" + stName);
    //new Firebase("https://lpa-1.firebaseio.com/startups/" + stName);
    ref.on("value", function(startupSnap) {
      var st = startupSnap.val();
      if (st !== null) {
        //console.log("Setting data for startup: " + JSON.stringify(st));
        $("#st-name-field").val(st.name);
        $("#st-desc-field").val(st.description);
        $("#st-country-field").val(st.country);
        $("#st-city-field").val(st.city);
        $("#st-fund-select").selectpicker('val', st.fund);
        $("#st-num-employees-select").selectpicker('val', st.numEmployees);
        $("#st-date-field").val(st.dateFounded);
        $("#st-logo-url").val(st.logo);
        $("#st-team-url").val(st.team);
        $("#st-video-url").val(st.video);
        $("#st-history-url").val(st.historyUrl);
        $("#st-twitter-field").val(st.twitter);
        $("#st-name-field").focus();
        $('body').scrollTop(60);
        ga('send', {
          hitType: 'event',
          eventCategory: 'startup',
          eventAction: 'admin-edit-startup',
          eventLabel: 'startup: ' + stName
        });
      }
    });
  });

  //
  // Enable removing startups
  //
  $('body').on('click', '.remove-startup', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("Are you sure? For Real?", function(result) {
      if (result === true) {
        var fredRef = firebase.database().ref("startups/" + key);
        //new Firebase('https://lpa-1.firebaseio.com/startups/' + key);
        var onComplete = function(error) {
          if (error) {
            console.log('Synchronization failed could not remove mentor');
          } else {
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-startup',
              eventAction: 'delete',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid
            });
            console.log('Synchronization succeeded - mentor was removed');
            $("#startups-list").html('<div id="loading-startup"><h2><i class="fa fa-spinner fa-spin"></i> </h2></div>');
            readStartups(authUserData);
          }
        };
        fredRef.remove(onComplete);
      } else {
        console.log("let not remove " + key + " for now");
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  // Locations
  //////////////////////////////////////////////////////////////////////////////
  //
  // get list of locations for the meetings 
  //
  function getMeetingLocations(htmlObjId) {
    var html = '<select id="' + htmlObjId + '" class="mentor-selector">';
    var len = locationsList.length;
    locationsList.sort(compare);
    for (var i = 0; i < len; i++) {
      html += '<option value="' + locationsList[i].name + '">' + locationsList[i].name + '</option>';
    }
    html += '</select>';
    return html;
  }

  //
  // Save Location
  //
  $("#location-save-button").click(function() {
    var name = $("#location-name-field").val();
    // we can't have spaces - easy life (for now)
    name = name.replace(/\s/g, "-");
    var address = $("#location-address-field").val();

    // Name validation
    if (name.length < 2) {
      $("#location-nameError").html("Please give a name - So you could remember this location in the future!");
      $("#location-nameError").removeClass("sr-only");
      $("#location-nameError").addClass("alert");
      $("#location-name-field").focus();
      setTimeout(function() {
        $("#location-nameError").removeClass("alert");
        $("#location-nameError").addClass("sr-only");
      }, 1500);
      return;
    }
    //console.log("saving location to Firebase: " + name);
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);
    ref.child("locations").child(name).set({
      name: name,
      address: address,
      comments: $("#location-comments-field").val(),
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Location data could not be saved. Details: " + error);
      } else {
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 1500);
      }
    });
  });

  //
  // read the list of startups and display it
  //
  function readLocations(authData) {
    var readRef = firebase.database().ref("locations");
    //new Firebase("https://lpa-1.firebaseio.com/locations/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The Startups: " + JSON.stringify(snapshot.val()));
      $("#locations-list").html("");
      locationsList = [];
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var locationData = childSnapshot.val();
        locationsList.push(locationData);
        $("#locations-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          locationData.name + '&nbsp;&nbsp; <button type="button" class="edit-location location-edit btn btn-info" aria-label="Edit" data-key="' + key +
          '"><span class="glyphicon glyphicon-pencil"></span></button> <button type="button" class="remove-location btn btn-danger" aria-label="Close" data-key="' +
          key + '"> <span class="glyphicon glyphicon-remove"></span></button>' +
          '</h3> </div> <div class="panel-body location-edit" data-key="' + key + '"> <b>' + locationData.address + '</b><br>' +
          locationData.comments + ' </div> </div>'
        );
      });
    });
    gotDataForSchedule++;
  }

  //
  // clear the locations values
  //
  $("#location-cancel-button").click(function() {
    $("#location-name-field").val("");
    $("#location-address-field").val("");
    $("#location-comments-field").val("");
    $("#location-name-field").focus();
    $('body').scrollTop(60);
  });

  //
  // enable to edit locations from the list
  //
  $('body').on('click', '.location-edit', function(event) {
    var locationName = this.dataset.key;
    var ref = firebase.database().ref("locations/" + locationName);
    //new Firebase("https://lpa-1.firebaseio.com/locations/" + locationName);
    ref.on("value", function(locSnap) {
      var location = locSnap.val();
      if (location !== null) {
        //console.log("Setting data for location: " + JSON.stringify(location));
        $("#location-name-field").val(location.name);
        $("#location-address-field").val(location.address);
        $("#location-comments-field").val(location.comments);
        $("#location-name-field").focus();
        $('body').scrollTop(60);
      }
    });
  });

  //
  // Enable removing locations
  //
  $('body').on('click', '.remove-location', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("This location is great. Are you sure? For Real?", function(result) {
      if (result === true) {
        var locRef = firebase.database().ref("locations/" + key);
        //new Firebase('https://lpa-1.firebaseio.com/locations/' + key);
        var onComplete = function(error) {
          if (error) {
            console.log('Location Synchronization Failed');
          } else {
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-location',
              eventAction: 'delete',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid
            });
            console.log('Synchronization Succeeded - location was removed');
            $("#locations-list").html('<div id="loading-locations"><h2> <span class="glyphicon glyphicon-refresh"></span> <i class="fa fa-spinner fa-spin"></i> </h2></div>');
            readLocations(authUserData);
          }
        };
        locRef.remove(onComplete);
      } else {
        console.log("location: " + key + " was not remove for now");
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  // Mentors
  //////////////////////////////////////////////////////////////////////////////
  //
  // Save mentors
  //
  $("#form-save-mentor").click(function() {
    // validation - TODO: take it out to a function
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

    // mentor email validation
    var emailRegEx = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
    if (!emailRegEx.test(emailKey)) {
      $("#emailError").html("Please give a valid gmail or google for work address.<br>You can check it by opening this link:<a href='https://www.google.com/a/MyDomain.com/ServiceLogin' target='_blank'> google.com/a/MyDomain.com/ServiceLogin</a> and replace MyDomain with you domain.");
      $("#emailError").removeClass("sr-only");
      $("#emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#emailError").removeClass("alert");
        $("#emailError").addClass("sr-only");
      }, 6500);
      return;
    }
    //console.log("saving to Firebase: " + name + " , " + email);
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 21);

    // Save mentor
    var mentorKey = emailKey.replace(/\./g, '-');
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
      notesForDay: $("#form-note-for-mentor").val(),
      unixTime: curUnixTime,
      date: disTime
    }, function(error) {
      if (error) {
        bootbox.alert("Data could not be saved :( Details: " + error);
      } else {
        $(".save-alert").show();
        setTimeout(function() {
          $(".save-alert").hide();
        }, 2500);
      }
    });
  });

  //
  // Read the list of mentors and display it
  //
  function readMentors(authData) {
    var readRef = firebase.database().ref("mentors");
    //new Firebase("https://lpa-1.firebaseio.com/mentors/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The mentors: " + JSON.stringify(snapshot.val()));
      $("#mentors-list").html("");
      mentorsList = [];
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var mentorData = childSnapshot.val();
        mentorsList.push(mentorData);

        var mPicUrl = addhttp(mentorData.pic);
        //console.log("key: " + key + " data: " + mentorData);    <div class="collapse" id="collapse-bio-links">
        var divDetailKey = key.replace("@", "");
        $("#mentors-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          mentorData.name + '<img src="' + mPicUrl + '" class="att-pic-card" alt="mentor picture" /> ' +
          ' &nbsp; &nbsp;<button class="btn" type="button" data-toggle="collapse" data-target="#mentor-panel-' + divDetailKey +
          '" aria-expanded="false" aria-controls="collapseMentorDetails"><span class="glyphicon glyphicon-resize-full" aria-hidden="true"></span></button> \
          <button type="button" class="edit-mentor mentor-edit btn btn-info" aria-label="Edit" data-key="' + key +
          '"><span class="glyphicon glyphicon-pencil"></span></button> <button type="button" class="remove-mentor btn btn-danger" aria-label="Close" data-key="' +
          key + '"> <span class="glyphicon glyphicon-remove"></span></button>' +
          '</h3> </div> <div id="mentor-panel-' + divDetailKey + '" class="panel-body mentor-edit collapse" data-key="' + key +
          '"> <h5><a href="mailto:' + mentorData.email + '" target="_blank">' + mentorData.email + '</a></h5>' +
          '<b>Phone:</b> ' + mentorData.phone +
          '<br><b>Domain:</b> ' + mentorData.domain + ' - <b>Secondary:</b> ' + mentorData.domainSec +
          '<br><b>Expertise:</b> ' + mentorData.expertise + ' </div> </div>'
        );
      });
      gotDataForSchedule++;
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
    $("#form-twitter-field").val("");
    $("#form-bio").val("");
    $("#form-fun-fact").val("");
    $("#form-expertise").val("");
    $("#form-linkedin-url").val("");
    $("#form-personal-url").val("");
    $("#form-pic-url").val("");
    $("#form-comments").val("");
    $("#form-note-for-mentor").val("");
    $("#form-name-field").focus();
    $('body').scrollTop(60);
  });

  //
  // enable to edit mentors from the list
  //
  $('body').on('click', '.mentor-edit', function(event) {
    var key = this.dataset.key;
    var ref = firebase.database().ref("mentors/" + key);
    //new Firebase("https://lpa-1.firebaseio.com/mentors/" + key);
    ref.on("value", function(mentorSnap) {
      var mentor = mentorSnap.val();
      if (mentor !== null) {
        //console.log("Setting data for: " + JSON.stringify(mentor));
        $("#form-name-field").val(mentor.name);
        $("#form-email-field").val(mentor.email);
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
        $("#form-note-for-mentor").val(mentor.notesForDay);
        $("#form-name-field").focus();
        $('body').scrollTop(60);
      }
    });
  });

  //
  // enable removing mentors
  //
  $('body').on('click', '.remove-mentor', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("Are you sure? For Real?", function(result) {
      if (result === true) {
        var fredRef = firebase.database().ref("mentors/" + key);
        //new Firebase('https://lpa-1.firebaseio.com/mentors/' + key);
        var onComplete = function(error) {
          if (error) {
            console.log('Synchronization failed for mentor remove');
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-mentor-error',
              eventAction: 'delete-error',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid + " err: " + error
            });
          } else {
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-mentor',
              eventAction: 'delete',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid
            });
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

    // attendee email validation
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
      $("#att-emailError").html("Please give a valid email (e.g. momo@gmail.com");
      $("#att-emailError").removeClass("sr-only");
      $("#att-emailError").addClass("alert");
      $("#form-email-field").focus();
      setTimeout(function() {
        $("#att-emailError").removeClass("alert");
        $("#att-emailError").addClass("sr-only");
      }, 1500);
      return;
    }

    //console.log("saving attendee: " + name + " , " + email);
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
    //new Firebase("https://lpa-1.firebaseio.com/attendees/");
    readRef.orderByKey().on("value", function(snapshot) {
      //console.log("The attendees: " + JSON.stringify(snapshot.val()));
      $("#att-list").html("");
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var attData = childSnapshot.val();
        var picUrl = addhttp(attData.pic);
        var role = attData.role;
        if (role === undefined || role === null) {
          role = "";
        }
        $("#att-list").append(
          '<div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">' +
          attData.name + '<img src="' + picUrl + '" class="att-pic-card" alt="attendee picture"/>' +
          '<button type="button" class="edit-att att-edit btn btn-info" aria-label="Edit" data-key="' + key +
          '"><span class="glyphicon glyphicon-pencil"></span></button> <button type="button" class="remove-att btn btn-danger" aria-label="Close" data-key="' + key + '"> <span class="glyphicon glyphicon-remove"></span></button>' +
          '</h3> </div> <div class="panel-body att-edit" data-key="' + key + '"> ' + attData.startup + '<br>' +
          '<b>Role:</b> ' + role + '<br>' +
          "<a href='mailto:" + attData.email + "' target='_blank'>" + attData.email + "</a><br><b>Linkedin: </b><a href='http://www.linkedin.com/in/" +
          attData.linkedin + "' target='_blank'>" + attData.linkedin + '</a> </div> </div>'
        );
      });
    });
  }

  //
  // clear the values of the att
  //
  $("#att-cancel-button").click(function() {
    $("#att-name-field").val("");
    $("#att-email-field").val("");
    $("#att-startup-list-select").val("");
    $("#att-role").val("");
    $("#att-linkedin-url").val("");
    $("#att-fun-fact").val("");
    $("#att-pic-url").val("");
    $("#att-name-field").focus();
    $('body').scrollTop(60);
  });

  //
  // enable to edit from the list
  //
  $('body').on('click', '.att-edit', function(event) {
    var key = this.dataset.key;
    var ref = firebase.database().ref("attendees/" + key);
    //new Firebase("https://lpa-1.firebaseio.com/attendees/" + key);
    ref.on("value", function(attSnap) {
      var att = attSnap.val();
      if (att !== null) {
        //console.log("Setting data for: " + JSON.stringify(att));
        $("#att-name-field").val(att.name);
        $("#att-email-field").val(att.email);
        $("#att-startup-list-select").selectpicker('val', att.startup);
        $("#att-role").val(att.role);
        $("#att-linkedin-url").val(att.linkedin);
        $("#att-fun-fact").val(att.funFact);
        $("#att-pic-url").val(att.pic);

        $("#att-name-field").focus();
        $('body').scrollTop(60);
      }
    });
  });

  //
  // enable removing attendees
  //
  $('body').on('click', '.remove-att', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("Are you sure? Delete " + key + " For Real?", function(result) {
      if (result === true) {
        var fredRef = firebase.database().ref("attendees/" + key);
        var onComplete = function(error) {
          if (error) {
            console.log('Synchronization failed to remove attendee');
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-attendee-error',
              eventAction: 'delete-error',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid + " err: " + error
            });
          } else {
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-attendee',
              eventAction: 'delete',
              eventLabel: 'removing: ' + key + " by: " + authUserData.uid
            });
            console.log('Synchronization succeeded - attendee was removed');
            $("#att-list").html('<div id="loading-attendees"><h2><i class="fa fa-spinner fa-spin"></i> </h2></div>');
            readAttendees(authUserData);
            $("#att-cancel-button").click();
          }
        };
        fredRef.remove(onComplete);
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////////
  // Utils
  //////////////////////////////////////////////////////////////////////////////////

  //
  // Catch errors and send them to GA
  //
  window.onerror = function(msg, url, lineNumber) {
    console.log("Err:" + JSON.stringify(msg) + " url: " + JSON.stringify(url) + " line: " + lineNumber);
    ga('send', {
      hitType: 'event',
      eventCategory: 'admin-gen-error',
      eventAction: 'msg: ' + msg,
      eventLabel: 'url: ' + url + " line: " + lineNumber
    });
    return true;
  };

  //
  // Helper function to get unique in array
  // usage example:
  // var a = ['a', 1, 'a', 2, '1'];
  // var unique = a.filter( onlyUnique );
  //
  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

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
