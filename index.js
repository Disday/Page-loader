import { mkdir, writeFile } from 'fs/promises';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
// import debug from 'debug';

// const log = debug('page-loader');
const defaultDir = `${process.cwd()}/downloads`;

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
  // listr.run()
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
    const isLocalLink = link && url.hostname.includes(baseUrl.hostname);
    if (isLocalLink) {
      const newLink = generateFilepath(url, dir);
      urls = [...urls, url];
      $(elem).prop(linkAttr, newLink);
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

export default async (uri, outputDir = defaultDir) => {
  const url = new URL(uri);
  const dirpath = generateFilepath(url, outputDir, '_files');
  const htmlPath = generateFilepath(url, outputDir);

  let html;
  return axios.get(url.href)
    .then(({ data }) => {
      html = data;
    })
    .then(() => mkdir(dirpath))
    .then(() => {
      const baseDir = path.basename(dirpath);
      const { updatedHtml, urls } = replaceLinks(html, url.href, baseDir);
      writeFile(htmlPath, updatedHtml);
      return urls;
    })
    .then((urls) => downloadResources(urls))
    .then((responses) => saveResources(responses, dirpath))
    .then(() => htmlPath);
};
