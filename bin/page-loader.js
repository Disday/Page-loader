#!/usr/bin/env node

import { Command } from 'commander/esm.mjs';
import loadPage from '../src/index.js';

const app = new Command();

app
  .description('Utility for full web-page loading including all resourses')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output directory')
  .arguments('<url>')
  .action((url, options) => {
    loadPage(url, options.output)
      .then((path) => console.log(path))
      .catch((e) => console.log(e.message));
  });

app.parse();
