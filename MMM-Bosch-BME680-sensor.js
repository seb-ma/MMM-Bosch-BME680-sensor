/* Magic Mirror
 * Module: MMM-Bosch-BME680-sensor
 *
 * By Sébastien Mazzon
 * MIT Licensed.
 */

Module.register("MMM-Bosch-BME680-sensor", {
	requiresVersion: "2.1.0", // Required version of MagicMirror

	defaults: {
		updateInterval: 60 * 1000, // 1 minute
		animationSpeed: 1000,
		decimalSymbol: ".",
		offsetTemperature: 0,

		i2cAddress: 0x76,
		mock: false,
	},

	start: function () {
		// Add custom filters
		this.addFilters();

		this.sendSocketNotification("CONFIG", this.config);
	},

	getTemplate() {
		return `${this.name}.njk`;
	},

	getStyles() {
		return [`${this.name}.css`];
	},

	// Load translations files
	getTranslations: function() {
		return {
			en: "translations/en.json",
			fr: "translations/fr.json"
		};
	},

	getTemplateData: function () {
		if (this.dataSensors !== undefined) {
			return {indoor: this.dataSensors};
		} else {
			return {nodata: true};
		}
	},

	processData: async function(data) {
		this.sendNotification("INDOOR_TEMPERATURE", data.temperature);
		this.sendNotification("INDOOR_HUMIDITY", data.humidity);
		this.sendNotification("INDOOR_PRESSURE", data.pressure);
		this.sendNotification("INDOOR_GAS", data.gas_resistance);
		this.sendNotification("INDOOR_IAQ_LEVEL", data.iaq_level);
		this.sendNotification("INDOOR_IAQ", data.iaq);

		this.dataSensors = data;
		this.updateDom(self.config.animationSpeed);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if(notification === "DATA") {
			this.processData(payload);
		}
	},

	addFilters() {
		this.nunjucksEnvironment().addFilter(
			"roundValue",
			function (value) {
				const roundValue = parseFloat(value).toFixed(0);
				return roundValue === "-0" ? 0 : roundValue;
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"decimalSymbol",
			function (value) {
				return value.toString().replace(/\./g, this.config.decimalSymbol);
			}.bind(this)
		);
	},
});
