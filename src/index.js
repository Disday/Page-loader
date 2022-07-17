import fsp from 'fs/promises';
import axios from 'axios';
import path from 'path';

export default async (uri, dir) => {
  const { href, host, pathname } = new URL(uri);
  const fileName = `${host}${pathname}`
    .replace(/[./]/g, '-');
  const filePath = path.join(dir, `${fileName}.html`);

  return axios.get(href)
    .then(({ data }) => fsp.writeFile(filePath, data))
    .then(() => filePath)
    .catch((e) => e.message);
};
