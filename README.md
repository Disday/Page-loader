# Page loader

### Tests and linter status:
[![Node.js CI](https://github.com/Disday/backend-project-lvl3/actions/workflows/nodejs-ci.yaml/badge.svg)](https://github.com/Disday/backend-project-lvl3/actions/workflows/nodejs-ci.yaml)
<a href="https://codeclimate.com/github/Disday/backend-project-lvl3/maintainability"><img src="https://api.codeclimate.com/v1/badges/b401f95d90ac182647f8/maintainability" /></a>
<a href="https://codeclimate.com/github/Disday/backend-project-lvl3/test_coverage"><img src="https://api.codeclimate.com/v1/badges/b401f95d90ac182647f8/test_coverage" /></a>

## Description
CLI utility loading given web-page with local resources (images, styles, scripts) for offline usage

## Features
- Fully asynchronous workflow based on Nodejs promises
- Indication of downloading progress
- Requesting user confirmation for overwrite existing and create non existing folders

## Main dependencies
- Axios 0.27.2
- Cheerio 1.0.0
- Commander 9.4.0
- i18next 21.9.0
- Eslint 8.21.0
- Jest 28.1.3

## Requirements
1. **Nodejs** v16.0 or higher. For install you can follow  https://nodejs.org/en/
2. **Make** utility. For install use ```sudo apt install make```

## Setup
1. Clone repository to your system with ```git clone https://github.com/Disday/Page-loader.git```
2. Enter project directory
3. If you use Docker just ```make docker``` for build Docker image and run application in container\
**OR**\
Run installation with ```make install```

## Run
Run application with ```page-loader your-page.com```