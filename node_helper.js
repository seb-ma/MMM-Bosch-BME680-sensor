/**
 * This MagicMirror² module is designed for a Bosch BME680 sensor and can display temperature/humidity/pressure/IAQ.
 * @module MMM-Bosch-BME680-sensor
 * @class NodeHelper
 * @see `README.md`
 * @author Sébastien Mazzon
 * @license MIT - @see `LICENCE.txt`
 */
"use strict";

const NodeHelper = require("node_helper");
const Log = require("logger");
const Bme680 = require("bme680-sensor");

module.exports = NodeHelper.create({

	/**
	 * BME680 driver
	 */
	bme680: undefined,

	/**
	 * Indicates if sensor was initialized
	 */
	isInitialized: false,

	/**
	 * Module config
	 * see `MMM-Bosch-BME680-sensor.default`
	 */
	config: {},

	/**
	 * Initializes BME680 driver
	 * @param {*} config @see `MMM-Bosch-BME680-sensor.default`
	 */
	initializeSensor: function (config) {
		if (!this.config.mock) {
			// Initialize driver
			this.bme680 = new Bme680(1, this.config.i2cAddress);
			this.bme680.initialize();
			this.bme680.setTempOffset(this.config.offsetTemperature);
		}
		this.isInitialized = true;
		Log.log("BM680 initialized");
		// Schedule data retrieving without delay
		this.scheduleUpdate(0);
	},

	/**
	 * Schedules next data retrieving
	 * @param {integer} delay delay before updating - use config.updateInterval if null
	 */
	scheduleUpdate: function (delay = null) {
		// Define delay before updating
		let nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}
		// Set timer
		setTimeout(() => {
			this.update()
				// Schedule next update
				.finally(this.scheduleUpdate());
		}, nextLoad);
	},

	/**
	 * Retrieves data from sensor and send values to module
	 */
	update: async function () {
		let data = {};
		if (!this.config.mock) {
			// Retrieve data from sensor
			data = await this.bme680.getSensorData();
		} else {
			// Mock data
			data.data = { temperature: 25.52, humidity: 33.3, pressure: 1000.5, gas_resistance: 30000 };
		}
		// Compute AQI from data
		data.data.aqi = this.computeAQI(data.data.humidity, data.data.gas_resistance);
		data.data.aqi_level = this.getAQILevel(data.data.aqi);
		// Send sensor data to module
		Log.debug("Data retrieved", data.data);
		this.sendSocketNotification("DATA", data.data);
	},

	/**
	 * Computes Air Quality Index (AQI) value based on humidity and gas resistance values
	 * Algorithm from:
	 * @see <https://github.com/G6EJD/BME680-Example/blob/master/ESP32_bme680_CC_demo_03.ino>
	 * @param {float} humidity Humidity percentage
	 * @param {float} gas_resistance Gas resistance from sensor
	 * @returns {float} Computed AQI in percent
	 */
	computeAQI: function (humidity, gas_resistance) {
		const hum_weighting = 0.25; // so hum effect is 25% of the total air quality score
		const gas_weighting = 0.75; // so gas effect is 75% of the total air quality score
		let humidity_score, gas_score;

		// Calculate humidity contribution to AQI
		const hum_reference = 40.0;
		const hum_tolerance = hum_reference * 0.05;
		if (humidity >= hum_reference - hum_tolerance && humidity <= hum_reference + hum_tolerance) { // Humidity +/-5% around optimum
			humidity_score = hum_weighting * 100;
		} else { // Humidity is sub-optimal
			if (humidity < hum_reference - hum_tolerance) {
				humidity_score = hum_weighting / hum_reference * humidity * 100;
			} else {
				humidity_score = ((-1 * hum_weighting / (100 - hum_reference) * humidity) + 0.416666) * 100;
			}
		}

		// Calculate gas contribution to AQI
		const gas_lower_limit = this.config.gasLimitLow;  // Bad air quality limit
		const gas_upper_limit = this.config.gasLimitHigh; // Good air quality limit

		gas_score = (gas_weighting / (gas_upper_limit - gas_lower_limit) * gas_resistance - (gas_lower_limit * (gas_weighting / (gas_upper_limit - gas_lower_limit)))) * 100.00;
		if (gas_score > 75) gas_score = 75; // Sometimes gas readings can go outside of expected scale maximum
		if (gas_score < 0) gas_score = 0;  // Sometimes gas readings can go outside of expected scale minimum

		// Combine results for the final AQI value (0-100% where 100% is good quality air)
		return humidity_score + gas_score;
	},

	/**
	 * Converts AQI value to level (from 0=Good to 5=Hazardous)
	 * @param {float} aqi AQI percentage (@see computeAQI for value)
	 * @returns {integer} AQI level from 0 (Best) to 5 (Worst)
	 */
	getAQILevel: function (aqi) {
		if (typeof aqi !== "number") {
			return undefined;
		}
		if (aqi > 90) {
			return 0; // "Good"
		} else if (aqi > 70) {
			return 1; // "Moderate"
		} else if (aqi > 65) {
			return 2; // "Unhealthy for Sensitive Groups"
		} else if (aqi > 60) {
			return 3; // "Unhealthy"
		} else if (aqi > 40) {
			return 4; // "Very Unhealthy"
		}
		return 5; // "Hazardous"
	},

	/**
	 * This method is called when a socket notification arrives.
	 * @see `node_helper.socketNotificationReceived`
	 * @see <https://docs.magicmirror.builders/development/node-helper.html#socketnotificationreceived-function-notification-payload>
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 */
	socketNotificationReceived: function (notification, payload) {
		if (notification === "CONFIG") {
			// Sent by module at initialization - payload contains module config
			if (!this.isInitialized) {
				// Initialize sensor
				this.config = payload;
				this.initializeSensor();
			} else {
				// Sensor already initialized - only retrieve data
				Log.info("BM680 is already initialized");
				this.update();
			}
		}
	},

});
