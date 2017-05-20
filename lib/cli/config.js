'use strict'

const winston = require('winston')

const commandName = 'config'

const define = function (prog, config) {
  prog.command(commandName)
    .description('Display config for debugging purposes')
    .argument('[val...]', 'vals')
    .option('--optInt <int>', 'option <int> for some purpose', prog.INT)
    .action(function (args, options) {
      run(this, args, options, config)
    })

  winston.loggers.add(commandName, {
    console: {
      colorize: true,
      label: commandName
    }
  })
}

const run = function (command, args, options, config) {
  const logger = winston.loggers.get(commandName)
  logger.info('config:', JSON.stringify(config, null, 2))
  logger.info('args:', JSON.stringify(args, null, 2))
  logger.info('options:', JSON.stringify(options, null, 2))
}

exports = module.exports = {
  define
}
