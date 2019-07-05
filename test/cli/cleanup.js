'use strict'

const fakeDataStore = require('../support/_index').fakeDataStore()
const test = require('ava').test

const JiraScope = require('../../lib/index')

test.beforeEach(t => {
  fakeDataStore.reset()
})

test('cleanup calls methods on datastore', async t => {
  t.plan(1)

  const jiraScope = new JiraScope({}, fakeDataStore, {})
  await jiraScope.cleanup()

  t.is(fakeDataStore.deleteData.calledThrice, true)
})
