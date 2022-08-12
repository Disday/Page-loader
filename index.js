import { mkdir, writeFile, stat } from 'fs/promises';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import readline from 'readline-sync';
import i18n from 'i18next';

const log = debug('page-loader');

const generateFilepath = ({ host, pathname }, dir, incomingExt = '.html') => {
  const base = ''.concat(
    host.replace(/\./g, '-'),
    pathname.replace(/\//g, '-'),
  );
  const { name, ext: baseExt } = path.parse(base);
  const ext = baseExt || incomingExt;
  return path.join(dir, `${name}${ext}`);
};

const downloadResources = (urls) => {
  const tasks = urls.map((url) => {
    const promise = axios.get(url.href, { method: 'get', responseType: 'arraybuffer' });
    return {
      title: url.href,
      task: () => promise,
    };
  });
  const promises = tasks.map(({ task }) => task());
  const listr = new Listr(tasks, { concurrent: true, exitOnError: false });
  listr.run().catch(() => { });
  return Promise.all(promises);
};

const replaceLinks = (html, host, dir) => {
  const $ = cheerio.load(html);
  $('base').remove();
  let urls = [];

  $('img, link, script').each((i, elem) => {
    const linkAttr = elem.name === 'link' ? 'href' : 'src';
    const link = $(elem).attr(linkAttr);
    const url = new URL(link, host);
    const baseUrl = new URL(host);
    const isLocalLink = link && url.hostname === baseUrl.hostname;
    if (isLocalLink) {
      const baseDir = path.basename(dir);
      const newLink = generateFilepath(url, baseDir);
      $(elem).prop(linkAttr, newLink);
      urls = [...urls, url];
    }
  });

  return { urls, updatedHtml: $.html() };
};

const saveResources = (responses, dirpath) => {
  const promises = responses.map(({ config, data }) => {
    const url = new URL(config.url);
    const filepath = generateFilepath(url, dirpath);
    return writeFile(filepath, data);
  });

  return Promise.all(promises);
};

export default async (uri, outputDir = process.cwd()) => {
  const normalizedUri = uri.includes('http') ? uri : `http://${uri}`;
  const url = new URL(normalizedUri);
  // log(url)
  const dirpath = generateFilepath(url, outputDir, '_files');
  const htmlPath = generateFilepath(url, outputDir);

  const resources = {};
  return stat(outputDir)
    .catch(() => {
      const message = i18n.t('noOutputDir', { path: outputDir });
      const answer = readline.question(message);
      if (answer.toLowerCase() === 'y') {
        return mkdir(outputDir);
      }

      throw Error('Aborted');
    })
    .then(() => mkdir(dirpath))
    .catch((e) => {
      if (e.message === 'Aborted') {
        throw e;
      }
      const message = i18n.t('fileExists', { path: outputDir });
      const answer = readline.question(message);
      if (answer.toLowerCase() === 'y') {
        return true;
      }

      throw Error('Aborted');
    })
    .then(() => axios.get(url.href))
    .then(({ data }) => {
      resources.html = data;
    })
    .then(() => {
      log('here');
      const { updatedHtml, urls } = replaceLinks(resources.html, url.href, dirpath);
      resources.urls = urls;
      return writeFile(htmlPath, updatedHtml);
    })
    .then(() => downloadResources(resources.urls))
    .then((responses) => saveResources(responses, dirpath))
    .then(() => htmlPath);
};
