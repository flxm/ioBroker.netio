"use strict";

/*
 * Created with @iobroker/create-adapter v1.15.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const request = require("request");

class Netio extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "netio",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);

		await this.setObjectAsync("info.name", {
			type: "state",
			common: {
				name: "name",
				type: "string",
				role: "info.name",
				read: true,
				write: true,
			},
			native: {},
		});

		for (let p=1; p<=this.config.numPorts; p++) {
			await this.setObjectAsync("port" + p, {
				type: "state",
				common: {
					name: "port" + p,
					type: "boolean",
					role: "switch.power",
					read: true,
					write: true,
				},
				native: {},
			});
		}
		
		this.state = Array(this.config.numPorts).fill();
		
		this.connected = false;
		
		this.setState("info.name", this.config.deviceName, true);
		
		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates("*");

		const that = this;

		const requestState = function() {
			// request port states from device
			const url = `http://${that.config.netIoAddress}:${that.config.netIoPort}/tgi/control.tgi?login=p:${that.config.username}:${that.config.password}&port=list&quit=quit`; 
			request(url, function (error, response, body) {
				// that.log.info("E " + error + JSON.stringify(error))
				// that.log.info("R " + JSON.stringify(response))
				// that.log.info("B " + body);
				if (that.state && body && body.includes("BYE")) {
					const state = body.substr(6, 2*that.config.numPorts-1)
							.split(" ")
							.map(x => x==1);
					for (let i=0; i<state.length; i++) {
						if (state[i] !== that.state[i]) {
							that.setState("port"+(i+1), state[i], true);
							that.state[i] = state[i];
						}
					}
					if (!that.connected) {
						that.connected = true;
						that.setState("info.connection", true, true);
					}
				} else {
					that.log.error(JSON.stringify(error));
					if (that.connected) {
						that.connected = false;
						that.setState("info.connection", false, true);
					}
				}
			});
		};

		requestState();

		this.timer = null;
		if (this.config.polling)
			this.timer = setInterval(requestState, this.config.pollingInterval * 1000);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// cancel timer
			// @ts-ignore
			clearInterval(this.timer);
			
			this.log.info("cleaned everything up ...");
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		// this.log.info("YYY " + id + " " + JSON.stringify(obj))
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		// this.log.info("XXX " + id + " " + JSON.stringify(state))
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			if (id.includes("port")) {
				const s = Array(this.config.numPorts).fill("u");

				const index = parseInt(id.substr(-1)) - 1;
				s[index] = state.val ? "1" : "0";
				const list = s.join("");
				
				const that = this;
				
				const url = `http://${this.config.netIoAddress}:${this.config.netIoPort}/tgi/control.tgi?login=p:${this.config.username}:${this.config.password}&port=${list}&port=list&quit=quit`;
				request(url, function (error, response, body) {
					if (that.state && body && body.includes("OK")) {
						const state = body.substr(13, 2*that.config.numPorts-1)
								.split(" ")
								.map(x => x==1);
						for (let i=0; i<state.length; i++) {
							if (state[i] !== that.state[i]) {
								that.setState("port"+(i+1), state[i], true);
								that.state[i] = state[i];
							}
						}
						if (!that.connected) {
							that.connected = true;
							that.setState("info.connection", true, true);
						}
					} else {
						that.log.error(JSON.stringify(error));
						if (that.connected) {
							that.connected = false;
							that.setState("info.connection", false, true);
						}
					}
				});
			}
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Netio(options);
} else {
	// otherwise start the instance directly
	new Netio();
}
