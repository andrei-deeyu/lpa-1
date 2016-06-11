![](https://developers.google.com/startups/images/logo-launch.svg)
## Overview

The goal of these apps is to enable us to run a LPA event(s).
We got three web apps (so far):

* [Admin Web App](https://lpa-1.firebaseapp.com/) - Used by the organizers to set the schedule for the mentors and startups. 
  * The mentors and attendees emails/names should be added to the system so they will be 'white listed'.
  * The startups' details should be filled.
  * The schedule per day of the LPA.

* [Mentor Web App](https://lpa-1.firebaseapp.com/index-mentor.html) - Used by the mentors to see who they are going to meet (=which startup) and when.
  * The mentor should sign-in with their gmail account and fill their personal details.
  * Next, she can see what is the schedule per day.
  * After each session, the mentor should fill the notes' section. This will help us learn and improve.
  * Check this [intro video](https://youtu.be/trJcLl413hg) to the mentor app.


* [Attendee Web App](https://lpa-1.firebaseapp.com/startup.html) - Used by the startups/attendees to see who is the lovely mentor that will work with them.
  * The attendee should sign-in with their gmail account and fill their personal details.
  * Next, she can see what is the schedule per day.
  * After each session, the attendee should fill the notes' section. This will help us get better.
  * Check this [intro video](https://youtu.be/psdF_o25dJc) to the attendee app.
-----

## Issue / Bug ?
Please use: [Open an issue](https://github.com/greenido/lpa-1/issues)

-----
## ToDos

### General
* [ ] Add build process (Gulp) - copy, minify, image optimization etc'.
* [ ] Add unit tests

### PWA
* [ ] Use Service workers for caching and local saving of notes.
* [ ] Add manifest.
* [ ] Add push notifications on special notes that you mark with "todo".

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


