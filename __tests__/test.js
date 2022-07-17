import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import nock from 'nock';
import loadPage from '../src/index.js';

let tmpDir;

beforeAll(() => {
  nock.disableNetConnect();
});

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('successful request', async () => {
  const scope = nock('http://yandex.ru')
    .get('/news/')
    .reply(200);

  const filePath = await loadPage('http://yandex.ru/news/', tmpDir);
  expect(scope.isDone()).toBe(true);
  const data = await fsp.readFile(filePath);
  expect(filePath).toEqual(path.join(tmpDir, 'yandex-ru-news-.html'));
  expect(data).toBeDefined();
});

test('fail request', async () => {
  const scope = nock('http://yandex.ru')
    .get('/kahsdhluasgdfasgdfa8ldgfa8sd/')
    .reply(404, {});
  const response = await loadPage('http://yandex.ru/kahsdhluasgdfasgdfa8ldgfa8sd/', tmpDir);
  expect(scope.isDone()).toBe(true);
  expect(response.includes('Request failed')).toBe(true);
});
