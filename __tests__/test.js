import { readFile, mkdtemp } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import nock from 'nock';
import loadPage from '../src/index.js';

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

test('successful request', async () => {
  const scope = nock('http://yandex.ru')
    .get('/news')
    .reply(200);

  const filePath = await loadPage('http://yandex.ru/news', tmpDir);
  expect(scope.isDone()).toBe(true);

  const data = await readFile(filePath);
  const expectedPath = path.join(tmpDir, 'yandex-ru-news.html');
  expect(filePath).toEqual(expectedPath);
  expect(data).toBeDefined();
});

test('fail request', async () => {
  const scope = nock('http://yandex.ru')
    .get('/kahsdhluasgdfasgdfa8ldgfa8sd')
    .reply(404, {});
  const { response } = await loadPage('http://yandex.ru/kahsdhluasgdfasgdfa8ldgfa8sd', tmpDir);
  expect(scope.isDone()).toBe(true);
  expect(response.status).toEqual(404);
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
    fixturesMap.map(([, fixtureName]) => readFile(buildFixturePath(fixtureName))),
  );
  const scope = nock('https://ru.hexlet.io');
  fixtures.forEach((fixture, i) => {
    const [requestPath] = fixturesMap[i];
    scope.get(requestPath).reply(200, fixture);
  });
  //  test html content
  const htmlPath = await loadPage('https://ru.hexlet.io/courses', tmpDir);
  expect(scope.isDone()).toBe(true);
  const htmlContent = await readFile(htmlPath);
  const htmlFixture = await readFile(buildFixturePath('result.html'));
  expect(htmlContent).toEqual(htmlFixture);

  //  test resources
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
