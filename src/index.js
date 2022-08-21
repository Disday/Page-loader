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

const askUser = (e, dir) => {
  const map = {
    ENOENT: {
      result: () => mkdir(dir),
      question: 'noOutputDir',
    },
    EEXIST: {
      result: () => true,
      question: 'fileExists',
    },
  };
  const isUnwatchedError = ({ code }) => !Object.keys(map).includes(code);
  if (isUnwatchedError(e)) {
    throw e;
  }

  const { result, question } = map[e.code];
  const message = i18n.t(question, { path: dir });
  const answer = readline.question(message);
  if (answer.toLowerCase() === 'y') {
    return result();
  }

  throw Error('Aborted');
};

export default async (uri, outputDir = process.cwd(), userAnswer = null) => {
  log('run');
  // monkey patch for tests only
  if (userAnswer) {
    readline.question = () => userAnswer;
  }

  const normalizedUri = uri.includes('http') ? uri : `http://${uri}`;
  const url = new URL(normalizedUri);
  const dirpath = generateFilepath(url, outputDir, '_files');
  const htmlPath = generateFilepath(url, outputDir);

  return stat(outputDir)
    .catch((e) => askUser(e, outputDir))
    .then(() => mkdir(dirpath))
    .catch((e) => askUser(e, dirpath))
    .then(() => axios.get(url.href))
    .then(({ data }) => {
      const { updatedHtml, urls } = replaceLinks(data, url.href, dirpath);
      writeFile(htmlPath, updatedHtml);
      return urls;
    })
    .then((urls) => downloadResources(urls))
    .then((responses) => saveResources(responses, dirpath))
    .then(() => htmlPath);
};
