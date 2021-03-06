echo "-- Build --"
gulp build
echo "-- Copy files to public dir --"
mkdir -p public
cp *.html public/
cp *.png public/
cp -R js/ public/js/
cp sw.js public/sw.js
cp service-worker.js public/service-worker.js
cp cache-polyfill.js public/cache-polyfill.js
cp -R css/ public/css/
cp -R fonts/ public/fonts/
cp -R img/ public/img/

rm -R public/mentor
cp -R dist/mentor public/mentor
cp manifest*.json public/

echo "-- push it to firebase --"
firebase deploy
