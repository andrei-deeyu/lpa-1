![](https://developers.google.com/startups/images/logo-launch.svg)
## Overview

The goal of these apps is to enable us to run a LPA event(s).
We got three web apps:

* [Admin Web App](https://lpa-1.firebaseapp.com/) - Used by the organizers to set the schedule for the mentors and startups.
  * The mentors and attendees emails/names should be added to the system so they will be 'white listed'.
  * The startups' details should be filled.
  * The schedule per day of the LPA.

* [Mentor Web App](https://lpa-1.firebaseapp.com/index-mentor.html) - Used by the mentors to see who they are going to meet (=which startup) and when.
  * The mentor should sign-in with their gmail account and fill their personal details.
  * Next, she can see what is the schedule per day.
  * After each session, the mentor should fill the notes' section. This will help us learn and improve.
  * Check this [intro video](https://youtu.be/trJcLl413hg) to the mentor app.
  * You can use: https://bit.ly/lpa-m


* [Attendee Web App](https://lpa-1.firebaseapp.com/startup.html) - Used by the startups/attendees to see who is the lovely mentor that will work with them.
  * The attendee should sign-in with their gmail account and fill their personal details.
  * Next, she can see what is the schedule per day.
  * After each session, the attendee should fill the notes' section. This will help us get better.
  * Check this [intro video](https://youtu.be/psdF_o25dJc) to the attendee app.
  * You can use: https://bit.ly/lpa-s

-----

## Issue / Bug ?
Even a 🐱 App needs love from time to time.
Please use: [Open an issue](https://github.com/greenido/lpa-1/issues)
Also check: https://status.firebase.google.com/ just to be on the safe side.

-----
## Build and run locally

Make sure you have gulp installed (`npm install -g gulp`).

`npm install`
`gulp serve`

-----
## ToDos

### General
* [ ] Add build process (Gulp) - copy, minify, image optimization etc'.
* [ ] Add unit tests

### PWA
* [ ] Use Service workers for caching and local saving of notes.
* [x] Add manifest.
* [ ] Add push notifications on special notes that you mark with "todo".
* [x] Add to home screen.

### Sing-in
* [x] Enable an option to use Google

### Help
* [ ] Add mailto explanation for Chrome: chrome://settings/handlers
* [x] Add an intro to show the function/power user options in the app.

-----

![LPA PWA](https://lpa-1.firebaseapp.com/img/lion-hd.jpeg)
####A lion runs the fastest when he is hungry.
-----

## Data Model

### Mentor
* Key: email (but with '-' instead of '.')
* Name
* Email
* Domain (ux, tech, product, marketing)
* Expertise - free text
* LinkedIn Url
* Personal website Url
* Country
* City
* Picture Url

### Startup
* Key: Name
* Short description
* Long description
* Country
* City
* Fund raised
* Number of employees
* Date founded.
* Logo Url
* Team photo Url
* Application Video Url
* Marketing Video Url
* Patient History File Url

### Attendee
* Key: email (but with '-' instead of '.')
* Name
* Email
* Startup he is working at
* Pic Url
* Linkedin Url

### Locations
* Key: Name (with '-' instead of spaces)
* Name
* Address (free format)
* Comments
* unixTime (when it was added/updated)


### Session

#### This view is used by our attendee app
* Key: date (yyyy-mm-dd) / startups / startup name
  * comments (for the day)
  * mentors
    * 0-8
      * mentor email
      * mentor name

#### This view is used by our mentor app
* Key: date (yyyy-mm-dd) / mentors / mentor email
  * hours (1-9)
    * startup name
    * mentor name
    * notes
      * meeting notes
      * unixTime
      * date

### Notes
  * startup name
    * date
      * attendee-notes
        * attendee email
          * hour of session
            * date
            * effective
            * meetingNotes
            * mentorName
            * receptive
            * unixTime
      * mentor-notes
        * mentor email
          * hour of session
            * actionItems
            * date
            * effective
            * meetingNotes
            * mentorName
            * receptive
            * unixTime


## License

Copyright 2015 Google, Inc.

Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. The ASF licenses this file to you under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Please note: this is not a Google product

[![Analytics](https://ga-beacon.appspot.com/UA-65622529-1/LPA-1/)](https://github.com/igrigorik/ga-beacon)
