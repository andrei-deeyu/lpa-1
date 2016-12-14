const gulp = require('gulp');
const webserver = require('gulp-webserver');
const babel = require('gulp-babel');

gulp.task('build', () => {
  return gulp.src('js/mentor/**')
    .pipe(babel({
        presets: ['es2015']
    }))
    .pipe(gulp.dest('dist/js'));
});

gulp.task('serve', ['build'], function() {
  gulp.src('.')
    .pipe(webserver({
      livereload: true,
      fallback: 'index-mentor-new.html'
    }));
});
