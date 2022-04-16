/* Magic Mirror
 * Module: MMM-Bosch-BME680-sensor
 *
 * By Sébastien Mazzon
 * MIT Licensed.
 */

Module.register("MMM-Bosch-BME680-sensor", {
	requiresVersion: "2.1.0", // Required version of MagicMirror

	defaults: {
		updateInterval: 3 * 1000, // 3 seconds (this short timing seems needed to have an accurate Air Quality Index)
		animationSpeed: 1000,
		decimalSymbol: ".",

		mock: false,
		i2cAddress: 0x76,
		offsetTemperature: 0,
		gasLimitLow: 5000, // Bad air quality limit (values from Bosch specs)
		gasLimitHigh: 50000, // Good air quality limit (values from Bosch specs)
	},

	start: function () {
		// Add custom filters
		this.addFilters();

		this.sendSocketNotification("CONFIG", this.config);
	},

	getTemplate: function () {
		return `${this.name}.njk`;
	},

	getStyles: function () {
		return [`${this.name}.css`];
	},

	// Load translations files
	getTranslations: function () {
		return {
			en: "translations/en.json",
			fr: "translations/fr.json"
		};
	},

	getTemplateData: function () {
		if (this.dataSensors !== undefined) {
			return { indoor: this.dataSensors };
		} else {
			return { };
		}
	},

	processData: function (data) {
		this.sendNotification("INDOOR_TEMPERATURE", data.temperature);
		this.sendNotification("INDOOR_HUMIDITY", data.humidity);
		this.sendNotification("INDOOR_PRESSURE", data.pressure);
		this.sendNotification("INDOOR_GAS", data.gas_resistance);
		this.sendNotification("INDOOR_IAQ_LEVEL", data.iaq_level);
		this.sendNotification("INDOOR_IAQ", data.iaq);

		this.dataSensors = data;
		this.updateDom(this.config.animationSpeed);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === "DATA") {
			this.processData(payload);
		}
	},

	addFilters: function () {
		this.nunjucksEnvironment().addFilter(
			"roundValue1dec",
			function (value) {
				const roundValue = parseFloat(value).toFixed(1);
				return roundValue === "-0" ? 0 : roundValue;
			}
		);

		this.nunjucksEnvironment().addFilter(
			"decimalSymbol",
			function (value) {
				return value.toString().replace(/\./g, this.config.decimalSymbol);
			}.bind(this)
		);
	},
});
