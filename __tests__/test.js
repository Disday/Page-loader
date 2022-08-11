import { readFile, mkdtemp, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import nock from 'nock';
import loadPage from '../index.js';
// import { diff } from 'jest-diff';

let tmpDir;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildFixturePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);

beforeAll(() => {
  nock.disableNetConnect();
});

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('hexlet test', async () => {
  const source = await readFile(buildFixturePath('hexlet/site-com-blog-about.html'));
  const htmlFixture = await readFile(buildFixturePath('hexlet/expected/site-com-blog-about.html'), { encoding: 'utf-8' });
  const scope = nock('https://site.com')
    .get('/blog/about')
    .reply(200, source)
    .get('/blog/about')
    .reply(200, source)
    .get('/blog/about/assets/styles.css')
    .reply(200, {})
    .get('/photos/me.jpg')
    .reply(200, {})
    .get('/assets/scripts.js')
    .reply(200, {});
  const htmlPath = await loadPage('https://site.com/blog/about', tmpDir);
  expect(scope.isDone()).toBe(true);
  const htmlContent = await readFile(htmlPath, { encoding: 'utf-8' });
  expect(htmlContent).toEqual(htmlFixture);
});

test('resources download', async () => {
  const fixturesMap = [
    ['/courses', 'source.html'],
    ['/courses', 'source.html'],
    ['/assets/professions/nodejs.png', 'logo.png', 'ru-hexlet-io-assets-professions-nodejs.png'],
    ['/assets/application.css', 'app.css', 'ru-hexlet-io-assets-application.css'],
    ['/packs/js/runtime.js', 'runtime.js', 'ru-hexlet-io-packs-js-runtime.js'],
  ];

  const fixtures = await Promise.all(
    fixturesMap.map(([, fileName]) => readFile(buildFixturePath(fileName))),
  );
  const scope = nock('https://ru.hexlet.io');
  fixtures.forEach((fixture, i) => {
    const [requestPath] = fixturesMap[i];
    scope.get(requestPath).reply(200, fixture);
  });
  // test html content
  const htmlPath = await loadPage('https://ru.hexlet.io/courses', tmpDir);
  expect(scope.isDone()).toBe(true);
  const htmlFixture = await readFile(buildFixturePath('result.html'), { encoding: 'utf-8' });
  const htmlContent = await readFile(htmlPath, { encoding: 'utf-8' });
  expect(htmlContent).toEqual(htmlFixture);

  // test resources
  const dir = path.join(tmpDir, 'ru-hexlet-io-courses_files');
  const stats = await Promise.all(
    fixturesMap.map(([, , filename]) => {
      if (!filename) {
        return null;
      }
      return readFile(path.join(dir, filename));
    }),
  );

  stats.forEach((stat) => {
    expect(stat).toBeDefined();
  });
});

describe('wrong links', () => {
  test('wrong url', async () => {
    const scope = nock('http://test.io')
      .get('/wrongPath')
      .reply(404);

    expect.assertions(2);
    await expect(loadPage('http://test.io/wrongPath', tmpDir)).rejects.toThrow();
    expect(scope.isDone()).toBe(true);
  });

  test('wrong resource link', async () => {
    const fixture = await readFile(buildFixturePath('wrongLink.html'));
    const scope = nock('http://test.io')
      .get('/path')
      .reply(200, fixture)
      .get('/assets/wrongLink.css')
      .reply(404);

    expect.assertions(2);
    await expect(loadPage('http://test.io/path', tmpDir)).rejects.toThrow();
    expect(scope.isDone()).toBe(true);
  });
});

describe('filesystem errors', () => {
  test('non existent output dir', async () => {
    nock('http://test.io')
      .get('/news')
      .reply(200);

    expect.assertions(1);
    await expect(loadPage('http://test.io/news', path.join(tmpDir, 'nonExistentDir'))).rejects.toThrow();
  });

  test('denied access dir', async () => {
    nock('http://test.io')
      .get('/news')
      .reply(200);

    expect.assertions(1);
    await mkdir(path.join(tmpDir, 'unavaliableDir'), 0o444);
    await expect(loadPage('http://test.io/news', path.join(tmpDir, 'unavaliableDir'))).rejects.toThrow();
  });

  test('existent target', async () => {
    nock('http://test.io')
      .get('/news')
      .reply(200);

    expect.assertions(1);
    await mkdir(path.join(tmpDir, 'test-io-news_files'));
    await expect(loadPage('http://test.io/news', tmpDir)).rejects.toThrow();
  });
});
