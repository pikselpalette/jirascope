const sinon = require('sinon')

const exampleConfig = {
  epicKeyCustomField: '10008',
  epicIssueTypes: ['Epic'],
  parentKeyCustomField: '10600',
  parentIssueTypes: ['Initiative'],
  allowedGraphIssueTypes: ['Initiative', 'Requirement', 'Change'],
  allowedIssueKeyPrefixes: 'XXX',
  allowedRootIssueTypes: ['Initiative', 'Requirement', 'Change'],
  terminalStatuses: ['Acceptance', 'Release', 'Done', 'Reject', 'Rejected'],
  terminalStatusCategories: ['A category', 'No Category'],
  followLinkTypes: ['Blocks', 'Epic', 'Parent', 'Covers']
}

const fakeDataStore = () => {
  const deleteData = sinon.stub()
  const readData = sinon.stub()
  const writeData = sinon.stub()

  const reset = () => {
    deleteData.reset()
    readData.reset()
    writeData.reset()
  }

  return {
    deleteData,
    readData,
    writeData,
    reset
  }
}

module.exports = {
  fakeDataStore,
  exampleConfig
}
