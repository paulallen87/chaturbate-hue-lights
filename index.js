const HueController = require('./hue');
const ChaturbateBrowser = require('@paulallen87/chaturbate-browser');
const ChaturbateController = require('@paulallen87/chaturbate-controller');

const lightController = new HueController();
const chaturbateBrowser = new ChaturbateBrowser();
const chaturbateController = new ChaturbateController(chaturbateBrowser);

const close = (e) => {
  if (e) console.error(e);

  chaturbateBrowser.stop();
  lightController.stop();
}

process.on('exit', () => close(null));
process.on('SIGTERM', () => close(null));
process.on('uncaughtException', (e) => close(e));

(async () => {
  await chaturbateBrowser.start();
  await lightController.start();

  chaturbateController.on('tip', () => {
    lightController.animate((originalState) => {
      const alertState = lightController.createState()
            .on()
            .reset()
            .brightness(100)
            .saturation(100)
            .transition(1000)
            .rgb(0, 255, 0);

      return [
        {
          delay: 1000,
          state: alertState
        },
        {
          delay: 1000,
          state: originalState
        },
        {
          delay: 1000,
          state: alertState
        },
        {
          delay: 1000,
          state: originalState
        }
      ];
    });
  });

  const username = process.argv[2] || process.env['CB_USERNAME'];
  await chaturbateBrowser.profile(username);
})();