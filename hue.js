const debug = require('debug')('chaturbate:hue');
const nconf = require('nconf');
const hue = require('node-hue-api');

nconf.argv().env().file({file: 'config.json'});

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class HueController {

  constructor() {

  }

  createState() {
    return hue.lightState.create();
  }

  async getBridgeIP() {
    debug('looking up bridge ip address...')
    const ip = nconf.get('hue:ip');
    if (ip) {
      debug('bridge ip found in local config')
      return ip;
    }

    const nupnpResults = await hue.nupnpSearch();
    if (nupnpResults.length && nupnpResults[0].ipaddress) {
      debug('bridge ip found by nupnp search')
      nconf.set('hue:ip', nupnpResults[0].ipaddress);
      return nupnpResults[0].ipaddress;
    }

    const upnpResults = await hue.upnpSearch();
    if (upnpResults.length && upnpResults[0].ipaddress) {
      debug('bridge ip found by upnp search')
      nconf.set('hue:ip', upnpResults[0].ipaddress);
      return upnpResults[0].ipaddress;
    }
  }

  getUsername() {
    debug('looking up bridge username...')
    const username = nconf.get('hue:username');
    if (username) {
      debug('bridge username found in local config')
      return username;
    }
  }

  async isRegistered(ip, username) {
    debug(`checking if '${username}' is registered with '${ip}'...`)
    const api = new hue.HueApi(ip, username);
    const config = await api.config();
    return !!config.ipaddress;
  }

  async register(ip) {
    debug(`registering new user with '${ip}'...`)
    const api = new hue.HueApi();
    return await api.registerUser(ip, 'chaturbate');
  }

  async getApi() {
    const ip = await this.getBridgeIP();
    let username = this.getUsername();

    if (!username) {
      debug(`username not found in local config...`)
      username = await this.register(ip);
    }

    const isRegistered = await this.isRegistered(ip, username);
    if (!isRegistered) {
      debug(`username found in local config is not registered...`)
      username = await this.register(ip);
    }

    nconf.set('hue:username', username);

    return new hue.HueApi(ip, username);
  }

  async animate(callback) {
    const response = await this.api.lights();

    await response.lights.map(async (light) => {
      const originalState = Object.assign({}, light.state);
      const newStates = callback(originalState);

      for (let i =0; i < newStates.length; i++) {
        const config = newStates[i];
        const state = config.state || originalState;
        const delay = config.delay || 1000;

        await this.api.setLightState(light.id, state);
        await sleep(delay);
      }
    })
  }

  async start() {
    this.api = await this.getApi();
  }

  stop() {
    nconf.save((err) => {
      console.error(err);
    });
  }
}

module.exports = HueController;