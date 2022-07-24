import { readFile, mkdtemp, stat } from 'fs/promises';
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
  const expectedPath = path.join(tmpDir, 'yandex-ru-news_files', 'yandex-ru-news.html');
  expect(filePath).toEqual(expectedPath);
  expect(data).toBeDefined();
});

test('fail request', async () => {
  const scope = nock('http://yandex.ru')
    .get('/kahsdhluasgdfasgdfa8ldgfa8sd')
    .reply(404, {});
  const response = await loadPage('http://yandex.ru/kahsdhluasgdfasgdfa8ldgfa8sd', tmpDir);
  expect(scope.isDone()).toBe(true);
  expect(response.includes('Request failed')).toBe(true);
});

test('images download', async () => {
  const sourceFixture = await readFile(buildFixturePath('source.html'));
  const imgFixture = await readFile(buildFixturePath('logo.png'));
  const scope = nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, sourceFixture)
    .get('/assets/professions/nodejs.png')
    .reply(200, imgFixture);

  const resultPath = await loadPage('https://ru.hexlet.io/courses', tmpDir);
  const resultContent = await readFile(resultPath);
  const resultFixture = await readFile(buildFixturePath('result.html'));
  expect(scope.isDone()).toBe(true);
  expect(resultContent).toEqual(resultFixture);
  // console.log(resultPath);
  const expectedPath = path.join(tmpDir, 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
  const fileStat = await stat(expectedPath);
  expect(fileStat).toBeDefined();
});
