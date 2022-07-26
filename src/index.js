import { stat, mkdir, writeFile } from 'fs/promises';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';

const defaultDir = `${process.cwd()}/downloads`;

// refactor
const generateFilepath = ({ host, pathname }, dir, incomingExt = '.html') => {
  const base = ''.concat(
    host.replace(/\./g, '-'),
    pathname.replace(/\//g, '-'),
  );
  const { name, ext } = path.parse(base);
  const ext1 = ext || incomingExt;
  // console.log(base, ext);
  return path.join(dir, `${name}${ext1}`);
};

const downloadResources = (urls) => {
  const promises = urls.map((url) => (
    // console.log(url);
    axios.get(url.href, { method: 'get', responseType: 'arraybuffer' })
  ));

  return promises;
};

const replaceLinks = (html, host, dir) => {
  const attrMap = {
    img: 'src',
    link: 'href',
    script: 'src',
    // base: 'href',
  };

  const $ = cheerio.load(html);
  $('base').remove();
  const result = { urls: [] };

  Object.keys(attrMap).forEach((tag) => {
    const attr = attrMap[tag];
    // refactor
    $(tag).each((i, elem) => {
      const link = $(elem).attr(attr);
      const url = new URL(link, host);
      const baseUrl = new URL(host);
      if (!link || !url.hostname.includes(baseUrl.hostname)) {
        return;
      }
      const newLink = generateFilepath(url, dir);
      result.urls = [...result.urls, url];
      $(elem).prop(attr, newLink);
    });
  });

  // console.log('rereeeee', result);
  return { ...result, html: $.html() };

  // console.log(result);
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
  const dirpath = generateFilepath(url, outputDir, '_files');
  const htmlPath = generateFilepath(url, outputDir, '.html');
  // console.log(dirpath, htmlPath);

  let html;
  return axios.get(url.href)
    .then(({ data }) => {
      html = data;
    })
    .then(() => stat(dirpath))
    .catch((e) => {
      if (e.code === 'ENOENT') {
        // console.log('1 catch', e.message);
        return mkdir(dirpath, { recursive: true });
      }
      throw e;
    })
    .then(() => {
      const result = replaceLinks(html, url.href, path.basename(dirpath));
      const { html: updatedHtml, urls } = result;
      writeFile(htmlPath, updatedHtml);
      // writeFile('./__fixtures__/1.html', updatedHtml);
      return urls;
    })
    .then((urls) => Promise.all(downloadResources(urls)))
    .then((responses) => {
      Promise.all(saveImages(responses, dirpath));
    })
    .then(() => htmlPath)
    .catch((e) => {
      console.log('2 catch', e.message);
      // console.log('2 catch', e.);
      return e;
      // throw e;
    });
};
