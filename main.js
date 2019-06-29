"use strict";

/*
 * Created with @iobroker/create-adapter v1.15.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const request = require("request");

// Load your modules here, e.g.:
// const fs = require("fs");

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
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
//		this.log.info("config option1: " + this.config.option1);
//		this.log.info("config option2: " + this.config.option2);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/

		await this.setObjectAsync("error", {
			type: "state",
			common: {
				name: "error",
				type: "string",
				role: "indicator",
				read: true,
				write: false,
			},
			native: {},
		});

		await this.setObjectAsync("port1", {
			type: "state",
			common: {
				name: "port1",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		
		await this.setObjectAsync("port2", {
			type: "state",
			common: {
				name: "port2",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectAsync("port3", {
			type: "state",
			common: {
				name: "port3",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectAsync("port4", {
			type: "state",
			common: {
				name: "port4",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});

		
		


		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates("*");

	const that = this;

	const r = request(`http://${this.config.netIoAddress}/tgi/control.tgi?login=p:${this.config.username}:${this.config.password}&port=list&quit=quit`, function (error, response, body) {
		that.log.info("E " + error + JSON.stringify(error))
		that.log.info("R " + JSON.stringify(response))
		that.log.info("B " + body);
		if (body && body.includes("BYE")) {
			const state = body.substr(6, 7).split(" ").map(x => x==1);
			for (let i=0; i<state.length; i++) {
				that.setState("port"+(i+1), state[i], true);
			}
			that.setState("error", "OK", true);
			that.setState("info.connection", true, true);
		} else {
			that.setState("error", error ? JSON.stringify(error) : body, true);
			that.setState("info.connection", false, true);
		}
	});			


	const get = function() {
	//	that.log.info("GET");
		const r = request(`http://${that.config.netIoAddress}/tgi/control.tgi?login=p:${that.config.username}:${that.config.password}&port=list&quit=quit`, function (error, response, body) {
//		const r = request(`http://192.168.2.199/tgi/control.tgi?login=p:admin:admin&port=list&quit=quit`, function (error, response, body) {
			that.log.info(body);
			const state = body.substr(6, 7).split(" ").map(x => x==1);
			for (let i=0; i<state.length; i++) {
			/*
				that.getState('netio.0.'+"port"+(i+1), function(x,y,z) {
					that.log.info(JSON.stringify(y) + y.val + "-" + state);
					if (y.val != state[i])
						that.setState("port"+(i+1), state[i], true);
				});
				*/
			
				//			that.log.info(that.getState('netio.0.'+"port"+(i+1)));
				//			if (that.getState("port"+(i+1)) != state[i])
					that.setState("port"+(i+1), state[i], true);
			}
		})
	}

	if (this.config.polling)
		this.timer = setInterval(get, this.config.pollingInterval * 1000);

		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
//		await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
//		await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
//		await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
//		let result = await this.checkPasswordAsync("admin", "iobroker");
//		this.log.info("check user admin pw ioboker: " + result);

//		result = await this.checkGroupAsync("admin", "admin");
//		this.log.info("check group user admin group admin: " + result);


	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			clearInterval(this.timer);
			this.log.info("cleaned everything up...");
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
//		this.log.info("YYY " + id + " " + JSON.stringify(obj))
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
//		this.log.info("XXX " + id + " " + JSON.stringify(state))
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			var s = ["u", "u", "u", "u"];
			var p = parseInt(id.substr(-1) - 1);
			s[p] = state.val ? "1" : "0";
			var list = s.join("");
			
			var x = request(`http://${this.config.netIoAddress}/tgi/control.tgi?login=p:${this.config.username}:${this.config.password}&port=${list}&quit=quit`, function (error, response, body) {
				//this.log.info(body);
			});			
			
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

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
