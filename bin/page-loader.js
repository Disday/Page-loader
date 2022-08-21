#!/usr/bin/env node

import { Command } from 'commander/esm.mjs';
// import debug from 'debug';
import i18n from 'i18next';
import loadPage from '../src/index.js';
import en from '../locales/en.js';

i18n.init({
  lng: 'en',
  // debug: true,
  resources: { en },
});
const app = new Command();
// const log = debug('page-loader');

const getMessage = (e) => {
  if (e.constructor.name === 'AxiosError') {
    return i18n.t('downloadError', { url: e.config.url });
  }
  const { code, input, path } = e;
  const messageMap = {
    ERR_INVALID_URL: i18n.t('downloadError', { url: input }),
    EEXIST: i18n.t('fileExists', { path }),
    // ENOENT: i18n.t('noOutputDir', { output }),
    EACCES: i18n.t('noAccessToDir', { path }),
  };
  return messageMap[code];
};

app
  .description('Utility for web-page loading including all local resourses')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output directory')
  .arguments('<url>')
  .action((url, { output }) => {
    loadPage(url, output)
      .then((path) => console.log(path))
      .catch((e) => {
        const message = getMessage(e, output) ?? e.message;
        console.error(message);
        process.exit(1);
      });
  });

app.parse();
