/**
 * This MagicMirror² module is designed for a Bosch BME680 sensor and can display temperature/humidity/pressure/IAQ.
 * @module MMM-Bosch-BME680-sensor
 * @class Module
 * @see `README.md`
 * @author Sébastien Mazzon
 * @license MIT - @see `LICENCE.txt`
 */
"use strict";

Module.register("MMM-Bosch-BME680-sensor", {

	/**
	 * Default properties of the module
	 * @see `module.defaults`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html#defaults>
	 */
	defaults: {
		/* Display configuration */
		updateInterval: 30 * 1000,
		animationSpeed: 1000,
		decimalSymbol: ".",			// Symbol of decimal separator
		showAqiAtLevel: 0,			// Show Air Quality only if AQI is worst or equals to a level (0 to always displaying, undefined to never displaying)

		/* Driver configuration */
		mock: false,				// Use a true BME680 sensor or mock data?
		i2cAddress: 0x76,			// I²C address of BME680
		offsetTemperature: 0,		// Offset to apply to sensor temperature
		gasLimitLow: 5000,			// Bad air quality limit (value from Bosch specs)
		gasLimitHigh: 50000,		// Good air quality limit (value from Bosch specs)
	},

	/**
	 * Initializes module
	 * @see `module.start`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html#start>
	 */
	start: function () {
		// Add custom filters for Nunjucks
		this.addFilters();
		// Send config to initialize node
		this.sendSocketNotification("CONFIG", this.config);
	},

	/**
	 * Returns the title of the module
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html#getheader>
	 * @returns {string}
	 */
	getHeader: function () {
		return this.data.header || this.translate("TITLE");
	},

	/**
	 * Returns the template file used by Nunjucks
	 * @see `module.getTemplate`
	 * @returns {string} Path to Nunjucks template file
	 */
	getTemplate: function () {
		return `${this.name}.njk`;
	},

	/**
	 * Returns the data to be used in the template
	 * @see `module.getTemplateData`
	 * @returns {indoor: {temperature: float, humidity: float, pressure: float, gas_resistance: float, aqi: integer, aqi_level: float}} or {} if no data
	 */
	getTemplateData: function () {
		return {
			config: this.config,
			indoor: this.dataSensors,
		};
	},

	/**
	 * Returns the CSS files used by Nunjucks
	 * @see `module.getStyles`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html#getstyles>
	 * @returns {Array}
	 */
	getStyles: function () {
		return [`${this.name}.css`];
	},

	/**
	 * Returns the json files used for string translation
	 * @see `module.getTranslations`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html#gettranslations>
	 * @returns {Array}
	 */
	getTranslations: function () {
		return {
			en: "translations/en.json",
			fr: "translations/fr.json",
		};
	},

	/**
	 * Handles sensor data from node
	 * @see `module.socketNotificationReceived`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html?#socketnotificationreceived-function-notification-payload>
	 * @param {temperature: float, humidity: float, pressure: float, gas_resistance: float, aqi: integer, aqi_level: float} data Sensor data
	 */
	processData: function (data) {
		// Send notifications with sensor data to others modules
		this.sendNotification("INDOOR_TEMPERATURE", data.temperature);
		this.sendNotification("INDOOR_HUMIDITY", data.humidity);
		this.sendNotification("INDOOR_PRESSURE", data.pressure);
		this.sendNotification("INDOOR_GAS", data.gas_resistance);
		this.sendNotification("INDOOR_AQI_LEVEL", data.aqi_level);
		this.sendNotification("INDOOR_AQI", data.aqi);

		// Store data into module
		this.dataSensors = data;
		// Update DOM (only if module is visible)
		if (!this.hidden) {
			this.updateDom(this.config.animationSpeed);
		}
	},

	/**
	 * Called when a socket notification arrives.
	 * @see `module.socketNotificationReceived`
	 * @see <https://docs.magicmirror.builders/development/core-module-file.html?#socketnotificationreceived-function-notification-payload>
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 */
	socketNotificationReceived: function (notification, payload) {
		if (notification === "DATA") {
			// Sensor data from node
			this.processData(payload);
		}
	},

	/**
	 * Adds functions used in Nunjucks template to Nunjucks environment
	 */
	addFilters: function () {
		// roundValue1dec: rounds values to max 1 decimal and replace "-0" by "0"
		this.nunjucksEnvironment().addFilter(
			"roundValue1dec",
			function (value) {
				const roundValue = parseFloat(value).toFixed(1);
				return roundValue === "-0" ? 0 : roundValue;
			}
		);

		// decimalSymbol: replaces decimal separator by the one defined in config
		this.nunjucksEnvironment().addFilter(
			"decimalSymbol",
			function (value) {
				return value.toString().replace(/\./g, this.config.decimalSymbol);
			}.bind(this)
		);
	},

});
