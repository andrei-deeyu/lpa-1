echo "-- Build --"
gulp build
echo "-- Copy files to public dir --"
mkdir -p public
cp *.html public/
cp -R js/ public/js/
cp sw.js public/sw.js
cp cache-polyfill.js public/cache-polyfill.js
cp -R css/ public/css/
cp -R img/ public/img/

rm -R public/mentor
cp -R dist/mentor public/mentor
cp manifest.json public/manifest.json

echo "-- push it to firebase --"
firebase deploy
