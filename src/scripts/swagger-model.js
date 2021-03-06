/*
 * angular-swagger-ui
 * http://github.com/maales/angular-swagger-ui
 * Version: 0.1.0 - 2015-02-26
 * License: MIT
 */
'use strict';

angular
	.module('swaggerUi')
	.service('swaggerModel', function() {

		/**
		 * sample object cache to avoid generating the same one multiple times
		 */
		var objCache = {};

		/**
		 * model cache to avoid generating the same one multiple times
		 */
		var modelCache = {};

		/**
		 * determines a property type
		 */
		var getType = this.getType = function(item) {
			var format = item.format;
			switch (format) {
				case 'int32':
					format = item.type;
					break;
				case 'int64':
					format = 'long';
					break;
			}
			return format || item.type;
		};

		/**
		 * retrieves object class name based on definition
		 */
		function getClassName(schema) {
			return schema.$ref.replace('#/definitions/', '');
		}

		/**
		 * generates a sample object (request body or response body)
		 */
		function getSampleObj(swagger, schema) {
			var sample;
			if (schema.properties) {
				sample = {};
				for (var name in schema.properties) {
					sample[name] = getSampleObj(swagger, schema.properties[name]);
				}
			} else if (schema.$ref) {
				// complex object
				var def = swagger.definitions && swagger.definitions[getClassName(schema)];
				if (def) {
					if (!objCache[schema.$ref]) {
						// object not in cache
						objCache[schema.$ref] = getSampleObj(swagger, def);
					}
					sample = objCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				sample = [getSampleObj(swagger, schema.items)];
			} else if (schema.type === 'object') {
				sample = {};
			} else {
				sample = getSampleValue(getType(schema), schema.defaultValue || schema.example);
			}
			return sample;
		}

		/**
		 * generates a sample value for a basic type
		 */
		function getSampleValue(type, defaultValue) {
			var result;
			if (typeof defaultValue !== 'undefined') {
				result = defaultValue;
			} else {
				switch (type) {
					case 'long':
					case 'integer':
						result = 0;
						break;
					case 'boolean':
						result = false;
						break;
					case 'double':
					case 'number':
						result = 0.0;
						break;
					case 'string':
						result = 'string';
						break;
					case 'date':
						result = (new Date()).toISOString().split('T')[0];
						break;
					case 'date-time':
						result = (new Date()).toISOString();
						break;
				}
			}
			return result;
		}

		/**
		 * generates a sample JSON string (request body or response body)
		 */
		this.generateSampleJson = function(swagger, schema) {
			var json,
				obj = getSampleObj(swagger, schema);

			if (obj) {
				json = angular.toJson(obj, true);
			}
			return json;
		};

		var countInLine = 0;

		/**
		 * generates object's model
		 */
		var generateModel = this.generateModel = function(swagger, schema, modelName) {
			var model = '';

			function isRequired(item, name) {
				return item.required && item.required.indexOf(name) !== -1;
			}

			if (schema.properties) {
				modelName = modelName || ('Inline Model' + countInLine++);
				var buffer = ['<div><strong>' + modelName + ' {</strong>'],
					submodels = [];

				for (var propertyName in schema.properties) {
					var property = schema.properties[propertyName];
					buffer.push('<div class="pad"><strong>', propertyName, '</strong> (<span class="type">');
					// build type
					if (property.properties) {
						var name = 'Inline Model' + countInLine++;
						buffer.push(name);
						submodels.push(generateModel(swagger, property, name));
					} else if (property.$ref) {
						buffer.push(getClassName(property));
						submodels.push(generateModel(swagger, property));
					} else if (property.type === 'array') {
						buffer.push('Array[');
						if (property.items.properties) {
							var name = 'Inline Model' + countInLine++;
							buffer.push(name);
							submodels.push(generateModel(swagger, property, name));
						} else if (property.items.$ref) {
							buffer.push(getClassName(property.items));
							submodels.push(generateModel(swagger, property.items));
						} else {
							buffer.push(getType(property.items));
						}
						buffer.push(']');
					} else {
						buffer.push(getType(property));
					}
					buffer.push('</span>');
					// is required ?
					if (!isRequired(schema, propertyName)) {
						buffer.push(', ', '<em>optional</em>');
					}
					buffer.push(')');
					// has description
					if (property.description) {
						buffer.push(': ', property.description);
					}
					// is enum
					if (property.enum) {
						buffer.push(' = ', angular.toJson(property.enum).replace(/,/g, ' or '));
					}
					buffer.push(',</div>');
				}
				buffer.pop();
				buffer.push('</div>');
				buffer.push('<strong>}</strong>');
				buffer.push(submodels.join(''), '</div>');
				model = buffer.join('');
			} else if (schema.$ref) {
				var className = getClassName(schema),
					def = swagger.definitions && swagger.definitions[className];

				if (def) {
					if (!modelCache[schema.$ref]) {
						// cache generated object
						modelCache[schema.$ref] = generateModel(swagger, def, className);
					}
					model = modelCache[schema.$ref];
				}
			} else if (schema.type === 'array') {
				var buffer = ['<strong>Array ['];
				var sub = '';
				if (schema.items.properties) {
					var name = 'Inline Model' + countInLine++;
					buffer.push(name);
					sub = generateModel(swagger, schema.items, name);
				} else if (schema.items.$ref) {
					buffer.push(getClassName(schema.items));
					sub = generateModel(swagger, schema.items);
				} else {
					parts.push(getType(schema.items));
				}
				buffer.push(']</strong><br><br>', sub);
				model = buffer.join('');
			} else if (schema.type === 'object') {
				model = '<strong>Inline Model {<br>}</strong>';
			}
			return model;
		};

		/**
		 * clears generated models cache
		 */
		this.clearCache = function() {
			objCache = {};
			modelCache = {};
		};

	});