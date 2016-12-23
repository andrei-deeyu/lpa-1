const gulp = require('gulp');
const webserver = require('gulp-webserver');
const babel = require('gulp-babel');
const dom = require('gulp-dom');
const sass = require('gulp-sass');
const newer = require('gulp-newer');

gulp.task('build', ['styles', 'js']);

gulp.task('js', () => {
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

  gulp.watch(['js/mentor/**'], ['build']);
  gulp.watch(['styles/**'], ['styles']);
});

// Compile and automatically prefix stylesheets
gulp.task('styles', () => {
  const AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];

  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src([
    'styles/**/*.scss'
  ])
    .pipe(newer('dist/css'))
    //.pipe($.sourcemaps.init())
    .pipe(sass({
      precision: 10
    }).on('error', sass.logError))
    //.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('dist/css'))
    // Concatenate and minify styles
    /*.pipe($.if('*.css', $.cssnano()))
    .pipe($.size({title: 'styles'}))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('dist/styles'))
    .pipe(gulp.dest('.tmp/styles'));*/
});
