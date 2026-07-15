'use strict';

const path = require('path');

module.exports = ({ env }) => ({
  level: 'debug',
  transports: [
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
      level: 'debug',
    },
    {
      target: 'pino/file',
      options: {
        destination: path.join(__dirname, '..', 'logs', 'strapi-all.log'),
        mkdir: true,
      },
      level: 'debug',
    },
  ],
});
