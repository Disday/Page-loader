import { stat, mkdir, writeFile } from 'fs/promises';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';

const defaultDir = `${process.cwd()}/downloads`;

const generateHtmlpath = ({ host, pathname }, outputDir) => {
  const base = `${host}${pathname}`
    .replace(/[./]/g, '-');
  return path.join(outputDir, `${base}_files`, `${base}.html`);
};

const generateFilepath = ({ host, pathname }, outputDir = '') => {
  const base = ''.concat(
    host.replace(/\./g, '-'),
    pathname.replace(/\//g, '-'),
  );

  return path.join(outputDir, base);
};

const downloadImages = (urls) => {
  const promises = urls.map(({ href }) => (
    axios.get(href, { method: 'get', responseType: 'Buffer' })));

  return promises;
};

const replaceLinks = (html, host) => {
  const result = { urls: [] };
  const $ = cheerio.load(html);
  $('img').each((i, elem) => {
    const link = $(elem).attr('src');
    const url = new URL(link, host);
    result.urls = [...result.urls, url];
    const newLink = generateFilepath(url);
    $(elem).prop('src', newLink);
  });
  // console.log(html);
  return { ...result, html: $.html() };
};

const saveImages = (responses, dirpath) => {
  const promises = responses.map((response) => {
    const url = new URL(response.config.url);
    const filepath = generateFilepath(url, dirpath);
    return writeFile(filepath, response.data);
  });

  return promises;
};

export default async (uri, outputDir = defaultDir) => {
  const url = new URL(uri);
  const htmlPath = generateHtmlpath(url, outputDir);
  const dirpath = path.dirname(htmlPath);

  let html;
  return axios.get(url.href)
    .then(({ data }) => {
      html = data;
      // console.log('1 then');
    })
    .then(() => stat(dirpath))
    .catch((e) => {
      if (e.code === 'ENOENT') {
        console.log('1 catch', e.message);
        return mkdir(dirpath, { recursive: true });
      }
      throw e;
    })
    .then(() => {
      const { html: updatedHtml, urls } = replaceLinks(html, url.href);
      writeFile(htmlPath, updatedHtml);
      // writeFile('./__fixtures__/1.html', updatedHtml);
      return urls;
    })
    .then((urls) => Promise.all(downloadImages(urls)))
    .then((responses) => {
      Promise.all(saveImages(responses, dirpath));
    })
    .then(() => htmlPath)
    .catch((e) => {
      console.log('2 catch', e.message);
      return e.message;
    });
};
