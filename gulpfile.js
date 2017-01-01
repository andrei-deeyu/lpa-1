const gulp = require('gulp');
const webserver = require('gulp-webserver');
const babel = require('gulp-babel');
const dom = require('gulp-dom');
const sass = require('gulp-sass');
const newer = require('gulp-newer');
const cssnano = require('gulp-cssnano');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');


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
      fallback: 'dist/index-mentor-new.html'
    }));

  gulp.watch(['js/mentor/**'], ['build']);
  gulp.watch(['styles/**'], ['styles']);
});

// Compile and automatically prefix stylesheets
gulp.task('styles', () => {
  /*const AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];*/

  return gulp.src([
    'lib/dialog-polyfill.css',
    'lib/material.blue_grey-orange.min.css',
    'styles/**/*.scss'
  ])
    .pipe(newer('dist/css'))
    .pipe(sourcemaps.init())
    .pipe(sass({
      precision: 10
    }).on('error', sass.logError))
    //.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(concat('mentor.css'))
    .pipe(cssnano())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/css'))
});

var gutil = require('gulp-util');
var critical = require('critical').stream;

// Generate & Inline Critical-path CSS
gulp.task('critical', ['styles'], function () {
  return gulp.src('index-mentor-new.html')
    .pipe(critical({
      base: 'dist/',
      inline: true,
      minify: true,
      css: [
        'dist/css/mentor.css'
      ]
    }))
    .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
    .pipe(gulp.dest('dist'));
});
