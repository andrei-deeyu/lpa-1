var gulp = require('gulp');
var webserver = require('gulp-webserver');

gulp.task('serve', function() {
  gulp.src('.')
    .pipe(webserver({
      livereload: true,
      fallback: 'index-mentor-new.html'
    }));
});
