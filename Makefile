install:
	npm ci

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npm test

test-debug:
	DEBUG=nock.scope*,page-loader npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8
	
debug:
	DEBUG=axios,page-loader node --inspect --require axios-debug-log  ./bin/page-loader.js $(url)
#  node  [entrypoint.js]