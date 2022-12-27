import serve from 'rollup-plugin-serve';
import copy from 'rollup-plugin-copy-merge';
import watchAssets from 'rollup-plugin-watch-assets';
import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

const config = [{
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    name: 'index',
    format: 'iife'
  },
  plugins: [
    // add the postccs plugin
    postcss({
      extract: true,
      minimize: production,
      sourceMap: !production
    }),
    copy({
      targets: [
        { src: 'src/*.html', dest: 'dist/' },
        { src: 'src/*.css', dest: 'dist/' },
        { src: 'src/assets', dest: 'dist/' },
        { src: './node_modules/chota/dist/chota.min.css', dest: 'dist/' }
      ]
    }),
    commonjs(),
    json(),
    !production && watchAssets({ assets: ['src'] }),
    !production && serve({'contentBase': 'dist', 'port': '10007'}) && livereload({watch: 'dist', verbose: false}),
    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    resolve({ browser: true }),
  ],
  watch: {
    clearScreen: false
  }
}
];

export default config;
