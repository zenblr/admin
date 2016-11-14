
/**
 * Timeli Javascript SDK.
 *
 * Dependencies: jQuery
 *
 * All callbacks are of the delegate function(error, data, {next: function(cb), previous: function(cb)}).
 * Changing default paging values is done at the member level before making queries. For example,
 *
 *  SDK.Aggregation.since('2014-01-01').limit(10).get(cb);
 *
 * changes all future aggregation queries to include the since and limit specified. It will not change eg. SDK.Asset queries.
 *
 * (c) 2015 timeli.io, All rights reserved
 *
 */
(function () {
	window.APP = window.APP || {};
	APP.SDK = APP.SDK || {};
	var SDK = APP.SDK,
			Format = {
				ISO: "Y-m-d\\TH:i:sP",
				ISOmilli: "Y-m-d\\TH:i:s.uP"
			},
			messages = {
				an_error_occurred: "Error!",
				errors: {
					not_implemented: "Not implemented",
					not_initialized: "You must call APP.SDK.init($,cfg) with jQuery and a configuration object.",
					invalid_measurement_type: "Invalid measurement type \"{type}\"",
					invalid_measurement_source: "Invalid measurement source \"{source}\".",
					invalid_label_behavior: "Invalid label behavior \"{value}\".",
					invalid_argument_number: "{method} cannot be called with {number} arguments.",
					invalid_agent_status: "Invalid agent status \"{status}\".",
					invalid_uuid: "Invalid UUID \"{value}\"",
					invalid_date: "Invalid date format \"{value}\".",
					invalid_float: "Invalid floating point value \"{value}\".",
					invalid_callback: "Callback must be a function.",
					missing_aggregation_start_time: "Measurement.get requires a start time for an aggregation.",
					unexpected_parameters: "Unexpected parameters sent to {method}."
				},
				warnings: {
					already_initialized: "WARNING: Already initialized, duplicate initialization attempt.  Initialization cannot be performed twice."
				}
			},
			addPaging = function(item) {
				item.since = item.since || function(date) {
					this.paging = this.paging || {};
					this.paging.since = formatDate(Format.ISOmilli, date.getTime ? (date.getTime() / 1000) : date);
					return this;
				}
				item.until = item.until || function(date) {
					this.paging = this.paging || {};
					this.paging.until = formatDate(Format.ISOmilli, date.getTime ? (date.getTime() / 1000) : date);
					return this;
				}
				item.page = item.page || function(page) {
					this.paging = this.paging || {};
					this.paging.page = page;
					return this;
				}
				item.limit = item.limit || function(limit) {
					this.paging = this.paging || {};
					this.paging.limit = limit;
					return this;
				}
				for (var j in item) {
					if (typeof item[j] != "function" && j[0] != j[0].toLowerCase()) {
						var hasOnlyProps = true;
						for (var k in item[j]) {
							hasOnlyProps &= typeof item[j][k] != "function";
						}
						if (!hasOnlyProps) {
							addPaging(item[j]);
						}
					}
				}
			},
			methods = {
				GET: "GET",
				POST: "POST",
				PUT: "PUT",
				DELETE: "DELETE"
			},
			extensions = {},
			contentType = "application/json",
			cfg = {},
			endpoint = null,
			error = function(key, values) {
				var message = messages.errors[key];
				values = values || {};
				for (var k in values) {
					message = message.replace("{" + k + "}", values[k]);
				}
				throw new Error(message);
			},
			formatDate = function (format, timestamp) {
				//adapted from phpjs date at https://raw.github.com/kvz/phpjs/master/functions/datetime/date.js
				var that = this, jsdate, f,
						txt_words = [
							'Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur',
							'January', 'February', 'March', 'April', 'May', 'June',
							'July', 'August', 'September', 'October', 'November', 'December'
						],
						formatChr = /\\?(.?)/gi,
						formatChrCb = function (t, s) {
							return f[t] ? f[t]() : s;
						},
						_pad = function (n, c) {
							n = String(n);
							while (n.length < c) {
								n = '0' + n;
							}
							return n;
						};
				f = {
					// Day
					d: function () { // Day of month w/leading 0; 01..31
						return _pad(f.j(), 2);
					},
					D: function () { // Shorthand day name; Mon...Sun
						return f.l()
								.slice(0, 3);
					},
					j: function () { // Day of month; 1..31
						return jsdate.getDate();
					},
					l: function () { // Full day name; Monday...Sunday
						return txt_words[f.w()] + 'day';
					},
					N: function () { // ISO-8601 day of week; 1[Mon]..7[Sun]
						return f.w() || 7;
					},
					S: function () { // Ordinal suffix for day of month; st, nd, rd, th
						var j = f.j();
						var i = j % 10;
						if (i <= 3 && parseInt((j % 100) / 10, 10) == 1) {
							i = 0;
						}
						return ['st', 'nd', 'rd'][i - 1] || 'th';
					},
					w: function () { // Day of week; 0[Sun]..6[Sat]
						return jsdate.getDay();
					},
					z: function () { // Day of year; 0..365
						var a = new Date(f.Y(), f.n() - 1, f.j());
						var b = new Date(f.Y(), 0, 1);
						return Math.round((a - b) / 864e5);
					},

					// Week
					W: function () { // ISO-8601 week number
						var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3);
						var b = new Date(a.getFullYear(), 0, 4);
						return _pad(1 + Math.round((a - b) / 864e5 / 7), 2);
					},

					// Month
					F: function () { // Full month name; January...December
						return txt_words[6 + f.n()];
					},
					m: function () { // Month w/leading 0; 01...12
						return _pad(f.n(), 2);
					},
					M: function () { // Shorthand month name; Jan...Dec
						return f.F()
								.slice(0, 3);
					},
					n: function () { // Month; 1...12
						return jsdate.getMonth() + 1;
					},
					t: function () { // Days in month; 28...31
						return (new Date(f.Y(), f.n(), 0))
								.getDate();
					},

					// Year
					L: function () { // Is leap year?; 0 or 1
						var j = f.Y();
						return j % 4 === 0 & j % 100 !== 0 | j % 400 === 0;
					},
					o: function () { // ISO-8601 year
						var n = f.n();
						var W = f.W();
						var Y = f.Y();
						return Y + (n === 12 && W < 9 ? 1 : n === 1 && W > 9 ? -1 : 0);
					},
					Y: function () { // Full year; e.g. 1980...2010
						return jsdate.getFullYear();
					},
					y: function () { // Last two digits of year; 00...99
						return f.Y()
								.toString()
								.slice(-2);
					},

					// Time
					a: function () { // am or pm
						return jsdate.getHours() > 11 ? 'pm' : 'am';
					},
					A: function () { // AM or PM
						return f.a()
								.toUpperCase();
					},
					B: function () { // Swatch Internet time; 000..999
						var H = jsdate.getUTCHours() * 36e2;
						// Hours
						var i = jsdate.getUTCMinutes() * 60;
						// Minutes
						var s = jsdate.getUTCSeconds(); // Seconds
						return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
					},
					g: function () { // 12-Hours; 1..12
						return f.G() % 12 || 12;
					},
					G: function () { // 24-Hours; 0..23
						return jsdate.getHours();
					},
					h: function () { // 12-Hours w/leading 0; 01..12
						return _pad(f.g(), 2);
					},
					H: function () { // 24-Hours w/leading 0; 00..23
						return _pad(f.G(), 2);
					},
					i: function () { // Minutes w/leading 0; 00..59
						return _pad(jsdate.getMinutes(), 2);
					},
					s: function () { // Seconds w/leading 0; 00..59
						return _pad(jsdate.getSeconds(), 2);
					},
					u: function () { // Microseconds; 000000-999000
						return _pad(jsdate.getMilliseconds() * 1000, 6);
					},

					// Timezone
					e: function () { // Timezone identifier; e.g. Atlantic/Azores, ...
						// The following works, but requires inclusion of the very large
						// timezone_abbreviations_list() function.
						/*              return that.date_default_timezone_get();
						 */
						throw 'Not supported (see source code of date() for timezone on how to add support)';
					},
					I: function () { // DST observed?; 0 or 1
						// Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
						// If they are not equal, then DST is observed.
						var a = new Date(f.Y(), 0);
						// Jan 1
						var c = Date.UTC(f.Y(), 0);
						// Jan 1 UTC
						var b = new Date(f.Y(), 6);
						// Jul 1
						var d = Date.UTC(f.Y(), 6); // Jul 1 UTC
						return ((a - c) !== (b - d)) ? 1 : 0;
					},
					O: function () { // Difference to GMT in hour format; e.g. +0200
						var tzo = jsdate.getTimezoneOffset();
						var a = Math.abs(tzo);
						return (tzo > 0 ? '-' : '+') + _pad(Math.floor(a / 60) * 100 + a % 60, 4);
					},
					P: function () { // Difference to GMT w/colon; e.g. +02:00
						var O = f.O();
						return (O.substr(0, 3) + ':' + O.substr(3, 2));
					},
					T: function () {
						return 'UTC';
					},
					Z: function () { // Timezone offset in seconds (-43200...50400)
						return -jsdate.getTimezoneOffset() * 60;
					},

					// Full Date/Time
					c: function () { // ISO-8601 date.
						return 'Y-m-d\\TH:i:sP'.replace(formatChr, formatChrCb);
					},
					r: function () { // RFC 2822
						return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
					},
					U: function () { // Seconds since UNIX epoch
						return jsdate / 1000 | 0;
					}
				};
				this.date = function (format, timestamp) {
					that = this;
					jsdate = (timestamp === undefined ? new Date() : // Not provided
							(timestamp instanceof Date || typeof timestamp == "string") ? new Date(timestamp) : // JS Date()
									new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
							);
					return format.replace(formatChr, formatChrCb);
				};
				return this.date(format, timestamp);
			},
			log = function () {
				window.console && console.log && console.log.apply(console, arguments);
			},
			checkInit = function () {
				error("not_initialized");
			},
			setConfig = function (config) {
				cfg = config;
				endpoint = cfg.domain + (cfg.port == 80 ? "" : ":" + cfg.port) + "/rest";
			},
			uniqueId = function () {
				return Math.round(new Date().getTime() + (Math.random() * 1000));
			},
			isUUID = function(value) {
				return value && !!(value + "").match(/([a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}?)/ig);
			},
			getJsonStyle = function() {
				return "json" + (!!cfg.jsonp ? "p" : "");
			},
			getUrl = function (ctx) {
				return "http" + (cfg.https ? "s" : "") + "://" + endpoint + "/" + ctx;
			},
			doPost = function (ctx, vars, lcfg, cb) {
				vars = cfg.jsonp ? $.extend(vars, {"_method": methods.POST}) : vars;
				lcfg = $.extend({type: methods.POST}, lcfg);
				doRequest.call(this, lcfg, ctx, vars, cb);
			},
			doPut = function (ctx, vars, lcfg, drill, cb) {
				if ($.isFunction(drill)) {
					cb = drill;
				}
				else {
					lcfg.drill = drill;
				}
				lcfg = $.extend({type: methods.PUT}, lcfg);
				vars = cfg.jsonp ? $.extend(vars, {"_method": methods.PUT}) : vars;
				doRequest.call(this, lcfg, ctx, vars, cb);
			},
			doGet = function (ctx, vars, drill, cb) {
				var lcfg = {type: methods.GET, contentType: contentType};
				if ($.isFunction(drill)) {
					cb = drill;
				}
				else {
					lcfg.drill = drill;
				}
				vars = !!cfg.client_token ? $.extend(vars, {access_token: cfg.client_token}) : vars;
				doRequest.call(this, lcfg, ctx, vars, cb);
			},
			doDelete = function (ctx, vars, cb) {
				vars = cfg.jsonp ? $.extend(vars, {"_method": methods.DELETE}) : vars;
				doRequest.call(this, {type: methods.DELETE}, ctx, vars, cb);
			},
			doRequest = function (lcfg, ctx, vars, cb) {
				checkInit();
				if ($.isPlainObject(vars)) {
					vars = $.extend(vars, this.paging);
				}
				else if (!vars && this.paging) {
					vars = this.paging;
				}
				handleRequest.call(this, lcfg, getUrl(ctx), vars, cb);
			},
			handleRequest = function(lcfg, url, vars, cb) {
				var ctx = this,
						success = function (data) {
							var paging = getPaging.call(ctx, data, lcfg);
							if (lcfg.drill && data) {
								$(lcfg.drill).each(function (i, item) {
									data = data[item];
								});
							}
							cb && cb.call(ctx, null, data, paging);
						},
						error = function (error) {
							log(messages.an_error_occurred, error, {message: error.responseText, code: error.status});
							var ex = $.extend(!!error.responseJSON ? error.responseJSON : {message: error.responseText},
									{code: error.status});
							cb && cb.call(ctx, ex, [], {});
						};
				$.ajax($.extend(true, lcfg, {
							url: url,
							async: !cfg.jsonp,
							data: vars,
							dataType: getJsonStyle(),
							crossDomain: true,
							username: cfg.username,
							password: cfg.password,
							xhrFields: {
								withCredentials: true
							},
							complete: function(res, status) {
								if (res.status < 400) {
									success.call(this, res.responseJSON ? res.responseJSON : (
											res.responseText == "" ? "" : eval("(" + res.responseText + ")")));
								}
								else {
									error.call(this, res);
								}
							}
						},
						!!cfg.jsonp ? {} : {headers: {
													Accept : "application/json; charset=utf-8"
												}
											},
						!!cfg.client_token ? {headers: {
												Authorization : "Bearer " + cfg.client_token
												}
											} : {}
						));
			},
			getPaging = function(data, lcfg) {
				var ctx = this;
				return data && data.paging ? {
					next: function(cb) {
						data.paging.next && handleRequest.call(ctx, lcfg, data.paging.next, null, cb);
					},
					previous: function(cb) {
						data.paging.previous && handleRequest.call(ctx, lcfg, data.paging.previous, null, cb);
					}
				} : {};
			},
			CSV = function(text) {
				this.result = {};
				this.headers = [];
				this.length = 0;
				var self = this;
				(function(text) {
					var delimiter = ",",
							pattern = new RegExp(
									"(\\" + delimiter + "|\\r?\\n|\\r|^)(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\"\\" + delimiter + "\\r\\n]*))", "gi"
							),
							quotePattern = new RegExp("\"\"", "g"),
							matches = null,
							isRowEnd = function(matches) {
								return matches[1].length && matches[1] != delimiter;
							},
							getValue = function(matches) {
								if (matches[2]) {
									return matches[2].replace(quotePattern, "\"");
								}
								else if (matches[3]) {
									return matches[3];
								}
							},
							row = 0,
							col = 0;

					while (matches = pattern.exec(text)) {
						var value = getValue(matches),
								rowEnd = isRowEnd(matches);
						if (row == 0 && !rowEnd) {
							self.result[value] = [];
							self.headers.push(value);
						}
						else {
							if (rowEnd) {
								row ++;
								col = 0;
							}
							self.result[self.headers[col]].push(value);
							col++;
						}
					}
					self.length = self.result[self.headers[0]].length;
				})(text);
			},
			readSetResponse = function (error, results, cb) {
				var result = [];
				$(results).each(function (i, item) {
					result.push(item.value);
				});
				cb.call(this, error, result)
			},
			Validation = {
				ensureMeasurementType: function(value) {
					if (!APP.SDK.Validation.isMeasurementType(value)) {
						error("invalid_measurement_type", {type: value});
					}
					return value;
				},
				ensureMeasurementSource: function(value) {
					if (!APP.SDK.Validation.isMeasurementSource(value)) {
						error("invalid_measurement_source", {source: value});
					}
					return value;
				}
			},
			changeAgentStatus = function(id, status, cb) {
				if (!APP.SDK.Validation.isAgentStatus(status)) {
					error("invalid_agent_status", {status: status});
				}
				doPut("agent/" + id + "/" + status, null, null, cb);
			},
			isValid = function(value, enumeration) {
				return value && enumeration[value];
			},
			isBlank = function(str) {
				return (!str || /^\s*$/.test(str));
			},
			UUID = {
				empty: "00000000-0000-0000-0000-000000000000",
				ensureUUID: function(id) {
					if (isBlank(id) || !isUUID(id)) {
						id = UUID.empty;
					}
					return id;
				}
			},
			LabelType = {
				add: function(name, description, scope, cb) {
					var vars = {name: name};
					if ($.isFunction(description)) {
						cb = description;
					}
					else {
						vars.description = description;
					}
					doPost("label/" + scope, vars, null, cb);
				},
				delete: function(id, scope, cb) {
					doDelete("label/" + scope + "/" + id, null, cb);
				},
				get: function(idOrQuery, scope, cb) {
					var path = "label/" + scope,
							vars = {},
							drill = ["labeltype"];
					if ($.isFunction(idOrQuery)) {
						cb = idOrQuery;
						path += "/all"
					}
					else if (isUUID(idOrQuery)) {
						path += "/" + idOrQuery;
						drill = null;
					}
					else {
						path += "/find";
						vars.query = idOrQuery;
					}
					doGet(path, vars, drill, cb);
				},
				getLabels: function(id, scope, cb) {
					if ($.isFunction(id)) {
						cb = id;
						id = null;
					}
					doGet("label/" + scope +"/" + UUID.ensureUUID(id) + "/labels", null, ["label"], cb);
				}
			};

	if (!extensions.val) {
		extensions.val = true;
		(function(){
			var _val = $.fn.val;
			$.fn.extend({
				val: function(value) {
					var inputs = this.length && this[0].tagName == "UL" ? this.find("input") : [];
					if (inputs.length) {
						var self = this;
						if (value) {
							if (!(value instanceof Array)) {
								value = [value];
							}

							$(inputs).each(function(i, inp) {
								var $inp = $(inp);
								if ($inp.parents("ul")[0] == self[0]) {
									$inp[0].checked = $.inArray($inp.val(), value) >=0 || $.inArray($inp.data("id"), value) >=0;
								}
							});
						} else {
							var result = [];
							this.find("input:checked").each(function() {
								if ($(this).parents("ul")[0] == self[0]) {
									result.push($(this).data("id") || this.value);
								}
							});
							return result;
						}
					}
					else {
						return _val.apply(this, arguments);
					}
				}
			});
		})();
	}

	if (!extensions.ajax) {
		extensions.ajax = true;
		var _ajax = $.ajax;
		$.extend({
			ajax: function(url, config) {
				//placeholder for injecting token
				return _ajax(url, config);
			}
		});
	}

	window.APP.SDK = {
		Agent: {
			/**
			 * Delete an agent by its id
			 *
			 * @param id
			 * @param cb
			 */
			delete: function(id, cb) {
				doDelete("agent/" + id, null, cb);
			},
			/**
			 * Disable an agent
			 *
			 * @param id
			 * @param cb
			 */
			disable: function(id, cb) {
				changeAgentStatus(id, APP.SDK.AgentStatus.disable, cb);
			},
			/**
			 * Enable an agent
			 *
			 * @param id
			 * @param cb
			 */
			enable: function(id, cb) {
				changeAgentStatus(id, APP.SDK.AgentStatus.enable, cb);
			},
			/**
			 * Get an agent by its id
			 * or all agents by their disposition (local or remote)
			 *
			 * @param idOrAgentDisposition
			 * @param cb
			 */
			get: function(idOrAgentDisposition, cb) {
				var path = "agent/",
						drill = [];
				if (APP.SDK.Validation.isAgentDisposition(idOrAgentDisposition)) {
					path += idOrAgentDisposition + "/all";
					drill = ["agent"];
				}
				else {
					path += idOrAgentDisposition;
				}
				doGet(path, null, drill, cb);
			},
			/**
			 * Halt an agent
			 *
			 * @param id
			 * @param cb
			 */
			halt: function(id, cb) {
				changeAgentStatus(id, APP.SDK.AgentStatus.halt, cb);
			},
			/**
			 * Change an agent's name or description.  Description is optional
			 *
			 * @param id
			 * @param name
			 * @param description
			 * @param cb
			 */
			update: function(id, name, description, cb) {
				var vars = {name: name};
				if ($.isFunction(description)) {
					cb = description;
					description = null;
				}
				if (description) {
					vars.description = description;
				}
				doPut("agent/" + id, vars, null, cb);
			},
			/**
			 * Start an agent
			 *
			 * @param id
			 * @param cb
			 */
			start: function(id, cb) {
				changeAgentStatus(id, APP.SDK.AgentStatus.start, cb);
			},
			/**
			 * Stop an agent
			 *
			 * @param id
			 * @param cb
			 */
			stop: function(id, cb) {
				changeAgentStatus(id, APP.SDK.AgentStatus.stop, cb);
			},
			Status: {
				/**
				 * Get an agent's status by id or get the status of all available agents
				 * id is optional
				 *
				 * @param id
				 * @param cb
				 */
				get: function(id, cb) {
					if ($.isFunction(id)) {
						doGet("agent/statuses", null, ["status"], id);
					}
					else {
						doGet("agent/" + id + "/status", null, null, cb);
					}
				}
			}
		},
		AgentDisposition: {
			local: "local",
			remote: "remote"
		},
		AgentStatus: {
			enable: "enable",
			disable: "disable",
			start: "start",
			stop: "stop",
			halt: "halt"
		},
		Aggregables: {
			/**
			 * Gets an aggregable (asset, label, or label group) by its id
			 *
			 * @param id
			 * @param cb
			 */
			get: function(id, cb) {
				doGet.call(this, "aggregable/" + id, null, cb);
			},
			/**
			 * Finds all aggregables (assets, labels, or label groups) with a name containing the search parameter
			 *
			 * @param search
			 * @param cb
			 */
			find: function(search, cb) {
				if (!search) {
					cb(null, []);
				}
				doGet.call(this, "aggregable/find", {query: search}, ["aggregable"], cb);
			},
			copyChannels: function(key, typefrom, from, typeto, to, cb) {
				if (!APP.SDK.Validation.isUUID(from)) {
					error("invalid_UUID", {"value": from});
				}
				if (!APP.SDK.Validation.isUUID(to)) {
					error("invalid_UUID", {"value": to});
				}
				doPut.call(this, "aggregable/" + typefrom + "/" + typeto + "/channels/copy", {key: key, from: from, to: to}, null, cb);
			}
		},
		Aggregation: {
			Context: {
				/**
				 * Gets creation context for the aggregation, a response of the format {channels:[], functions:[], units:[]}
				 *
				 * @param entityType
				 * @param entityId
				 * @param cb
				 */
				get: function(entityType, entityId, cb) {
					doGet.call(this, "aggregation/creation-context/" + entityType + "/" + entityId, null, [], cb);
				}
			},
			/**
			 * Adds an aggregation. timeZone, unit and customMeasures are optional. NOTE: asset type aggregations ignore timeZone specified
			 * in favor of the asset's timeZone
			 *
			 * @param entityType
			 * @param entityId
			 * @param channel           a blueprint key and a channel key separated by a space
			 * @param bucketSize        an SDK.Aggregation.BucketSize
			 * @param description
			 * @param timespan          an SDK.Timespan
			 * @param timeZone          a time zone id like those retrieved from SDK.Timezones.get(..)
			 * @param unit              a fully qualified unit key
			 * @param customMeasures    a list of valid custom measure keys. eg. percentiles might be ["P25,P50,P75,P99", "THOUSANDTHS"]
			 * @param cb
			 */
			add: function(entityType, entityId, channel, bucketSize, description, timespan, customMeasures, timeZone, unit, cb) {
				var vars = {
					channel: channel,
					function: bucketSize,
					description: description,
					startDate: timespan.start,
					endDate: timespan.end
				};
				if ($.isFunction(customMeasures)) {
					cb = customMeasures;
				}
				else {
					vars.customMeasures = customMeasures;
					if ($.isFunction(timeZone)) {
						cb = timeZone;
					}
					else {
						vars.timeZone = timeZone;
						if ($.isFunction(unit)) {
							cb = unit;
						}
						else {
							vars.unit = unit;
						}
					}
				}
				doPost.call(this, "aggregation/for/" + entityType + "/" + entityId, vars, null, cb );
			},
			/**
			 * Get all aggregations, an aggregation for an entity type (asset or label),
			 * or all aggregations for an entity.
			 *
			 * entityType and entityId are optional.
			 *
			 * @param entityType
			 * @param entityId
			 * @param cb
			 */
			get: function (entityType, entityId, cb) {
				if ($.isFunction(entityType)) {
					doGet.call(this, "aggregation/all", null, ["aggregation"], entityType);
				}
				else if ($.isFunction(entityId)) {
					doGet.call(this, "aggregation/" + entityType, null, [], entityId);
				}
				else if (APP.SDK.Validation.isEntityType(entityType)) {
					doGet.call(this, "aggregation/for/" + entityType + "/" + entityId, null, ["aggregation"], cb);
				}
				else {
					error("unexpected_parameters", {"method": "Aggregation.get"});
				}
			},
			/**
			 * Removes an aggregation by its id, or removes all aggregations for an entity type and id
			 *
			 * @param entityType
			 * @param entityId
			 * @param cb
			 */
			remove: function(entityType, entityId, cb) {
				if ($.isFunction(entityId)) {
					doDelete.call(this, "aggregation/" + entityType, null, entityId);
				}
				else {
					doDelete.call(this, "aggregation/for/" + entityType + "/" + entityId, null, cb);
				}
			}
		},
		Asset: {
			/**
			 * Adds an asset with the given name and timezone.
			 * Optionally include a description in cfg.
			 *
			 * @param name
			 * @param timezone
			 * @param cfg
			 * @param cb
			 */
			add: function (name, timezone, cfg, cb) {
				cfg = cfg || {};
				doPost.call(this, "asset", {
							name: name,
							description: cfg.description,
							timeZone: timezone
						}, null,
						cb);
			},
			/**
			 * Takes a list of asset objects and posts them, generating a new asset like the template described by id.
			 * Each asset object can have name, description, and a map of labels in the format {label type name => label name}.
			 * All labels and label types sent in this way must exist prior to the call or an exception will be thrown and no assets
			 * created.
			 *
			 * @param assets
			 * @param cb
			 */
			bulkAdd: function(id, assets, cb) {
				doPut.call(this, "asset/all", JSON.stringify({asset: assets, refId: id}), {
					headers: {
						"Content-Type": contentType
					}
				}, cb);
			},
			/**
			 * Finds assets for a search string and/or bounding box
			 *
			 * May be called the following ways:
			 * 1. find(search, cb)
			 * 2. find(latTop, latBot, longLeft, longRight, cb)
			 * 3. find(search, latTop, latBot, longLeft, longRight, cb)
			 *
			 * @param search
			 * @param latTop
			 * @param latBot
			 * @param longLeft
			 * @param longRight
			 * @param cb
			 */
			find: function (search, latTop, latBot, longLeft, longRight, cb) {
				var vars = {};
				if (arguments.length == 2) {
					cb = arguments[1];
					vars = {query: search};
				}
				else {
					if (arguments.length == 5) {
						cb = arguments[4];
						longRight = arguments[3];
						longLeft = arguments[2];
						latBot = arguments[1];
						latTop = arguments[0];
						search = null;
					}
					vars = {
						query: search,
						topleft: [latTop, longLeft].join(","),
						bottomright: [latBot, longRight].join(",")
					}
				}
				doGet.call(this, "asset/find", vars, ["asset"], cb);

			},
			/**
			 * Gets an asset for a given id or name, or returns all assets if no id is given.
			 *
			 * @param idOrName
			 * @param cb
			 */
			get: function (idOrName, cb) {
				if ($.isFunction(idOrName)) {
					doGet.call(this, "asset/all", null, ["asset"], idOrName);
				}
				else {
					var drill = [];
					if (!isUUID(idOrName)) {
						if ($.isArray(idOrName)) {
							idOrName = idOrName.join(",");
						}
						idOrName = "all/" + idOrName;
						drill = ["asset"];
					}
					doGet.call(this, "asset/" + idOrName, null, drill, cb);
				}
			},
			/**
			 * Gets all labels directly applied to the asset
			 *
			 * @param id
			 * @param cb
			 */
			getLabels: function(id, cb) {
				doGet.call(this, "asset/" + id + "/labels", null, ["label"], cb);
			},
			/**
			 * Changes an asset's geolocation.  Requires id, lat, and long of new position.
			 *
			 * @param id
			 * @param lat
			 * @param long
			 * @param cb
			 */
			move: function(id, lat, long, cb) {
				doPut.call(this, "asset/" + id + "/move", {latitude: lat, longitude: long}, cb);
			},
			/**
			 * Removes an asset by its id
			 *
			 * @param id
			 * @param cb
			 */
			remove: function (id, cb) {
				doDelete.call(this, "asset/" + id, null, cb);
			},
			Channel: {
				Blueprint: {
					/**
					 * Gets all asset channel blueprints.
					 *
					 * @param assetId
					 * @param cb
					 */
					get: function (assetId, cb) {
						doGet.call(this, "asset/" + assetId + "/channel/blueprints", null, ["blueprint"], cb);
					}
				},

				/**
				 * Add a new channel to an asset
				 *
				 * @param assetId
				 * @param key                 the key used by the system to identify the channel
				 * @param label               the label used by users to identify the channel
				 * @param blueprint           the fully qualified {@link io.timeli.app.channel.ChannelBlueprint blueprint} key
				 * @param unit                the fully qualified {@link io.timeli.app.unit.Unit} key
				 * @param measurementInterval the measurement interval in seconds
				 * @param cfg                  configuration (optional params)
				 *
				 * cfg may contain
				 * @param description          a description of the channel purpose
				 * @param expression          the expression, only required for derived channels
				 * @param sources             the list of source channel keys, only required for derived channels
				 */

				add: function (assetId, key, label, blueprint, unit, measurementInterval, cfg, cb) {
					cfg = cfg || {};
					doPost.call(this, "asset/" + assetId + "/channel", {
						key: key,
						label: label,
						blueprint: blueprint,
						unit: unit,
						measurementInterval: measurementInterval,
						description: cfg.description,
						expression: cfg.expression,
						sources: cfg.sources
					}, null, cb)
				},

				/**
				 * Gets channels for an asset.
				 * If channelKeyOrIncludeDerived is a string, returns a specific channel, otherwise returns all.
				 *
				 *
				 * @param assetId
				 * @param channelKeyOrIncludeDerived
				 * @param cb
				 */
				get: function (assetId, channelKeyOrIncludeDerived, cb) {
					var vars = {},
							channelKey = null,
							getAll = (function(args){
								var result = true;
								switch (args.length) {
									case 2:
										cb = channelKeyOrIncludeDerived;
										break;
									case 3:
										if (typeof channelKeyOrIncludeDerived == "string") {
											result = false;
											channelKey = channelKeyOrIncludeDerived;
										} else {
											vars.includeDerived = !!channelKeyOrIncludeDerived;
										}
										break;
									default:
										error("invalid_argument_number", {method: "Asset.Channel.get", number: args.length});
								}
								return result;
							})(arguments);
					if (getAll) {
						doGet.call(this, "asset/" + assetId + "/channel/all", vars, ["channel"], cb);
					}
					else {
						doGet.call(this, "asset/" + assetId + "/channel/" + channelKey, null, [], cb);
					}

				}
			}
		},
		AssetMeasurement: function(asset, channel, timestamp, value, type) {
			if (!APP.SDK.Validation.isUUID(asset)) {
				error("invalid_uuid", {value: asset});
			}
			if (!APP.SDK.Validation.isFloat(value)) {
				error("invalid_float", {value: value});
			}
			this.assetId = asset;
			this.channelKey = channel;
			this.timestamp = formatDate(Format.ISO, timestamp);
			this.value = value;
			this.type = type ? type : APP.SDK.MeasurementType.interval;
		},
		Csv: {
			/**
			 * Loads data from a CSV file already living on server.  location is a relative directory pathname,
			 * filename is the name of the file.  limit may be sent to limit the number of values parsed.
			 *
			 * @param location
			 * @param filename
			 * @param config
			 * @param cb
			 */
			add: function(location, filename, config, cb) {
				var vars = {location: location, filename: filename};
				config.limit && (vars.limit = config.limit);
				doPost("csv", vars, null, cb);
			},
			/**
			 * Returns an object with a results object {headers => [values]} and an ordered headers array
			 *
			 * @param text
			 * @returns {CSV}
			 */
			parse: function(text) {
				return new CSV(text);
			}
		},
		EntityType: {
			asset: "asset",
			label: "label",
			group: "labelgroup",
			labelgroup: "labelgroup"
		},
		FileUpload: {
			/**
			 * Post a file to the server.  Not implemented at present due to sparse browser support.
			 *
			 * @param file
			 * @param cb
			 */
			add: function(file, cb) {
				error("not_implemented");
			},
			/**
			 * Delete an uploaded file by its name
			 *
			 * @param name
			 * @param cb
			 */
			delete: function(name, cb) {
				doDelete("upload/" + name, null, cb);
			},
			/**
			 * Get an uploaded file by its name
			 *
			 * @param name
			 * @param cb
			 */
			get: function(name, cb) {
				doGet("upload/" + name, null, null, cb);
			},
			/**
			 * Get metadata for an uploaded file by its name
			 *
			 * @param name
			 * @param cb
			 */
			meta: function(name, cb) {
				doGet("upload/" + name + "/meta", null, ["file"], cb);
			},
			/**
			 * Preview an uploaded file by its name
			 *
			 * @param name
			 * @param cb
			 */
			preview: function(name, cb) {
				doGet("upload/" + name + "/preview", null, null, cb);
			}
		},
		Helpers: {
			isUUID: isUUID
		},
		HTML: {
			/**
			 * Builds a select list based on a list of items and some configuration.  If valueProp is blank will default to textProp.
			 * If both are blank will assume items are strings and use them.
			 *
			 * @param items
			 * @param cfg
			 * @param textProp
			 * @param valueProp
			 * @returns {*|jQuery|HTMLElement}
			 */
			buildSelect: function (items, cfg, textProp, valueProp) {
				if (!valueProp) {
					valueProp = textProp;
				}
				var s = cfg.select && $(cfg.select).length ? $(cfg.select) : $("<select>");
				s.html("");
				if (cfg.class) {
					s.addClass(cfg.class);
				}
				$(items).each(function (i, item) {
					var val = textProp ? item[valueProp] : item,
							text = textProp ? item[textProp] : item;
					s.append("<option value=\"" + val + "\">" + text + "</option>");
				});
				return s;
			},
			/**
			 * Builds a list of either radio inputs or checkboxes based on a list of items and some configuration
			 *
			 * @param items
			 * @param cfg
			 *
			 * cfg.keys =
			 *    ul: selector for list to add items to (nullable; will create one if not found)
			 *    itemIdProp: property that contains indentifier, default id
			 *    itemLabelProp: property that contains label, default name
			 *    radio: true for radio, false for checkbox (default)
			 *    name: name of radio group or basename for checkboxes (default item)
			 *    itemClass: class of each item
			 *    itemAppend: HTML to add after the input label. Will replace "{itemId}" with the specified id property of the item
			 *    useAUI: add elements to conform to the requirements of Atlassian
			 */
			buildInputList: function (items, cfg) {
				var ul = cfg.ul ? $(cfg.ul) : $("<ul>"),
						type = cfg.radio ? "radio" : "checkbox";
				$(ul).empty();
				if (cfg.useAUI) {
					cfg.itemClass = cfg.itemClass || "";
					cfg.itemClass+= " " + type;
				}
				$(items).each(function (i, item) {
					var itemIdProp = cfg.itemIdProp || "id",
							itemLabelProp = cfg.itemLabelProp || "label",
							basename = cfg.name || "item",
							id = basename + "[" + item[itemIdProp] + "]",
							name = cfg.radio ? basename : id;
					ul.append("<li>"
							+ (cfg.useAUI ? "<div class=\"" + type + "\">" : "")
							+ "<input type=\"" + type + "\" name=\"" + name + "\" id=\"" + id + "\" "
							+ 		(cfg.itemClass ? "class=\"" + cfg.itemClass + "\"" : "")
							+		" value=\"" + item[itemIdProp] + "\""
							+ 		" data-id=\"" + item[itemIdProp] + "\"/>"
							+ "<label for=\"" + name + "\">"
							+ item[itemLabelProp]
							+ "</label>"
							+ (cfg.useAUI ? "</div>" : "")
							+ (cfg.itemAppend ? cfg.itemAppend.replace("{itemId}", item[itemIdProp]) : "")
							+ "</li>");
				});

				return ul;
			}
		},
		Label: {
			Channel: {
				Blueprint: {
					/**
					 * Gets all asset channel blueprints.
					 *
					 * @param assetId
					 * @param cb
					 */
					get: function (id, cb) {
						doGet.call(this, "label/" + id + "/channels/blueprints", null, ["blueprint"], cb);
					}
				},

				/**
				 * Add a new channel to all assets under a label
				 *
				 * @param id
				 * @param key                 the key used by the system to identify the channel
				 * @param label               the label used by users to identify the channel
				 * @param blueprint           the fully qualified {@link io.timeli.app.channel.ChannelBlueprint blueprint} key
				 * @param unit                the fully qualified {@link io.timeli.app.unit.Unit} key
				 * @param measurementInterval the measurement interval in seconds
				 * @param cfg                  configuration (optional params)
				 *
				 * cfg may contain
				 * @param description          a description of the channel purpose
				 * @param expression          the expression, only required for derived channels
				 * @param sources             the list of source channel keys, only required for derived channels
				 */

				add: function (id, key, label, blueprint, unit, measurementInterval, cfg, cb) {
					cfg = cfg || {};
					doPost.call(this, "label/" + id + "/channel", {
						key: key,
						label: label,
						blueprint: blueprint,
						unit: unit,
						measurementInterval: measurementInterval,
						description: cfg.description,
						expression: cfg.expression,
						sources: cfg.sources
					}, null, cb)
				}
			},
			/**
			 * Adds a label with the given name, description, and expression.
			 * If expression is specified, label will be dynamic.
			 * Expression is optional and based on SpEL.
			 *
			 * parentId, typeId, and treeId are all UUIDs
			 *
			 * @param name
			 * @param description
			 * @param parentId (optional)
			 * @param typeId (optional)
			 * @param treeId (optional)
			 * @param expression (optional)
			 * @param cb
			 */
			add: function(name, description, parentId, typeId, treeId, expression, cb) {
				var vars = {name: name, description: description};
				if ($.isFunction(parentId)) {
					cb = parentId;
					parentId = null;
					typeId = null;
					treeId = null;
					expression = null;
				}
				else if ($.isFunction(typeId)) {
					cb = typeId;
					typeId = null;
					treeId = null;
					expression = null;
				} else if ($.isFunction(treeId)) {
					cb = treeId;
					treeId = null;
					expression = null;
				} else if ($.isFunction(expression)) {
					cb = expression;
					expression = null;
				}
				expression && (vars.expression = expression);
				typeId && (vars.type = typeId);
				treeId && (vars.tree = treeId);
				parentId && (vars.parent = parentId);

				if (parentId && !isUUID(parentId)) {
					error(messages.errors.invalid_uuid, {value: parentId});
				}
				if (typeId && !isUUID(typeId)) {
					error(messages.errors.invalid_uuid, {value: typeId});
				}
				if (treeId && !isUUID(treeId)) {
					error(messages.errors.invalid_uuid, {value: treeId});
				}

				doPost.call(this, "label", vars, null, cb);
			},
			/**
			 * Attaches an asset or assets to a label
			 *
			 * @param id
			 * @param assetIds
			 * @param cb
			 */
			addAssets: function(id, assetIds, cb) {
				if (!$.isArray(assetIds)) {
					assetIds = [assetIds];
				}
				doPost("label/" + id + "/assets", {assetIds: assetIds}, null, cb);
			},
			/**
			 * Changes the behavior of a label via APP.SDK.LabelBehavior
			 *
			 * @param id
			 * @param labelBehavior
			 * @param cb
			 */
			changeBehavior: function(id, labelBehavior, cb) {
				if (!APP.SDK.Validation.isLabelBehavior(labelBehavior)) {
					error("invalid_label_behavior", {value: labelBehavior});
				}
				doPut("label/" + id +"/make-" + labelBehavior, null, null, cb);
			},
			/**
			 * Deletes a label by its id
			 *
			 * @param id
			 * @param cb
			 */
			delete: function(id, cb) {
				doDelete("label/" + id, null, cb);
			},
			/**
			 * Gets a label by its id or a group of labels by its APP.SDK.LabelBehavior
			 *
			 * @param idOrBehavior
			 * @param cb
			 */
			get: function(idOrBehavior, cb) {
				if ($.isFunction(idOrBehavior)) {
					cb = idOrBehavior;
					doGet("label/all", null, ["label"], cb);
				}
				else {
					var drill = APP.SDK.Validation.isLabelBehavior(idOrBehavior) ? ["label"] : null;
					doGet("label/" + idOrBehavior, null, drill, cb);
				}
			},
			/**
			 * Gets assets attached to a label by its id.  If all is specified, also gets descendant assets by traversing down the label tree.
			 *
			 * @param id
			 * @param all
			 * @param cb
			 */
			getAssets: function(id, all, cb) {
				doGet("label/" + id + "/assets" + (all ? "/all" : ""), null, ["asset"], cb);
			},
			/**
			 * Gets the children of the label specified
			 *
			 * @param id
			 * @param cb
			 */
			getChildren: function(id, cb) {
				doGet("label/" + id + "/children", null, ["label"], cb);
			},
			/**
			 * Retrieves all root nodes for trees
			 *
			 * @param cb
			 */
			getRoots: function(cb) {
				doGet("label/roots", null, ["label"], cb);
			},
			/**
			 * Retrieves all nodes below the label with id in hierarchical fashion, inclusive
			 * Optional: send depth to restrict number of levels below the root returned.
			 *
			 * @param id
			 * @param depth
			 * @param cb
			 */
			getSubtree: function(id, depth, cb) {
				if ($.isFunction(depth)) {
					cb = depth;
					depth = null;
				}
				doGet("label/" + id + "/subtree", {depth: depth}, null, cb);
			},
			/**
			 * Removes an asset from a label
			 * @param id
			 * @param assetId
			 * @param cb
			 */
			removeAsset: function(id, assetId, cb) {
				doDelete("label/" + id + "/asset/" + assetId, null, cb);
			},
			/**
			 * Finds an asset containing the string specified in query
			 * config is optional and allows restriction to statics or dynamics, eg.
			 * config = {dynamics: false} will only search static labels
			 *
			 * @param query
			 * @param config
			 * @param cb
			 */
			search: function(query, config, cb) {
				var vars = {
					query: query
				};
				if ($.isFunction(config)) {
					cb = config;
				}
				config.statics && (vars.statics = !!config.statics);
				config.dynamics && (vars.dynamics = !!config.dynamics);
				doGet("label/find", vars, ["label"], cb);
			},
			/**
			 * Sets the parent of label described by id to parentId
			 *
			 * @param id
			 * @param parentId
			 * @param cb
			 */
			setParent: function(id, parentId, cb) {
				doPut("label/" + id + "/parent/" + parentId, null, null, cb);
			},
			Group: {
				Channel: {
					Blueprint: {
						/**
						 * Gets all asset channel blueprints.
						 *
						 * @param assetId
						 * @param cb
						 */
						get: function (id, cb) {
							doGet.call(this, "label/group/" + id + "/channels/blueprints", null, ["blueprint"], cb);
						}
					},

					/**
					 * Add a new channel to all assets under a label group
					 *
					 * @param id
					 * @param key                 the key used by the system to identify the channel
					 * @param label               the label used by users to identify the channel
					 * @param blueprint           the fully qualified {@link io.timeli.app.channel.ChannelBlueprint blueprint} key
					 * @param unit                the fully qualified {@link io.timeli.app.unit.Unit} key
					 * @param measurementInterval the measurement interval in seconds
					 * @param cfg                  configuration (optional params)
					 *
					 * cfg may contain
					 * @param description          a description of the channel purpose
					 * @param expression          the expression, only required for derived channels
					 * @param sources             the list of source channel keys, only required for derived channels
					 */

					add: function (id, key, label, blueprint, unit, measurementInterval, cfg, cb) {
						cfg = cfg || {};
						doPost.call(this, "label/group/" + id + "/channel", {
							key: key,
							label: label,
							blueprint: blueprint,
							unit: unit,
							measurementInterval: measurementInterval,
							description: cfg.description,
							expression: cfg.expression,
							sources: cfg.sources
						}, null, cb)
					}
				},
				/**
				 * Adds a label group with a valid expression
				 *
				 * @param expression
				 * @param name
				 * @param cb
				 */
				add: function(expression, name, cb) {
					var vals = {
						expression: expression
					};
					if ($.isFunction(name)) {
						cb = name;
					}
					else {
						vals.name = name;
					}
					doPost("label/group", vals, null, cb);
				},
				/**
				 * Gets a label group by an id or by its expression. Also gets all available if id is null
				 *
				 * @param id
				 * @param cb
				 */
				get: function(id, cb) {
					var drill = null;
					if ($.isFunction(id)) {
						cb = id;
						id = "all";
						drill = ["groups"];
					}
					doGet("label/group/" + id, null, drill, cb);
				},
				/**
				 * Gets all assets in this label group by an id or expression.
				 *
				 * @param id
				 * @param cb
				 */
				getAssets: function(id, cb) {
					doGet("label/group/" + id + "/assets", null, ['asset'], cb);
				},
				/**
				 * Removes a label group by its id
				 *
				 * @param id
				 * @param cb
				 */
				remove: function(id, cb) {
					doDelete("label/group/" + id, null, cb);
				}
			},
			Type: {
				/**
				 * Adds a label type with name and optionally a description
				 *
				 * @param name
				 * @param description
				 * @param callback
				 */
				add: function(name, description, cb) {
					LabelType.add(name, description, "type", cb);
				},
				/**
				 * Deletes a label type by id
				 *
				 * @param id
				 * @param cb
				 */
				delete: function(id, cb) {
					LabelType.delete(id, "type", cb);
				},
				/**
				 * Gets a label type via an id, finds it by a query, or gets all
				 * depending on the value of idOrQuery
				 *
				 * @param idOrQuery
				 * @param callback
				 */
				get: function(idOrQuery, cb) {
					LabelType.get(idOrQuery, "type", cb);
				},
				/**
				 * Get all labels with a type denoted by the given id
				 *
				 * @param id
				 * @param cb
				 */
				getLabels: function(id, cb) {
					LabelType.getLabels(id, "type", cb);
				}
			},
			Node: {
				/**
				 * Adds a label type with name and optionally a description
				 *
				 * @param name
				 * @param description
				 * @param callback
				 */
				add: function(name, description, cb) {
					LabelType.add(name, description, "type", cb);
				},
				/**
				 * Deletes a label type by id
				 *
				 * @param id
				 * @param cb
				 */
				delete: function(id, cb) {
					LabelType.delete(id, "type", cb);
				},
				/**
				 * Gets a label type via an id, finds it by a query, or gets all
				 * depending on the value of idOrQuery
				 *
				 * @param idOrQuery
				 * @param callback
				 */
				get: function(idOrQuery, cb) {
					LabelType.get(idOrQuery, "type", cb);
				},
				/**
				 * Get all labels with a type denoted by the given id
				 *
				 * @param id
				 * @param cb
				 */
				getLabels: function(id, cb) {
					LabelType.getLabels(id, "type", cb);
				}
			},
			Tree: {
				/**
				 * Adds a label tree with name and optionally a description
				 *
				 * @param name
				 * @param description
				 * @param callback
				 */
				add: function(name, description, cb) {
					LabelType.add(name, description, "tree", cb);
				},
				/**
				 * Deletes a label tree by id
				 *
				 * @param id
				 * @param cb
				 */
				delete: function(id, cb) {
					LabelType.delete(id, "tree", cb);
				},
				/**
				 * Gets a label tree via an id, finds it by a query, or gets all
				 * depending on the value of idOrQuery
				 *
				 * @param idOrQuery
				 * @param callback
				 */
				get: function(idOrQuery, cb) {
					LabelType.get(idOrQuery, "tree", cb);
				},
				/**
				 * Get all labels in the given tree
				 *
				 * @param id
				 * @param cb
				 */
				getLabels: function(id, cb) {
					LabelType.getLabels(id, "tree", cb);
				}
			}
		},
		LabelBehavior: {
			dynamic: "dynamic",
			static: "static"
		},
		Measurement: {
			/**
			 * Adds measurement values of a given type, for an asset assetId.
			 * Measurements must be either an object with structure {value:<Number>, timestamp: <Number>}
			 * or an array of such objects.
			 * Channel is optional.
			 *
			 * @param type
			 * @param assetId
			 * @param measurements
			 * @param channel
			 * @param cb
			 */
			add: function (type, assetId, measurements, channel, cb) {
				if (!$.isArray(measurements)) {
					measurements = [measurements];
				}
				$(measurements).each(function (i, measurement) {
					measurement.timestamp = formatDate("Y-m-d\\TH:i:sP", measurement.timestamp);
				});
				var endpoint = "measurement/"+Validation.ensureMeasurementType(type)+"/"+assetId;
				if ($.isFunction(channel)) {
					cb = channel;
				}
				else if (!!channel) {
					endpoint += "/" + channel;
				}
				doPut.call(this, endpoint, JSON.stringify({measurement: measurements}),
						{
							headers: {
								"Content-Type": contentType
							}
						}, cb);
			},
			/**
			 * Adds a range of measurements for multiple sources (asset/channel combinations) and types.
			 * Each measurement should be a SDK.AssetMeasurement instance or of the same property format
			 * {asset, channelKey, timestamp, value, type} with asset a UUID, channelKey a string key,
			 * timestamp a ISO-8661 Date string representation, value a floating point, and type a SDK.MeasurementType.
			 *
			 * @param type
			 * @param measurements
			 * @param callback
			 */
			addAll: function(measurements, cb) {
				doPut.call(this, "measurement/all", JSON.stringify({measurement: measurements}),
						{
							headers: {
								"Content-Type": contentType
							}
						}, ["message"], cb);
			},
			/**
			 * Gets measurements for an asset, a measurement type, an SDK.Timespan,
			 * channel and limit are optional.
			 *
			 * Can be called three ways:
			 * 1. source is SDK.MeasurementSource {raw, processed}, type is a SDK.MeasurementType, returns raw or processed data (5-7 arguments).
			 * 2. source is SDK.MeasurementSource.aggregated, type is an aggregation ID, returns aggregated data (3 arguments).
			 * 3. source is an aggregation ID, returns aggregated data (2 arguments)
			 *
			 * @param raw
			 * @param source
			 * @param type
			 * @param assetId
			 * @param timespan
			 * @param channel
			 * @param cb
			 */
			get: function(source, type, assetId, timespan, channel, limit, cb) {
				var aggregationId = null;
				(function(args) {
					if (args.length == 4) {
						error("invalid_argument_number", {method: "Measurement.get", number: 4});
					}
					cb = args[args.length-1];
					if (!$.isFunction(cb)) {
						error("invalid_callback");
					}

					if (isUUID(source) || args.length == 2) {
						aggregationId = args[0];
						source = APP.SDK.MeasurementSource.aggregated;
					}

					channel = args.length > 4 ? args[4] : null;
					limit = args.length > 5 ? args[5] : null;
				})(arguments);

				var endpoint = aggregationId ? "measurement/aggregated/" + aggregationId
								: "measurement/" + Validation.ensureMeasurementSource(source) + "/" + Validation.ensureMeasurementType(type) + "/" + assetId
								+ (channel ? "/" + channel : ""),
						meta = {},
						drill = ["measurement"];

				if (aggregationId) {
					drill = ["consolidations"];
				}

				meta = timespan ? timespan.asISOStrings() : {};
				if (limit) meta.maxvals = limit;

				doGet.call(this, endpoint, meta, drill, cb);
			},
			/**
			 * Intersects two time series on date, ignoring time zone, for the specified timespan.  Useful for scatter plots or correlating data.
			 *
			 * @param left
			 * @param right
			 * @param timespan
			 * @param maxvals
			 * @param cb
			 */
			intersect: function(left, right, timespan, maxvals, cb) {
				if (arguments.length < 4) {
					throw new Error(messages.errors.invalid_argument_number
							.replace("{method}", "Measurement.intersect")
							.replace("{count}", arguments.length));
				}
				else if (arguments.length < 5) {
					cb = arguments[arguments.length-1];
				}
				timespan = timespan.asISOStrings();
				doGet.call(this, "measurement/aggregated/intersect",
						{left: left, right: right, start: timespan.start, end: timespan.end}, [], cb);
			},
			/**
			 * Gets the asset record and last n raw measurements for all channels for a given id
			 *
			 * @param id
			 * @param type
			 * @param n
			 * @param cb
			 */
			last: function(id, type, n, cb) {
				doGet.call(this, "measurement/" + APP.SDK.MeasurementSource.raw + "/" + type + "/" + id + "/last/" + n, null, null, cb);
			},
			/**
			 * Recalculates an aggregation for the given timespan
			 *
			 * @param aggregationId
			 * @param timespan
			 * @param cb
			 */
			recalculate: function(aggregationId, timespan, cb) {
				doPut.call(this, "measurement/aggregation/" + aggregationId + "/recalculate", timespan, null, cb);
			}
		},
		MeasurementType: {
			interval: "interval",
			register: "register"
		},
		MeasurementSource: {
			raw: "raw",
			processed: "processed",
			aggregated: "aggregated"
		},
		Model: {
			/**
			 * Gets a model with structure [{asset, [{channel, measurements}], labels, properties}] based on all combinations
			 * of assetIds and channelKeys sent
			 *
			 * @param source
			 * @param type
			 * @param assetIds
			 * @param channelKeys
			 * @param cb
			 */
			getCombined: function(source, type, assetIds, channelKeys, cb) {
				doGet.call(this, "model/" + source + "/" + type + "/combine", {a: assetIds, c: channelKeys}, ["model"], cb);
			},
			/**
			 * Clears a cache for a tenant. Tenant is a UUID. If no tenant is sent clears for the current tenant.
			 * You must have access to the tenant to use this endpoint or
			 *
			 * @param tenant (optional)
			 * @param cb
			 */
			clearCache: function(tenant, cb) {
				if ($.isFunction(tenant)) {
					doDelete.call(this, "model/cache/clear", null, tenant);
				}
				else {
					if (!isUUID(tenant)) {
						error(messages.errors.invalid_uuid, {value: tenant});
					}
					doDelete.call(this, "model/cache/clear/" + tenant, null, cb);
				}
			}
		},
		Permittables: {
			/**
			 * Gets a permittable (asset, label, label group, or label type) by its id
			 *
			 * @param id
			 * @param cb
			 */
			get: function(id, cb) {
				doGet.call(this, "permittable/" + id, null, cb);
			},
			/**
			 * Finds all permittables (asset, label, label group, or label type) with a name containing the search parameter
			 *
			 * @param search
			 * @param cb
			 */
			find: function(search, cb) {
				if (!search) {
					cb(null, []);
				}
				doGet.call(this, "permittable/find", {query: search}, ["permittable"], cb);
			}
		},
		Tasks: {
			get: function(id, cb) {
				doGet.call(this, "tasks/" + id, null, null, cb);
			}
		},
		Tenant: {
			/**
			 * Adds permission for a redirect URI to the tenant. Requires a global administrator permission.
			 *
			 * @param id
			 * @param redirect
			 * @param cb
			 */
			addRedirect: function(id, redirect, cb) {
				doPut.call(this, "tenant/" + id + "/redirect", {uri: redirect}, null, cb);
			},
			/**
			 * Adds permission for a redirect URI to the tenant. Requires a global administrator permission.
			 *
			 * @param id
			 * @param redirect
			 * @param cb
			 */
			removeRedirect: function(id, redirect, cb) {
				doDelete.call(this, "tenant/" + id + "/redirect", {uri: redirect}, cb);
			}
		},
		Timespan: function (start, end) {
			var self = this;
			this.start = start;
			this.end = end;
			this.asDates = function () {
				var result = {
					start: self.start === null ? null : new Date(self.start),
					end: self.end === null ? null : new Date(self.end)
				}
				return result;
			}
			this.asISOStrings = function () {
				return self.asStrings(Format.ISO);
			}
			this.asStrings = function (format) {
				format = format || "Y-m-d H:i:s";
				var dates = self.asDates(),
						result = {};
				for (var j in dates) {
					if (dates[j]) {
						result[j] = !!dates[j] && !isNaN(dates[j].getTime()) ? formatDate(format, dates[j].getTime() / 1000) : null;
					}
				}
				return result;
			}
		},
		Timezones: {
			get: function (cb) {
				doGet.call(this, "time/timezones/all", null, ["values"], function (error, results) {
					readSetResponse(error, results, cb);
				});
			}
		},
		User: {
			Rules: {
				/**
				 * Adds a rule with CIDR ipRange to the user denoted by username
				 *
				 * @param username
				 * @param ipRange
				 * @param cb
				 */
				add: function(username, ipRange, isGlobal, cb) {
					doPost.call(this, "user/" + username + "/rules", {ipRange: ipRange, isGlobal: isGlobal}, null, cb);
				},
				/**
				 * Deletes the rule with ipRange from user denoted by username
				 *
				 * @param username
				 * @param ipRange
				 * @param cb
				 */
				delete: function(username, ipRange, isGlobal, cb) {
					doDelete.call(this, "user/" + username + "/rules", {ipRange: ipRange, isGlobal: isGlobal}, cb);
				},
				/**
				 * Checks whether an IP address is allowed by the present user configuration
				 *
				 * @param username
				 * @param ip
				 * @param cb
				 */
				check: function(username, ip, cb) {
					doGet.call(this, "user/"+username+"/rules/"+ip +"/check", null, null, cb);
				}
			}
		},
		Validation: {
			isAgentDisposition: function(value) {
				return isValid(value, APP.SDK.AgentDisposition);
			},
			isAgentStatus: function(value) {
				return isValid(value, APP.SDK.AgentStatus);
			},
			isEntityType: function(value) {
				return isValid(value, APP.SDK.EntityType);
			},
			isLabelBehavior: function(value) {
				return isValid(value, APP.SDK.LabelBehavior);
			},
			isMeasurementType: function(value) {
				return isValid(value, APP.SDK.MeasurementType);
			},
			isMeasurementSource: function(value) {
				return isValid(value, APP.SDK.MeasurementSource);
			},
			isFloat: function(value) {
				return (value + "").match(/^-?\d*(\.\d+)?$/);
			},
			isUUID: isUUID
		},
		init: function ($, config, cb) {
			setConfig(config);
			window.APP.SDK.init = function ($, config, cb) {
				log(messages.warnings.already_initialized);
				cb && cb();
			};
			checkInit = function () {
				return true;
			}
			cb && cb();
		}
	};
	APP.SDK.Label.find = APP.SDK.Label.search;
	APP.SDK.Label.remove = APP.SDK.Label.delete;
	APP.SDK.Asset.search = APP.SDK.Asset.find;
	APP.SDK.Asset.delete = APP.SDK.Asset.remove;
	for (var j in APP.SDK) {
		addPaging(APP.SDK[j]);
	}
})();
