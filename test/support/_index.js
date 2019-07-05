const sinon = require('sinon')

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
  fakeDataStore
}
