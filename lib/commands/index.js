'use strict'

var Fs = require('fs')

var tasks = {}
Fs.readdirSync(__dirname).forEach((file) => {
  if (file !== 'index.js') {
    var name = file.replace('.js', '')
    tasks[name] = require('./' + name)
  }
})

exports = module.exports = tasks
