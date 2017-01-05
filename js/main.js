//
// JS for the mentor Admin web app
// Author: Ido Green ❄️
// Date: 4/2016
// V0.9
//
// A 🐱 App
//
(function() {
  $(".save-alert").hide();
  $("#spin").hide();
  $("#gen-op-tab-li").hide();
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
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBP_N88VISYIBgN6L5N0l_xCwyTCf7410U",
    authDomain: "lpa-br-1.firebaseapp.com",
    databaseURL: "https://lpa-br-1.firebaseio.com",
    storageBucket: "lpa-br-1.appspot.com",
    messagingSenderId: "221194143639"
  };
  firebase.initializeApp(config);
  var ref = firebase.database().ref();
  authUserData = null;

  //
  //
  //
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      authUserData = user;
      $("#sc-save-button").show();
      //localStorage.setItem("lpa1-authData", JSON.stringify(authData));
      console.log("User " + user.uid + " is logged in with " + user.provider);
      if ( (user.email).indexOf("idog@") > -1 ) {
        $("#gen-op-tab-li").show();
      }

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
  //
  //
  function logoutTheUser() {
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
  }

  //
  // logout
  //
  $('#logout-div').on('click', '#logout-but', function(event) {
    logoutTheUser();
  });

  //////////////////////////////////////////////////////////////////////////////
  // Schedule magic
  //////////////////////////////////////////////////////////////////////////////
  //
  // Save the current schedule
  //
  function saveSchedule(scDay) {
    isInSaveOperation = true;
    console.log("=== Going INTO save");
    $("#online-status").html("Saving...");
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
        var startTime = $("#meeting-start-time-" + startupKey + "-" + j).val();
        var endTime = $("#meeting-end-time-" + startupKey + "-" + j).val();
        var tmpM = [tmpMentorEmail, tmpMentorName, location, startTime, endTime];
        mentorPerHour.push(tmpM);

        ref.child("sessions").child(scDay).child("mentors").child(tmpMentorEmail).child("hour-" + j).set({
          name: tmpMentorName,
          startup: startupKey,
          location: location,
          starttime: startTime,
          endtime: endTime
        }, function(error) {
          if (error) {
            bootbox.alert("Schedule could not be saved :( Details: " + error);
          }
        });
      }
      
      var startupComments = $("#sc-comments-" + startupKey).val();
      //console.log("Saving startup: " + startupName + " Comments:" + startupComments + " Mentors: " + mentorPerHour);
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
          $("#online-status").html("All Good 👌");
          setTimeout(function() {
            $(".save-alert").hide();
          }, 1500);
        }
      });
      // save a local backup version of the schedule
      var backupKey = scDay + "-" + (new Date()).getHours() + ":" + (new Date()).getMinutes();
      ref.child("sessions").child("backups").child(backupKey).child("startups").child(startupName).set({
        mentors: mentorPerHour,
        comments: startupComments
      }, function(error) {
        if (error) {
          console.error("Schedule backups could not be saved :( Details: " + error);
        }
      });
      readLocalScheduleBackups();
    });
    isInSaveOperation = false;
    console.log("=== Going OUT of save");
  }

  //
  //
  //
  function readLocalScheduleBackups() {
    var readRef = firebase.database().ref("sessions/backups");
    readRef.orderByKey().once("value", function(snapshot) {
      var backups = snapshot.val();
      if (backups !== null) {
        var html = '<label for="schedule-backup-sel">Backups</label> <div class="input-group"> <select id="schedule-backup-sel">';
        $.each(backups, function(key, sData) {
          html += '<option>' + key + '</option>';
        }); 
        html += "</select> &nbsp;&nbsp; <button id='reload-schedule-backup-but' class='btn btn-info'>Reload</button> </div>";
        $("#schedule-ops").html(html);
      }
    });
  }

  //
  // Trigger for the reload button
  //
  $('#schedule-local-ops').on('click', '#reload-schedule-backup-but', function(event) {
    var backupKey = $("#schedule-backup-sel :selected").text();
    reloadLocalScheduleToGrid(backupKey);
  });

  //
  // reloading the schedule into the UI (=grid of startups/mentors)
  //
  function reloadLocalScheduleToGrid(backupKey) {
    bootbox.confirm("<h5>You are going to reload an older schedule for " + backupKey +
        "</h5><h3>Are you sure?</h3>", function(result) {
      if (result === true) {
        var readRef = firebase.database().ref("sessions/backups/" + backupKey + "/startups");
        reloadSchedule(readRef);
      }
    });

    $('body').scrollTop(60);
  }

  // 
  // Remove all the backups from localstorage
  //
  $("#remove-allbackups").click(function() {
    removeAllbackups();
  });
  
  //
  //
  //
  function removeAllbackups() {
    ref.child("sessions/backups/").set({}, function(error) {
      if (error) {
        bootbox.alert("Could not clean all the backups :/ Details: " + error);
        ga('send', {
          hitType: 'event',
          eventCategory: 'schedule-admin-error',
          eventAction: 'clean-startups-schedule',
          eventLabel: 'for all backups action'
        });
      }
    });
    $("#schedule-ops").html("");
    bootbox.alert("Done removing all the backups! 😎");
  }
  //
  // Allow to copy comments from the first startup to all the rest 😎
  //
  $("#copy-comments-on-day").click(function() {
    var textAreaArry = $(".sc-comments");
    var firstComments = $("#" + textAreaArry[0].id).val();
    for (var i = 1; i < textAreaArry.length; i++) {
      $("#" + textAreaArry[i].id).val(firstComments);
    }
    bootbox.alert("Done❗️ All the startups are now set with the same comments.");
  });

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
  // reload the schedule from firebase
  //
  function reloadSchedule(readRef) {
    
    readRef.orderByKey().once("value", function(snapshot) {
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
            var startTime = curMentor[3];
            var endTime = curMentor[4];
            //console.log("startup: " + startupName + " key:" + key + " name:" + name);
            $("#mentor-" + startupName + "-" + j + "-select").val(key);
            $("#meeting-location-" + startupName + "-" + j + "-select").val(loc);
            $("#meeting-start-time-" + startupName + "-" + j).val(startTime);
            $("#meeting-end-time-" + startupName + "-" + j).val(endTime);
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
    reloadSchedule(readRef);
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
    $("#online-status").html("Fetching...");
    if (gotDataForSchedule < 3) {
      secTimer = setTimeout(checkWeHaveDataForSchedule, 1000); /* this checks the flag every 1 second */
    } else {
      buildScheduleRow();
      // shut the timer
      clearTimeout(secTimer);
      $("#online-status").html("All Good 👌");
    }
    if (checkWeHaveDataForScheduleCounter > MAX_CALLS_FOR_CHECK_DATA) {
      if (firebase.auth().currentUser === null) {
        bootbox.alert("Please sign-in so we could fetch all the information.");
      } else {
        bootbox.alert("Something is not right. We have problems with fetching the data.");
        $("#online-status").html("Not Good 🤔  Try To Reload");
      }
      // shut the timer
      clearTimeout(secTimer);
    }
  }

  //
  // Callbacks to gain all the data before we building the schedule grid
  //
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
        html += '<br>' + getMeetingTime("meeting-start-time-" + startupKey + "-" + j, j + 9);
        html += '<br>' + getMeetingTime("meeting-end-time-" + startupKey + "-" + j, j + 10);
        html += '</div>';
      }
      html += '<div class="col-md-2 col-lg-2 text-center ">';
      html += '<textarea class="form-control sc-comments" id="sc-comments-' + startupKey +
        '" name="sc-comments-' + i + '" placeholder="General Comments For The Day"></textarea>';
      html += '</div>';
      html += '</div> <br><!-- row -->';
    }

    $("#schedule-tab-table").html(html);
  }

  function getMeetingTime(htmlObjId, defTime) {
    var timeVal = defTime + ":00";
    var html = '<input id="' + htmlObjId + '" type="time" class="meeting-time-picker" value="' + timeVal + '">';
    return html;
  }

  //
  // Util function to get a list of mentors in a select 
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
  // Helper function to sorting
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
  // TODO: per mentor?
  //////////////////////////////////////////////////////////////////////////////
  
  //
  // reload mentor's notes 
  //
  $("#notes-per-mentor-reload-button").click(function() {
    // Fetch the startup notes
    var curMentor = $("#notes-per-mentor-startup-select").val();
    loadMentorNotes(curMentor);
  });

  //
  //
  //
  function loadMentorNotes(curMentor) {
     ga('send', {
      hitType: 'event',
      eventCategory: 'schedule',
      eventAction: 'admin-load-mentor-notes',
      eventLabel: " Mentor: " + curMentor
    });
    //var dataSet = [];
    var tblHtml = "";
    $("#startup-notes-table").DataTable().destroy();
    // Call the node with all the strtup's notes
    var readRef = firebase.database().ref("notes-backup/startups/");
    readRef.orderByKey().once("value", function(snapshot) {  //.startAt(curMentor).endAt(curMentor)
      snapshot.forEach(function(startupData) {
        var notes = startupData.val();
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
                  if (mentor === curMentor) {
                    var attendee = Object.keys(notes[x][noteType][mentor]);
                    if (attendee[0].indexOf("hour") > -1) {
                      // the old/broken format of notes without the mentor
                      var hour = attendee[0];
                      var effective = (notes[x][noteType][mentor][hour]).effective;
                      var receptive = (notes[x][noteType][mentor][hour]).receptive;
                      var actionItems = (notes[x][noteType][mentor][hour]).actionItems;
                      var mNotes = (notes[x][noteType][mentor][hour]).meetingNotes;
                      //dataSet.push([x, mentor, "n/a", hour, effective, receptive, actionItems, mNotes]);
                      tblHtml += "<tr><td>" + x + "</td><td>" + mentor + "</td><td>N/A" + "</td><td>" +
                        hour + "</td><td>" + effective + "</td><td>" + receptive + "</td><td>" +
                        actionItems + "</td><td>" + mNotes + "</td></tr>";  
                    }
                  }
                }
              }
            } catch (err) {
              console.log("Error in building the notes table: " + err);
              //dataSet.push([x, "", "", "", "", "", "", ""]);
            }
          } // for loop
          //console.log("======= " + dataSet);
        } else {
          bootbox.alert("Could not find notes for " + curMentor);
        }  
      }).then( buildNotesTbl(tblHtml), errorBuildingNotesTable());
    });
  }

  //
  // building the table of notes per mentor
  //
  function buildNotesTbl(tblHtml) {
    $("#startup-notes-table-body").html(tblHtml);
    $("#startup-notes-table").DataTable({
      paging: true,
      columns: [
        { title: "Date" },
        { title: "Mentor" },
        { title: "Attendee" },
        { title: "Hour" },
        { title: "Effective" },
        { title: "Receptive" },
        { title: "Action Items", "width": "280px" },
        { title: "Notes", "width": "350px" }
      ],
      dom: 'Bfrtip',
      buttons: ['csv', 'copy']
    });
  }

  //
  // TODO: better job with errors here.
  //
  function errorBuildingNotesTable() {
    console.log("Error in building the notes table.");
  }
  
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
    //var dataSet = [];
    var tblHtml = "";
    $("#startup-notes-table").DataTable().destroy();
    // Call the node with all the strtup's notes
    var readRef = firebase.database().ref("notes-backup/startups/" + curStartup);
    readRef.orderByKey().once("value", function(snapshot) {
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
                  //dataSet.push([x, mentor, "n/a", hour, effective, receptive, actionItems, mNotes]);
                  tblHtml += "<tr><td>" + x + "</td><td>" + mentor + "</td><td>N/A" + "</td><td>" +
                    hour + "</td><td>" + effective + "</td><td>" + receptive + "</td><td>" +
                    actionItems + "</td><td>" + mNotes + "</td></tr>";
                } else {
                  var tmpAtt = attendee[0];
                  var hour = Object.keys(notes[x][noteType][mentor][tmpAtt]);
                  var tmpHour = hour[0];
                  var effective = (notes[x][noteType][mentor][tmpAtt][tmpHour]).effective;
                  var receptive = (notes[x][noteType][mentor][tmpAtt][tmpHour]).receptive;
                  var actionItems = (notes[x][noteType][mentor][tmpAtt][tmpHour]).actionItems;
                  var mNotes = (notes[x][noteType][mentor][tmpAtt][tmpHour]).meetingNotes;
                  //dataSet.push([x, mentor, tmpAtt, tmpHour, effective, receptive, actionItems, mNotes]);
                  tblHtml += "<tr><td>" + x + "</td><td>" + mentor + "</td><td>" + tmpAtt + "</td><td>" +
                    tmpHour + "</td><td>" + effective + "</td><td>" + receptive + "</td><td>" +
                    actionItems + "</td><td>" + mNotes + "</td></tr>";
                }
              }
            }
          } catch (err) {
            console.log("Error in building the notes table: " + err);
            //dataSet.push([x, "", "", "", "", "", "", ""]);
          }
        } // for loop
        //console.log("======= " + dataSet);

        $("#startup-notes-table-body").html(tblHtml);
        $("#startup-notes-table").DataTable({
          paging: true,
          columns: [
            { title: "Date" },
            { title: "Mentor" },
            { title: "Attendee" },
            { title: "Hour" },
            { title: "Effective" },
            { title: "Receptive" },
            { title: "Action Items", "width": "280px" },
            { title: "Notes", "width": "350px" }
          ],
          dom: 'Bfrtip',
          buttons: ['csv', 'copy']
        });

      } else {
        bootbox.alert("Could not find notes for " + curStartup);
      }
    });
  }

  // 
  // Export All the notes trigger
  //
  $("#notes-viewer-export-all-button").click(function() {
    // Fetch All the notes and export them to CSV
    exportAllNotes();
  });

  function exportAllNotes() {
    ga('send', {
      hitType: 'event',
      eventCategory: 'schedule',
      eventAction: 'admin-export-all-notes',
      eventLabel: "Admin user.uid: " + authUserData.uid + " email: " + authUserData.email
    });

    var csvStr = "";
    // Call the node with all the strtup's notes
    var readRef = firebase.database().ref("notes-backup/startups/");
    readRef.orderByKey().once("value", function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        console.log("====");
        var startupName = childSnapshot.getKey();
        var notes = childSnapshot.val();
        if (notes != null) {
          console.log("Working on startup: " + startupName); // + "notes: " + JSON.stringify(notes));
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
                    if (actionItems) actionItems = actionItems.replace(/\n/g, " | ");
                    if (mNotes) mNotes = mNotes.replace(/\n/g, " | ");
                    csvStr += startupName + ", \"" + x + "\" , \"" + mentor + "\" , N/A , " +
                      hour + " , " + effective + " , " + receptive + " , \"" +
                      actionItems + "\" , \"" + mNotes + "\" \n";

                  } else {
                    var tmpAtt = attendee[0];
                    var hour = Object.keys(notes[x][noteType][mentor][tmpAtt]);
                    var tmpHour = hour[0];
                    var effective = (notes[x][noteType][mentor][tmpAtt][tmpHour]).effective;
                    var receptive = (notes[x][noteType][mentor][tmpAtt][tmpHour]).receptive;
                    var actionItems = (notes[x][noteType][mentor][tmpAtt][tmpHour]).actionItems;
                    var mNotes = (notes[x][noteType][mentor][tmpAtt][tmpHour]).meetingNotes;
                    if (actionItems) actionItems = actionItems.replace(/\n/g, " | ");
                    if (mNotes) mNotes = mNotes.replace(/\n/g, " | ");
                    csvStr += startupName + ", \"" + x + "\" , \"" + mentor + "\" , \"" + tmpAtt + "\" , " +
                      tmpHour + " , " + effective + " , " + receptive + " , \"" +
                      actionItems + "\" , \"" + mNotes + "\" \n";
                  }
                }
              }
            } catch (err) {
              console.log("Error in building the notes table: " + err);
            }
          } // for loop on notes per startup
          window.location.href = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(csvStr);
        } else {
          bootbox.alert("Could not find notes to export for startup: " + startupName);
        }
      });
    });
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
    readRef.orderByKey().once("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        //console.log("The sessions: " + JSON.stringify(sessions));
        var html = ""; //"<h3>" + curMentorEmail + "</h3>";
        $("#mentor-schedule-list").html("");
        $.each(sessions, function(key, scData) {
          //  getHourAsRange(key)
          html += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            scData.startup + ' | ' + scData.starttime + " - " + scData.endtime + ' </h3> </div> <div class="panel-body">' +
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
      bootbox.alert("You must set a date in order to reload schedule 😳");
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
    readRef.orderByKey().once("value", function(snapshot) {
      var sessions = snapshot.val();
      if (sessions != null) {
        var scHtml = "<h3>" + curAttendeeStartup + "</h3>";
        $("#mentor-schedule-list").html("");
        var commentsForTheDay = "Nothing for now. But remember: <h5>A lion runs the fastest when he is hungry.</h5><img src='img/lion-250.jpeg' alt='Ido famous lion' />";
        if (sessions.comments && sessions.comments.length > 2) {
          commentsForTheDay = (sessions.comments).replace(/\n/g, "<br>");
        }
        scHtml += '<div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title"> Comments For The Day' +
          '</h3> </div> <div class="panel-body admin-comments-for-day">' + commentsForTheDay + '</div> </div>';

        // we know it's the mentors and hours
        //getHourAsRange("hour-" + (i + 1)) 
        for (var i = 0; i < sessions.mentors.length; i++) {
          if (sessions.mentors[i][0] != "na@na-com") {
            scHtml += '<div class="panel panel-default"> <div class="panel panel-default"> <div class="panel-heading"> <h3 class="panel-title">' +
            sessions.mentors[i][1] + ' | ' + sessions.mentors[i][3] + " - " + sessions.mentors[i][4] +
            '</h3> </div> <div class="panel-body">' +
            'Location: ' + sessions.mentors[i][2] + ' </div> </div>';  
          }
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

    var notesPerMentorHtml = getMentorsSelect("notes-per-mentor-startup-select", "");
    $("#mentor-notes-viewer").html(notesPerMentorHtml);
  }

  //
  //
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
  // =Startups
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
    name = name.replace(/\./g, "-");
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

      gotDataForSchedule++;
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

  //
  //
  //
  $("#gen-ops-remove-all-startups-button").click(function() {
    removeAllStartups();
  });

  //
  // moving the mentors so we can work with new ones.
  // TODO: think on making another field of 'on duty' for each mentor.
  //
  function removeAllStartups() {
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 10);
    var oldRef = firebase.database().ref("startups");
    var newRef = firebase.database().ref(disTime + "-startups");
    moveFBnode(oldRef, newRef);
    bootbox.alert("All the startups were moved to " + disTime + "-startups");
  }


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
    ref.on("value", function(locSnap) {
      var location = locSnap.val();
      if (location !== null) {
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
  // =Mentors
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
    readRef.orderByChild("name").on("value", function(snapshot) {
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
    ref.on("value", function(mentorSnap) {
      var mentor = mentorSnap.val();
      if (mentor !== null) {
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
  // Enable removing mentors
  //
  $('body').on('click', '.remove-mentor', function(event) {
    var key = this.dataset.key;
    bootbox.confirm("Are you sure? For Real?", function(result) {
      if (result === true) {
        var fredRef = firebase.database().ref("mentors/" + key);
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

  //
  //
  //
  $("#remove-all-mentors-button").click(function() {
    removeAllMentors();
  });

  //
  // moving the mentors so we can work with new ones.
  // TODO: think on making another field of 'on duty' for each mentor.
  //
  function removeAllMentors() {
    var curUnixTime = new Date().getTime();
    var disTime = new Date().toJSON().slice(0, 10);
    var oldRef = firebase.database().ref("mentors");
    var newRef = firebase.database().ref(disTime + "-mentors");
    moveFBnode(oldRef, newRef);
    bootbox.alert("All the mentors were moved to " + disTime + "-mentors");
  }

  $("#move-back-mentor-button").click(function() {
    var mentorEmail = $("#mentor-comeback-email-field").val();
    moveMentorBack(mentorEmail);
  });

  //
  // TODO: change this! quickly please.
  //
  function moveMentorBack(mentorEmail) {
    var oldRef = firebase.database().ref("2016-09-27-mentors/" + mentorEmail);
    var newRef = firebase.database().ref("mentors/" + mentorEmail);
    moveFBnode(oldRef, newRef); 
    bootbox.alert(mentorEmail + " just did a comeback!");
  }

  // 
  // Export all mentors to CSV trigger
  //
  $("#export-all-mentors-button").click(function() {
    exportAllMentors();
  });

  function exportAllMentors() {
     var readRef = firebase.database().ref("mentors");
    readRef.orderByChild("name").once("value", function(snapshot) {  
      ga('send', {
        hitType: 'event',
        eventCategory: 'gen-opts',
        eventAction: 'admin-export-all-mentors',
        eventLabel: "Admin user.uid: " + authUserData.uid + " email: " + authUserData.email
      }); 
      var total = 0;   
      var csvStr = "name, email, phone, country, city, domain, second domain,twitter,bio,fun Fact,expertise,linedin,site,pic,comments \n";
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var mentor = childSnapshot.val();
        var mPicUrl = addhttp(mentor.pic);
        //console.log("key: " + key + " data: " + mentorData);
        var divDetailKey = key.replace("@", "");
        csvStr += mentor.name + "," + mentor.email + "," + mentor.phone + "," + mentor.country + "," + 
        mentor.city + "," + mentor.domain + "," + mentor.domainSec + "," + mentor.twitter + "," + 
        cleanForCSV(mentor.bio) + "," + cleanForCSV(mentor.funFact) + "," + cleanForCSV(mentor.expertise) + ", " + 
        mentor.linkedin + "," + mentor.site + "," + mentor.pic + "," + 
        cleanForCSV(mentor.comments) + "," + cleanForCSV(mentor.notesForDay) + "\n";
        total++;
      });
      window.location.href = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(csvStr);
      bootbox.alert("All " + total +" mentors were exported. Enjoy!");
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // =Attendees
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
    readRef.orderByKey().on("value", function(snapshot) {
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
          '"><span class="glyphicon glyphicon-pencil"></span></button> <button type="button" class="remove-att btn btn-danger" aria-label="Close" data-key="' +
          key + '"> <span class="glyphicon glyphicon-remove"></span></button>' +
          '</h3> </div> <div class="panel-body att-edit" data-key="' + key + '"> ' + attData.startup + '<br>' +
          '<b>Role:</b> ' + role + '<br>' +
          "<a href='mailto:" + attData.email + "' target='_blank'>" + attData.email +
          "</a><br><b>Linkedin: </b><a href='http://www.linkedin.com/in/" +
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
    ref.on("value", function(attSnap) {
      var att = attSnap.val();
      if (att !== null) {
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

  $("#gen-ops-remove-all-att-button").click(function() {
    removeAllAttendess(); 
  });

  function removeAllAttendess() {
    var attRef = firebase.database().ref("attendees/");
    var onCompleteRemoveAllAtt = function(error) {
          if (error) {
            console.log('Synchronization failed to remove ALL attendees');
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-all-attendees-error',
              eventAction: 'delete-error',
              eventLabel: "removing ALL Attendees by: " + authUserData.uid + " err: " + error
            });
          } else {
            ga('send', {
              hitType: 'event',
              eventCategory: 'admin-remove-all-attendees',
              eventAction: 'delete',
              eventLabel: "removing ALL attendees by: " + authUserData.uid
            });
            console.log('Synchronization succeeded - ALL attendees were removed');
            $("#att-list").html('<div id="loading-attendees"><h2><i class="fa fa-spinner fa-spin"></i> </h2></div>');
            readAttendees(authUserData);
          }
        };
    attRef.remove(onCompleteRemoveAllAtt);
  }

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
  // util to help us get better CSV output (e.g. that doesn't break on " as value)
  //
  function cleanForCSV(str) {
    if (str !== null && str !== undefined && str.length > 2) {
      str = str.replace(/\"/g, "'");
      str = '"' + str + '"';  
    }
    return str;
  }

  //
  // a = new Date()
  //
  function timeConverter(a) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var min = a.getMinutes();
    var hour = a.getHours();
    var sec = a.getSeconds();
    var time = date + '-' + month + '-' + year + '-' + hour + ':' + min + ':' + sec;
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
  // move a firebase node to a new location
  //
  function moveFBnode(oldRef, newRef) {
    oldRef.once('value', function(snap) {
      newRef.set(snap.val(), function(error) {
        if (!error) {
          oldRef.remove();
        } else if (typeof(console) !== 'undefined' && console.error) {
          console.error(error);
        }
      });
    });
  }

  //
  // Copy a node
  //
  function copyFbRecord(oldRef, newRef) {    
    oldRef.once('value', function(snap)  {
      newRef.set( snap.val(), function(error) {
        if( error && typeof(console) !== 'undefined' && console.error ) {  console.error(error); }
      });
    });
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
