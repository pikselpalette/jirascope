'use strict'

const define = function (prog, config) {
  prog.command('config')
    .help('displays config for debugging purposes')
    .argument('[val...]', 'vals')
    .option('--optInt <int>', 'option <int> for some purpose', prog.INT)
    .action(function (args, options, logger) {
      run(this, args, options, logger, config)
    })
}

const run = function (command, args, options, logger, config) {
  logger.info('config:', JSON.stringify(config, null, 2))
  logger.info('args:', JSON.stringify(args, null, 2))
  logger.info('options:', JSON.stringify(options, null, 2))
}

exports = module.exports = {
  define
}
