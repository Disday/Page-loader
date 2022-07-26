install:
	npm ci

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8
	
make debug:
	node --inspect ./bin/page-loader.js $(url)

# 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