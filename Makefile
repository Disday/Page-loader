install:
	npm ci
	sudo npm link .

lint:
	npx eslint . --fix

test:
	npm test

test-debug:
	DEBUG=page-loader npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8
	
debug:
	DEBUG=axios,page-loader node --inspect --require axios-debug-log  ./bin/page-loader.js $(url)

docker:
	docker build -t page-loader .
	docker run -it page-loader bash -lic 'page-loader --help; bash'