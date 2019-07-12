# Jirascope
[![Build Status](https://travis-ci.org/pikselpalette/jirascope.svg?branch=master)](https://travis-ci.org/pikselpalette/jirascope)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A tool that spiders through JIRA issues and provides useful analysis such as:

  * dependency graph visualisation
  * cyclic graph detection
  * invalid root issues - e.g. stories outside of epics
  * untracked issues

## Install

```bash
npm install -g jirascope
```

## Development

### Testing

Testing is done using [ava](https://github.com/avajs/ava) which allows for faster testing with concurrent tests.

```bash
npm test -- --watch
```
