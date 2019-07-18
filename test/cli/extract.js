'use strict'

const exampleConfig = require('../support/_index').exampleConfig
const fakeDataStore = require('../support/_index').fakeDataStore()
const test = require('ava').test
const sinon = require('sinon')
const JiraScope = require('../../lib/index')
const Extract = require('../../lib/cli/extract')

test.beforeEach(t => {
  fakeDataStore.reset()
})

test('Should extract issues, tidy and then store them', async t => {
  const exampleIssue = {
    key: 'XXX-000',
    summary: 'A filter of an issue',
    type: 'Problem',
    project: 'X project',
    projectKey: 'XXX',
    priority: 'Low',
    labels: [],
    status: 'Done',
    statusCategory: 'No Category',
    updated: '2019-07-05T10:10:37.802+0100',
    links: [{ srcKey: '123' }],
    parentKey: {
      hasEpicLinkFieldDependency: false,
      showField: false,
      nonEditableReason: []
    }
  }
  const issueStub = sinon.stub().returns([Object.assign({}, exampleIssue)])
  const JiraClientFake = {
    getIssuesByQuery: issueStub
  }
  const jiraScope = new JiraScope(JiraClientFake, fakeDataStore, exampleConfig)
  const extract = new Extract(exampleConfig, jiraScope)

  await extract.run()
  t.plan(4)
  // Fetch()
  t.truthy(jiraScope.issues)
  t.true(issueStub.called)

  // Tidy()
  t.is(jiraScope.issues[0].links.length, 0)

  // Store()
  t.true(fakeDataStore.writeData.calledThrice)
})
