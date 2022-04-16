/* Magic Mirror
 * Node Helper: MMM-Bosch-BME680-sensor
 *
 * By Sébastien Mazzon
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const Log = require("logger");
const { Bme680 } = require("bme680-sensor");

module.exports = NodeHelper.create({

	bme680: undefined,
	isInitialized: false,

	initializeSensor: function (config) {
		if (!this.config.mock) {
			this.bme680 = new Bme680(1, this.config.i2cAddress);
			this.bme680.initialize();
			this.bme680.setTempOffset(this.config.offsetTemperature);
		}
		this.isInitialized = true;
		Log.log("BM680 initialized");
		this.scheduleUpdate(0);	
	},

	scheduleUpdate: function (delay = null) {
		let nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}
		setTimeout(() => {
			this.update()
				.finally(this.scheduleUpdate());
		}, nextLoad);
	},

	update: async function () {
		let data = {};
		if (!this.config.mock) {
			data = await this.bme680.getSensorData();
		} else {
			data.data = { temperature: 25.52, humidity: 33.3, pressure: 1000.5, gas_resistance: 30000 };
		}
		data.data.iaq = this.computeIAQ(data.data);
		data.data.iaq_level = this.getIAQLevel(data.data.iaq);
		Log.debug("Data retrieved", data);
		this.sendSocketNotification("DATA", data.data);
	},

	// from https://github.com/G6EJD/BME680-Example/blob/master/ESP32_bme680_CC_demo_03.ino
	computeIAQ: function (data) {
		const hum_weighting = 0.25; // so hum effect is 25% of the total air quality score
		const gas_weighting = 0.75; // so gas effect is 75% of the total air quality score
		let humidity_score, gas_score;

		// Calculate humidity contribution to IAQ index
		const current_humidity = data.humidity;
		const hum_reference = 40.0;
		const hum_tolerance = hum_reference * 0.05;
		if (current_humidity >= hum_reference - hum_tolerance && current_humidity <= hum_reference + hum_tolerance) { // Humidity +/-5% around optimum
			humidity_score = hum_weighting * 100;
		} else { // Humidity is sub-optimal
			if (current_humidity < hum_reference - hum_tolerance) {
				humidity_score = hum_weighting / hum_reference * current_humidity * 100;
			} else {
				humidity_score = ((-1 * hum_weighting / (100 - hum_reference) * current_humidity) + 0.416666) * 100;
			}
		}

		// Calculate gas contribution to IAQ index
		const gas_reference = data.gas_resistance;
		// values from experimentation
		const gas_lower_limit = this.config.gasLimitLow;  // Bad air quality limit
		const gas_upper_limit = this.config.gasLimitHigh; // Good air quality limit

		gas_score = (gas_weighting / (gas_upper_limit - gas_lower_limit) * gas_reference - (gas_lower_limit * (gas_weighting / (gas_upper_limit - gas_lower_limit)))) * 100.00;
		if (gas_score > 75) gas_score = 75; // Sometimes gas readings can go outside of expected scale maximum
		if (gas_score < 0) gas_score = 0;  // Sometimes gas readings can go outside of expected scale minimum

		// Combine results for the final IAQ index value (0-100% where 100% is good quality air)
		return humidity_score + gas_score;
	},

	// 0 : Good to 5 : worst
	getIAQLevel: function (iaq) {
		if (typeof iaq !== "number") {
			return undefined;
		}
		if (iaq > 90) {
			return 0; // "Good"
		} else if (iaq > 70) {
			return 1; // "Moderate"
		} else if (iaq > 65) {
			return 2; // "Unhealthy for Sensitive Groups"
		} else if (iaq > 60) {
			return 3; // "Unhealthy"
		} else if (iaq > 40) {
			return 4; // "Very Unhealthy"
		}
		return 5; // "Hazardous"
	},

	// Override socketNotificationReceived method.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "CONFIG") {
			if (!this.isInitialized) {
				this.config = payload;
				this.initializeSensor();
			} else {
				Log.info("BM680 is already initialized");
				this.update();
			}
		}
	},

});
