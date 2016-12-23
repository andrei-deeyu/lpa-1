/*
 *
 *  LPA
 *  Author: Ido Green
 *  Date: March 2016
 * Cache strategy:
 * + Cache on install, for the static UI and behaviour
 * + Fetch from cache, then network, for the Flickr search results (?)
 */

 const CACHE_NAME = 'lpa-app-cache';
 const SITE_VERSION = '1';

 var urlsToCache = [
   '/',
   '/index.html',
   '/index.html?homescreen=1',
   '/index-mentor-new.html',
   '/js/main-mentor-new.js',
   '/js/firebase.js',
   '/js/auth.js',
   '/css/mentor-new.css',
   '/img/city-hd.jpeg'
 ];

// These we cache separately due to CORS concerns.
 var thirdPartyUrls = [
   'https://code.getmdl.io/1.2.1/material.blue_grey-orange.min.css',
   'https://code.getmdl.io/1.2.1/material.min.js',
   'https://www.gstatic.com/firebasejs/3.0.4/firebase.js'
 ];

 self.addEventListener('install', event => {
   event.waitUntil(
     caches
       .open(CACHE_NAME + '-v' + SITE_VERSION)
       .then(cache => {
          // This may fail silently if promise rejects.
          thirdPartyUrls.forEach(url => {
            let req  =  new Request(url, {mode: 'no-cors'});
            fetch(req).then(response => cache.put(req, response));
          })
          return cache.addAll(urlsToCache).then(_ => console.log('caches done'));
     })
   );
   self.skipWaiting();
 });

self.addEventListener('activate', event => {
  const currentCache = CACHE_NAME + '-v' + SITE_VERSION;
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.indexOf(CACHE_NAME) === -1) {
          return null;
        }
        if (cacheName !== currentCache) {
          return caches.delete(cacheName);
        }
        return null;
      })
    );
  });
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
