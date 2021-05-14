'use strict';

const args = require(`minimist`)(process.argv.slice(2));
const chalk = require(`chalk`);
const express = require('express');

function init() {
  const inputParams = args[`_`];
  if (inputParams.length > 0) {
    const port = inputParams[0];
    const app = express();
    app.use(express.json());

    console.log(chalk.green(`Welcome to WS API proxy`));

    console.log(chalk.cyan(`GET: {host}:${port}/status`));
    app.get('/status', async (req, res) => {
      res.send({
        status: 'ok',
        date: new Date(),
      });
    });

    console.log(chalk.cyan(`POST: {host}:${port}`));
    app.post('/', async (req, res) => {
      const wsParams = req.body;
      const result = await callWSIO(wsParams);
      res.send({
        response: result,
        _request: wsParams,
      });
    });

    app.listen(port, 'localhost', () => {
      console.log(chalk.green(`Service listen on http://localhost:${port}`));
    });

    async function callWSIO(wsParams) {
      return new Promise((resolve, reject) => {
        // 'socket.io-client' => "^2.4.0" 👈 last compatible
        const io = require('socket.io-client');
        const socket = io(wsParams.url, {
          // path: '/notes',
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionAttempts: 10,
          transports: ['websocket'],
          agent: false, // [2] Please don't set this to true
          upgrade: false,
          rejectUnauthorized: false,
          extraHeaders: wsParams.headers,
        });

        console.log(chalk.cyan(`Connect to ${wsParams.url}`));
        socket.on('connect', () => {
          console.log(chalk.magenta(`    ↳ Successfully connected!`));
          console.log(chalk.magenta(`    ↳ Emit ${wsParams.emitter}! `));
          socket.emit(wsParams.emitter, wsParams.argument);
        });

        wsParams.listeners.map((l) => {
          // console.log('listener', l);
          socket.on(l, (msg) => {
            resolve({ listener: l, result: msg });
            console.log(chalk.magenta(`    ↳ Dispatch listener: ${l}`));
          });
        });

        socket.on('connect_error', (err) => {
          console.log(chalk.red(`    ↳ connect_error due to ${err.message}`));
          reject(err);
        });

        socket.on('disconnect', function () {
          console.log(chalk.magenta('    ↳ Disconnected'));
        });
      });
    }
  } else {
    console.log(chalk.red(`Port number is missing`));
  }
}

module.exports = { init };
