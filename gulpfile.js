const gulp = require('gulp');
const webserver = require('gulp-webserver');
const babel = require('gulp-babel');
const dom = require('gulp-dom');
const sass = require('gulp-sass');
const newer = require('gulp-newer');
const cssnano = require('gulp-cssnano');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const size = require('gulp-size');
const gutil = require('gulp-util');
const critical = require('critical').stream;


const path = require('path');

const ROOT_DIR = 'mentor';



gulp.task('images', () =>
  gulp.src(path.join(ROOT_DIR, 'img/**/*'))
    .pipe(imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest('dist/img'))
    .pipe(size({title: 'images'}))
);

gulp.task('js', () => {
  // Order matters!
  var scripts = [
    '/node_modules/dialog-polyfill/dialog-polyfill.js',
    path.join(ROOT_DIR, 'js', 'firebase.js'),
    path.join(ROOT_DIR, 'js', 'auth.js'),
    path.join(ROOT_DIR, 'js', 'router.js'),
    path.join(ROOT_DIR, 'js', 'ui.js'),
    path.join(ROOT_DIR, 'js', 'main-mentor-new.js')
  ]

  return gulp.src(scripts)
    .pipe(babel({
        presets: ['es2015']
    }))
    .pipe(sourcemaps.init())
    .pipe(concat('mentor.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/js'));
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
    'node_modules/dialog-polyfill/dialog-polyfill.css',
    path.join(ROOT_DIR, 'lib', 'material.blue_grey-orange.min.css'),
    path.join(ROOT_DIR, 'styles', '**/*.scss')
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


// Generate & Inline Critical-path CSS
gulp.task('critical', ['styles'], function () {
  return gulp.src(path.join(ROOT_DIR, 'templates', 'index.html'))
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

gulp.task('build', ['critical', 'js', 'images']);

gulp.task('serve', ['build'], function() {
  gulp.src('dist')
    .pipe(webserver({
      livereload: true,
      fallback: 'index.html'
    }));

  gulp.watch(['mentor/js/**'], ['js']);
  gulp.watch(['mentor/styles/**'], ['critical']);
  gulp.watch(['mentor/templates/**'], ['critical']);
});
