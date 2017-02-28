'use strict'

const Fsp = require('fs-promise')
const Path = require('path')

class FileStore {
  constructor (rootPath) {
    this.rootPath = rootPath
  }

  async readData (resourceName) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    let data

    try {
      const dataContents = await Fsp.readFile(filename)
      data = JSON.parse(dataContents)
    } catch (err) {
      if (err.code === 'ENOENT') {
        data = undefined
      } else if (err.code === 'ENOTDIR') {
        data = undefined
      } else {
        throw err
      }
    }
    return data
  }

  async writeData (resourceName, data) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    await Fsp.ensureDir(Path.dirname(filename))
    await Fsp.writeFile(filename, JSON.stringify(data, null, 2) + '\n')
  }

  async deleteData (resourceName) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    await Fsp.unlink(filename)
  }
}

exports = module.exports = FileStore
