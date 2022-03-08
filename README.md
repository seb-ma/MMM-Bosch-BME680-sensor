# MMM-Bosch-BME680-sensor

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

It is designed for a Bosch BME680 sensor and retrieve:
- temperature
- humidity
- pressure
- IAQ

It sends notifications that can be handled by other modules and/or have its own display:

![sample](images/sample.png)

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
	modules: [
		{
			module: 'MMM-Bosch-BME680-sensor',
			config: {
				updateInterval: 60 * 1000, // 1 minute
				decimalSymbol: ".",

				mock: false,
				i2cAddress: 0x76,
				offsetTemperature: 0,
			}
		},
	]
}
```

## Installation

```sh
cd ~/MagicMirror/modules # Change path to modules directory of to your actual MagiMirror² installation
git clone https://github.com/seb-ma/MMM-Bosch-BME680-sensor
cd MMM-Bosch-BME680-sensor
npm install --only=production
```

## Configuration options

To only have notifications sent (no display), don't set `position` for the module.

| Option              | Description
|-------------------- |-------------
| `updateInterval`    | *Optional* How often does the data needs to be retrieved? <br><br>**Type:** `int`(milliseconds) <br>Default: 60000 milliseconds (1 minute)
| `animationSpeed`    | *Optional* Speed of the update animation. (Milliseconds) <br><br>**Type:** `int`(milliseconds) <br>Default: 1000 milliseconds (1 second)
| `decimalSymbol`     | *Optional* Decimal separator <br><br>**Type:** `string` (`.` or `,`) <br>Default: "."
| `offsetTemperature` | *Optional* Temperature offset to apply (usefull if sensor is near a processor) <br><br>**Type:** `float`(degree celsius) <br>Default: 0 degree
| `i2cAddress`        | *Optional* i²c address of BME680 sensor <br><br>**Type:** `int`(hexadecimal value) <br>Default: 0x76
| `mock`              | *Optional* `true` to retrieve false data if no BME680 is plugged <br><br>**Type:** `boolean` <br>Default: `false`

## Sent notifications

When  data are retrieved, notifications are sent to other modules with payload containing related value:
- `INDOOR_TEMPERATURE`
	- payload: value of temperature in celcius
- `INDOOR_HUMIDITY`
	- payload: value of humidity in percentage
- `INDOOR_PRESSURE`
	- payload: value of pressure in hecto pascal
- `INDOOR_GAS`
	- payload: value of gas resistance in ohm
- `INDOOR_IAQ_LEVEL`
	- payload: level of Air Quality from 0 to 5
	- 0=Good, 1=Moderate, 2=Unhealthy for Sensitive Groups, 3=Unhealthy, 4=Very Unhealthy, 5=Hazardous
- `INDOOR_IAQ`
	- payload: value of Air Quality in percentage (100% = max healthy)
