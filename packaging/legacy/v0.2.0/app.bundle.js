/* Generated packaged bundle. Edit src/ and packaging/runtime/, then rebuild. */
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
          }
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor/app/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    AppWeb: () => AppWeb
  });
  var AppWeb;
  var init_web = __esm({
    "node_modules/@capacitor/app/dist/esm/web.js"() {
      init_dist();
      AppWeb = class extends WebPlugin {
        constructor() {
          super();
          this.handleVisibilityChange = () => {
            const data = {
              isActive: document.hidden !== true
            };
            this.notifyListeners("appStateChange", data);
            if (document.hidden) {
              this.notifyListeners("pause", null);
            } else {
              this.notifyListeners("resume", null);
            }
          };
          document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
        }
        exitApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getInfo() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getLaunchUrl() {
          return { url: "" };
        }
        async getState() {
          return { isActive: document.hidden !== true };
        }
        async minimizeApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async toggleBackButtonHandler() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getAppLanguage() {
          return {
            value: navigator.language.split("-")[0].toLowerCase()
          };
        }
      };
    }
  });

  // node_modules/@capacitor/app/dist/esm/index.js
  init_dist();
  var App = registerPlugin("App", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.AppWeb())
  });

  // ../src/app.js
  init_dist();

  // ../src/data.js
  var roles = {
    lord: { name: "\u754C\u4E3B", camp: "order", color: "gold", goal: "\u4E0E\u5B88\u62A4\u8005\u4E00\u540C\u6D88\u706D\u6240\u6709\u7834\u754C\u8005\u4E0E\u72EC\u884C\u8005", reveal: "\u516C\u5F00\u8EAB\u4EFD\uFF0C\u4F53\u529B\u4E0A\u9650\u3001\u624B\u724C\u4E0A\u9650\u4E0E\u521D\u59CB\u624B\u724C+1" },
    loyal: { name: "\u5B88\u62A4\u8005", camp: "order", color: "cyan", goal: "\u4FDD\u62A4\u754C\u4E3B\u5E76\u6D88\u706D\u7834\u754C\u8005\u4E0E\u72EC\u884C\u8005", reveal: "\u64782\u5F20\u724C\uFF0C\u5E76\u4EE4\u754C\u4E3B\u83B7\u5F971\u70B9\u62A4\u76FE" },
    rebel: { name: "\u7834\u754C\u8005", camp: "chaos", color: "rose", goal: "\u51FB\u8D25\u754C\u4E3B", reveal: "\u64781\u5F20\u724C\u5E76\u83B7\u5F972\u70B9\u80FD\u91CF\uFF0C\u672C\u56DE\u5408\u653B\u51FB\u8DDD\u79BB\u65E0\u9650" },
    lone: { name: "\u72EC\u884C\u8005", camp: "lone", color: "violet", goal: "\u6210\u4E3A\u552F\u4E00\u5B58\u6D3B\u8005\uFF0C\u5E76\u6700\u540E\u51FB\u8D25\u754C\u4E3B", reveal: "\u64782\u5F20\u724C\u5E76\u83B7\u5F971\u70B9\u62A4\u76FE" },
    azure: { name: "\u82CD\u961F", camp: "azure", color: "cyan", goal: "\u6D88\u706D\u7EEF\u961F\u4E24\u540D\u89D2\u8272", reveal: "\u8EAB\u4EFD\u59CB\u7EC8\u516C\u5F00" },
    crimson: { name: "\u7EEF\u961F", camp: "crimson", color: "rose", goal: "\u6D88\u706D\u82CD\u961F\u4E24\u540D\u89D2\u8272", reveal: "\u8EAB\u4EFD\u59CB\u7EC8\u516C\u5F00" }
  };
  var modes = [
    { id: "classic8", name: "\u7ECF\u5178\u519B\u516B", label: "8\u4EBA \xB7 \u9690\u85CF\u8EAB\u4EFD", description: "\u754C\u4E3B\u3001\u5B88\u62A4\u8005\u3001\u7834\u754C\u8005\u4E0E\u72EC\u884C\u8005\u5728\u4FE1\u606F\u8FF7\u96FE\u4E2D\u535A\u5F08\u3002", playerCount: 8, roles: ["lord", "loyal", "loyal", "rebel", "rebel", "rebel", "rebel", "lone"], publicRoles: ["lord"], deckProfile: "standard144", badge: "CLASSIC", accent: "gold" },
    { id: "ranked2v2", name: "\u6392\u4F4D 2V2", label: "4\u4EBA \xB7 \u660E\u9635\u8425", description: "\u4EA4\u9519\u5EA7\u6B21\u3001\u8EAB\u4EFD\u516C\u5F00\u3002\u914D\u5408\u961F\u53CB\uFF0C\u7387\u5148\u51FB\u6E83\u5BF9\u65B9\u53CC\u4EBA\u7EC4\u3002", playerCount: 4, roles: ["azure", "crimson", "azure", "crimson"], publicRoles: ["azure", "crimson"], deckProfile: "compact80", badge: "RANKED", accent: "cyan" }
  ];
  var characterHandLimits = {
    shikamaru: 5,
    itachi: 5,
    hinata: 5,
    orochimaru: 5,
    chopper: 5,
    rukia: 5,
    armin: 5,
    gaara: 3,
    sakura: 5,
    kakashi: 5,
    nami: 5,
    usopp: 5,
    robin: 5
  };
  var characters = [
    { id: "naruto", name: "\u6F29\u6DA1\u9E23\u4EBA", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u7206\u53D1", hp: 4, glyph: "\u5FCD", color: "#ff9b45", skills: [{ name: "\u5206\u8EAB\u63A9\u62A4", text: "\u5206\u8EAB\u53EF\u4F5C\u4E3A\u9632\u5FA1\uFF1B\u5206\u8EAB\u88AB\u6D88\u8017\u540E\u83B7\u5F971\u70B9\u80FD\u91CF\uFF0C\u5E76\u4EE4\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u3002" }, { name: "\u7F81\u7ECA\u56DE\u54CD", text: "\u62E5\u6709\u5206\u8EAB\u65F6\u653B\u51FB\u53EF\u65E0\u89C6\u8DDD\u79BB\uFF1B\u87BA\u65CB\u624B\u91CC\u5251\u6D88\u8017\u5206\u8EAB\u540E\u83B7\u5F97\u4E0D\u53EF\u4ECB\u5165\u7684\u5F3A\u5316\u3002" }], signature: { name: "\u98CE\u9041\xB7\u87BA\u65CB\u624B\u91CC\u5251", cost: 4, target: "enemy", text: "\u53D1\u52A8\u4E00\u6B21\u9700\u89812\u5F20\u9632\u5FA1\u7684\u5F3A\u88AD\uFF1B\u6D88\u8017\u5206\u8EAB\u540E\u4F24\u5BB3+1\u4E14\u4E0D\u80FD\u88AB\u5F3A\u5236\u4ECB\u5165\u3002", effect: "rasenshuriken" } },
    { id: "gaara", name: "\u6211\u7231\u7F57", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u9632\u5FA1", hp: 3, glyph: "\u7802", color: "#c89567", skills: [{ name: "\u7EDD\u5BF9\u9632\u5FA1", text: "\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u666E\u901A\u7A81\u51FB\u65F6\uFF0C\u53EF\u5F031\u5F20\u724C\u53D6\u6D88\u8BE5\u653B\u51FB\uFF1B\u53EA\u6709\u5B9E\u9645\u53D1\u52A8\u65F6\u624D\u6D88\u8017\u672C\u8F6E\u6B21\u6570\u3002" }, { name: "\u7802\u7011\u8FFD\u846C", text: "\u88AB\u7802\u7F1A\u7684\u76EE\u6807\u6210\u4E3A\u8FFD\u846C\u76EE\u6807\uFF1B\u4F60\u4E0B\u4E00\u6B21\u5BF9\u5176\u53D1\u52A8\u7684\u7A81\u51FB\u65E0\u89C6\u8DDD\u79BB\u4E14\u4F24\u5BB3+1\uFF0C\u968F\u540E\u79FB\u9664\u6807\u8BB0\u3002" }], signature: { name: "\u7802\u7011\u5927\u846C", cost: 4, target: "enemy", text: "\u76EE\u6807\u5F032\u5F20\u724C\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u4F24\u5BB3\u5E76\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u724C\u3002", effect: "discardOrDamage" } },
    { id: "sakura", name: "\u6625\u91CE\u6A31", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u8F85\u52A9", hp: 4, glyph: "\u6A31", color: "#ef729e", skills: [{ name: "\u602A\u529B\u56DE\u51FB", text: "\u4E3B\u52A8\u89E3\u653E\u57FA\u7840\u767E\u8C6A\u724C\u65F6\u56DE\u590D1\u70B9\u4F53\u529B\uFF0C\u5E76\u4EE4\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u3002" }, { name: "\u533B\u7597\u5FCD\u672F", text: "\u4E3B\u52A8\u89E3\u653E\u7B56\u7565\u767E\u8C6A\u724C\u65F6\u51C0\u5316\u4F0F\u7B14\u6216\u5F02\u5E38\u5E76\u64781\u5F20\u724C\uFF1B\u88C5\u5907\u767E\u8C6A\u724C\u53EF\u8F6C\u5316\u4E3A2\u70B9\u62A4\u76FE\u3002\u767E\u8C6A\u533A\u6700\u591A\u50A8\u5B583\u5F20\u4E0D\u540C\u7C7B\u522B\u724C\u3002" }], signature: { name: "\u767E\u8C6A\u4E4B\u672F", cost: 3, target: "self", text: "\u76F4\u5230\u4E0B\u56DE\u5408\u5F00\u59CB\uFF0C\u767E\u8C6A\u4FDD\u62A4\u8303\u56F4\u6539\u4E3A\u5168\u573A\uFF0C\u5404\u7C7B\u522B\u9996\u6B21\u89E3\u653E\u540E\u8FD4\u56DE\u624B\u724C\uFF0C\u5E76\u4F7F\u9996\u6B21\u653B\u51FB\u4F24\u5BB3+1\u3002", effect: "hundredHealings" } },
    { id: "shikamaru", name: "\u5948\u826F\u9E7F\u4E38", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u63A7\u5236", hp: 3, glyph: "\u5F71", color: "#8ca26a", skills: [{ name: "\u5F71\u7F1D", text: "\u4E3A\u4E00\u540D\u672A\u884C\u52A8\u89D2\u8272\u843D\u5B50\uFF1B\u68CB\u5B50\u89D2\u8272\u672C\u56DE\u5408\u7B2C\u4E00\u6B21\u4F7F\u7528\u653B\u51FB\u6216\u7B56\u7565\u724C\u65F6\u987B\u5F03\u724C\uFF0C\u5426\u5219\u8BE5\u724C\u88AB\u53D6\u6D88\u3002" }, { name: "\u6218\u672F\u9884\u8BFB", text: "\u68CB\u5B50\u51FA\u724C\u88AB\u53D6\u6D88\u3001\u653B\u51FB\u88AB\u9632\u5FA1\u6216\u4F60\u7684\u4F0F\u7B14\u88AB\u79FB\u9664\u540E\uFF0C\u4EE4\u5176\u884C\u52A8\u540E\u79FB\uFF0C\u5E76\u5F3A\u5316\u4F60\u4E0B\u4E00\u6B21\u5BF9\u5176\u53D1\u52A8\u7684\u653B\u51FB\u3002" }], signature: { name: "\u5C06\u519B", cost: 3, target: "marked", text: "\u5C06\u68CB\u5B50\u8EAB\u4E0A\u4E00\u5F20\u81EA\u5DF1\u7684\u4F0F\u7B14\u6539\u4E3A\u516C\u5F00\u9677\u9631\uFF1A\u53D6\u6D88\u5176\u4E0B\u4E00\u5F20\u975E\u54CD\u5E94\u724C\u5E76\u7ED3\u675F\u51FA\u724C\u9636\u6BB5\uFF1B\u82E5\u6CA1\u6709\u4F0F\u7B14\u5219\u76F4\u63A5\u4EE4\u68CB\u5B50\u5F032\u5F20\u724C\u3002", effect: "checkmate" } },
    { id: "itachi", name: "\u5B87\u667A\u6CE2\u9F2C", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u63A7\u5236", hp: 3, glyph: "\u5E7B", color: "#c55367", skills: [{ name: "\u6708\u8BFB\u524D\u5146", text: "\u865A\u5047\u4F0F\u7B14\u88AB\u53CD\u5236\u65F6\u83B7\u5F972\u70B9\u80FD\u91CF\uFF0C\u5E76\u4EE4\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u4E14\u5FFD\u7565\u62A4\u7532\uFF1B\u672A\u88AB\u53CD\u5236\u65F6\uFF0C\u5BF9\u5E7B\u8C61\u76EE\u6807\u7684\u653B\u51FB\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\u3002" }, { name: "\u4E4C\u9E26\u66FF\u8EAB", text: "\u6BCF\u8F6E\u4E00\u6B21\uFF0C\u6210\u4E3A\u7A81\u51FB\u76EE\u6807\u65F6\u53EF\u6D88\u8017\u4EFB\u4E00\u865A\u5047\u4F0F\u7B14\uFF0C\u5C06\u7A81\u51FB\u8F6C\u79FB\u7ED9\u53E6\u4E00\u5408\u6CD5\u89D2\u8272\u5E76\u64781\u5F20\u724C\uFF1B\u6CA1\u6709\u8F6C\u79FB\u76EE\u6807\u65F6\u53D6\u6D88\u8BE5\u653B\u51FB\u3002" }], signature: { name: "\u6708\u8BFB", cost: 4, target: "illusion", text: "\u6D88\u8017\u6307\u5411\u76EE\u6807\u7684\u865A\u5047\u4F0F\u7B14\uFF0C\u5C01\u5B58\u5176\u4E00\u5F20\u975E\u54CD\u5E94\u624B\u724C\u76F4\u5230\u4F60\u7684\u4E0B\u56DE\u5408\uFF0C\u7136\u540E\u5BF9\u5176\u9020\u62101\u70B9\u4F24\u5BB3\u3002", effect: "tsukuyomi" } },
    { id: "sasuke", name: "\u5B87\u667A\u6CE2\u4F50\u52A9", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u7206\u53D1", hp: 4, glyph: "\u96F7", color: "#6576d8", skills: [{ name: "\u5199\u8F6E\u773C\u8FFD\u730E", text: "\u5929\u624B\u529B\u6807\u8BB0\u76EE\u6807\u540E\uFF0C\u4F60\u5BF9\u5176\u53D1\u52A8\u7684\u7A81\u51FB\u65E0\u89C6\u8DDD\u79BB\uFF0C\u5E76\u5728\u547D\u4E2D\u524D\u989D\u5916\u8981\u6C421\u5F20\u9632\u5FA1\u3002" }, { name: "\u5343\u9E1F\u8D2F\u7A7F", text: "\u6807\u8BB0\u76EE\u6807\u7684\u7A81\u51FB\u5FFD\u7565\u9632\u62A4\u88C5\u7532\uFF1B\u82E5\u76EE\u6807\u6210\u529F\u9632\u4F4F\uFF0C\u4F60\u4ECD\u53EF\u64781\u5F20\u724C\u3002" }], signature: { name: "\u9E92\u9E9F", cost: 4, target: "swapMarked", text: "\u6D88\u8017\u5929\u624B\u529B\u6807\u8BB0\uFF0C\u5BF9\u76EE\u6807\u53D1\u52A8\u4E00\u6B21\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\u4E14\u5FFD\u7565\u9632\u62A4\u88C5\u7532\u7684\u7A81\u51FB\uFF1B\u547D\u4E2D\u540E\u76EE\u6807\u5F031\u5F20\u724C\u3002", effect: "kirin" } },
    { id: "kakashi", name: "\u65D7\u6728\u5361\u5361\u897F", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u7206\u53D1", hp: 3, glyph: "\u62F7", color: "#8695ad", skills: [{ name: "\u67E5\u514B\u62C9\u56DE\u6536", text: "\u6BCF\u8F6E\u9996\u6B21\u4F7F\u7528\u4E00\u5F20\u62F7\u8D1D\u724C\u540E\uFF0C\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" }, { name: "\u6218\u672F\u5224\u65AD", text: "\u62F7\u8D1D\u57FA\u7840\u724C\u4F1A\u5F3A\u5316\u4E0B\u4E00\u6B21\u653B\u51FB\uFF1B\u62F7\u8D1D\u7B56\u7565\u724C\u4F1A\u4EE4\u4E0B\u4E00\u6B21\u76EE\u6807\u9009\u62E9\u65E0\u6CD5\u88AB\u5F3A\u5236\u4ECB\u5165\u3002" }], signature: { name: "\u795E\u5A01\u96F7\u5207", cost: 2, target: "enemy", text: "\u6D88\u8017\u4E00\u5F20\u62F7\u8D1D\u724C\uFF1A\u57FA\u7840\u724C\u5316\u4E3A\u53CC\u9632\u5F3A\u88AD\uFF1B\u7B56\u7565\u724C\u62B9\u9664\u76EE\u68071\u5F20\u4F0F\u7B14\u6216\u88C5\u5907\u5E76\u5C06\u5176\u884C\u52A8\u540E\u79FB\u3002", effect: "kamuiRaikiri" } },
    { id: "hinata", name: "\u65E5\u5411\u96CF\u7530", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u63A7\u5236", hp: 3, glyph: "\u77B3", color: "#9a91d8", skills: [{ name: "\u516B\u5366\u9886\u57DF", text: "\u4F60\u5BF9\u767D\u773C\u9501\u5B9A\u76EE\u6807\u7684\u653B\u51FB\u65E0\u89C6\u8DDD\u79BB\u4E0E\u9632\u62A4\u88C5\u7532\u3002" }, { name: "\u67D4\u62F3\u5C01\u7A74", text: "\u6BCF\u8F6E\u9996\u6B21\u5BF9\u9501\u5B9A\u76EE\u6807\u4F7F\u7528\u7B56\u7565\u724C\u540E\uFF0C\u4EE4\u5176\u65E0\u6CD5\u83B7\u5F97\u80FD\u91CF\u76F4\u5230\u56DE\u5408\u7ED3\u675F\uFF1B\u9501\u5B9A\u76EE\u6807\u7684\u9632\u5FA1\u4E0D\u80FD\u89E6\u53D1\u989D\u5916\u6478\u724C\u3002" }], signature: { name: "\u516B\u5366\u516D\u5341\u56DB\u638C", cost: 4, target: "scouted", text: "\u4EC5\u5BF9\u767D\u773C\u9501\u5B9A\u76EE\u6807\uFF1A\u9020\u62101\u70B9\u4F24\u5BB3\uFF0C\u6E05\u7A7A\u5176\u80FD\u91CF\uFF0C\u5E76\u5C01\u9501\u80FD\u91CF\u83B7\u53D6\u4E0E\u62DB\u724C\u6280\u76F4\u5230\u5176\u56DE\u5408\u7ED3\u675F\u3002", effect: "sixtyFourPalms" } },
    { id: "jiraiya", name: "\u81EA\u6765\u4E5F", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u7206\u53D1", hp: 4, glyph: "\u4ED9", color: "#b9554e", skills: [{ name: "\u86E4\u87C6\u534F\u653B", text: "\u88AB\u675F\u7F1A\u89D2\u8272\u5F03\u724C\u7EE7\u7EED\u51FA\u724C\u65F6\uFF0C\u4F60\u83B7\u5F971\u70B9\u80FD\u91CF\uFF1B\u5176\u653E\u5F03\u5F03\u724C\u5BFC\u81F4\u51FA\u724C\u53D6\u6D88\u65F6\uFF0C\u4F60\u64781\u5F20\u724C\u3002" }, { name: "\u4ED9\u672F\u67E5\u514B\u62C9", text: "\u6BCF\u8F6E\u9996\u6B21\u9020\u6210\u4F24\u5BB3\u4E0E\u9996\u6B21\u53D7\u5230\u4F24\u5BB3\u65F6\u5404\u83B7\u5F971\u679A\u4ED9\u672F\u5370\u3002\u62E5\u6709\u4ED9\u672F\u5370\u65F6\u653B\u51FB\u8DDD\u79BB+1\uFF0C\u96C6\u9F502\u679A\u540E\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u5E76\u5FFD\u7565\u9632\u5177\u3002" }], signature: { name: "\u4ED9\u6CD5\xB7\u4E94\u53F3\u536B\u95E8", cost: 4, target: "enemy", text: "\u6700\u591A\u9009\u62E9\u4E24\u540D\u8DDD\u79BB2\u4EE5\u5185\u654C\u4EBA\uFF0C\u5404\u97002\u5F20\u9632\u5FA1\uFF0C\u5426\u5219\u53D7\u52302\u70B9\u4F24\u5BB3\uFF1B\u4ED9\u672F\u5171\u9E23\u53EF\u5F3A\u5316\u5176\u4E2D\u4E00\u540D\u76EE\u6807\uFF0C\u86E4\u87C6\u675F\u7F1A\u76EE\u6807\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\u3002", effect: "goemon" } },
    { id: "orochimaru", name: "\u5927\u86C7\u4E38", series: "\u706B\u5F71\u5FCD\u8005", packId: "naruto_genesis", pack: "\u5FCD\u754C\u521D\u9635", role: "\u8BE1\u672F", hp: 4, glyph: "\u86C7", color: "#9aa65b", skills: [{ name: "\u86C7\u8715", text: "\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u4F24\u5BB3\u65F6\uFF0C\u53EF\u6D88\u8017\u5B9E\u9A8C\u724C\u4EE4\u4F24\u5BB3-1\uFF0C\u5E76\u5C06\u8BE5\u724C\u7684\u7C7B\u522B\u8BB0\u5F55\u4E3A\u4F60\u7684\u4E0B\u4E00\u6B21\u7814\u7A76\u65B9\u5411\u3002" }, { name: "\u7981\u672F\u5BB9\u5668", text: "\u5492\u5370\u593A\u53D6\u7684\u724C\u53EF\u6B63\u5E38\u4F7F\u7528\uFF0C\u4E5F\u53EF\u5728\u4E0D\u5C38\u8F6C\u751F\u4E2D\u8F6C\u5316\uFF1B\u4F7F\u7528\u540C\u7C7B\u522B\u724C\u65F6\u989D\u5916\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" }], signature: { name: "\u4E0D\u5C38\u8F6C\u751F", cost: 2, target: "self", text: "\u6D88\u8017\u4E00\u5F20\u5B9E\u9A8C\u724C\uFF1A\u57FA\u7840\u724C\u56DE\u590D1\u4F53\u529B\u5E76\u83B7\u62A4\u76FE\uFF0C\u7B56\u7565\u724C\u51C0\u5316\u4F0F\u7B14\u4E0E\u5C01\u9501\uFF0C\u88C5\u5907\u724C\u76F4\u63A5\u88C5\u5907\u5E76\u83B7\u62A4\u76FE\u3002", effect: "immortality" } },
    { id: "luffy", name: "\u8499\u5947\xB7D\xB7\u8DEF\u98DE", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u7206\u53D1", hp: 4, glyph: "\u738B", color: "#ef5b56", dream: { name: "\u6210\u4E3A\u6D77\u8D3C\u738B", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u56E0\u81EA\u8EAB\u6280\u80FD\u5931\u53BB\u4F53\u529B\u6216\u4EE5\u7A81\u51FB\u9020\u6210\u4F24\u5BB3", awakenText: "\u4E94\u6863\u989D\u5916\u4EE4\u672C\u56DE\u5408\u8DDD\u79BB\u65E0\u9650\uFF0C\u4E14\u4E0B\u4E00\u6B21\u7A81\u51FB\u5FFD\u7565\u9632\u5177\u3002" }, skills: [{ name: "\u89C1\u95FB\u8272", text: "\u6BCF\u8F6E\u9996\u6B21\u6210\u4E3A\u7A81\u51FB\u76EE\u6807\u65F6\u5C55\u793A\u724C\u5806\u9876\uFF1B\u57FA\u7840\u724C\u89C6\u4E3A1\u5F20\u9632\u5FA1\u5F03\u7F6E\uFF0C\u5176\u4ED6\u724C\u6536\u5165\u624B\u724C\u3002" }, { name: "\u8D8A\u6218\u8D8A\u52C7", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u5931\u53BB\u4F53\u529B\u540E\uFF0C\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1\u3002" }], signature: { name: "\u4E94\u6863", cost: 4, target: "self", text: "\u56DE\u590D1\u70B9\u4F53\u529B\u3001\u64782\u5F20\u724C\uFF0C\u672C\u56DE\u5408\u7A81\u51FB\u6B21\u6570+1\uFF1B\u89C9\u9192\u540E\u672C\u56DE\u5408\u8DDD\u79BB\u65E0\u9650\u4E14\u4E0B\u4E00\u6B21\u7A81\u51FB\u5FFD\u7565\u9632\u5177\u3002", effect: "gearFive" } },
    { id: "chopper", name: "\u6258\u5C3C\u6258\u5C3C\xB7\u4E54\u5DF4", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u8F85\u52A9", hp: 3, glyph: "\u533B", color: "#ef8fa7", dream: { name: "\u6210\u4E3A\u4E07\u80FD\u836F", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u4EE4\u4ED6\u4EBA\u5B9E\u9645\u56DE\u590D\u4F53\u529B", awakenText: "\u533B\u672F\u53EF\u6E05\u96641\u5C42\u6BD2\u3001\u5C11\u6478\u724C\u3001\u80FD\u91CF\u5C01\u9501\u6216\u62DB\u724C\u6280\u5C01\u9501\uFF1B\u6709\u5F02\u5E38\u65F6\u53EF\u9009\u62E9\u6EE1\u4F53\u529B\u76EE\u6807\u3002" }, skills: [{ name: "\u8BCA\u65AD", text: "\u6BCF\u8F6E\u9996\u6B21\u4EE4\u4ED6\u4EBA\u56DE\u590D\u540E\uFF0C\u53CC\u65B9\u5404\u64781\u5F20\u724C\u3002" }, { name: "\u6BDB\u76AE\u5F3A\u5316", text: "\u6BCF\u8F6E\u9996\u6B21\u9700\u8981\u9632\u5FA1\u65F6\uFF0C\u53EF\u5C06\u4EFB\u610F\u975E\u54CD\u5E94\u57FA\u7840\u724C\u5F53\u4F5C1\u5F20\u9632\u5FA1\u3002" }], signature: { name: "\u602A\u7269\u5F3A\u5316", cost: 4, target: "self", text: "\u83B7\u5F972\u70B9\u62A4\u76FE\u3001\u64781\u5F20\u724C\uFF0C\u672C\u56DE\u5408\u7A81\u51FB\u6B21\u6570\u548C\u8DDD\u79BB\u5404+1\u3002", effect: "monsterPoint" } },
    { id: "zoro", name: "\u7F57\u7F57\u8BFA\u4E9A\xB7\u7D22\u9686", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u7206\u53D1", hp: 4, glyph: "\u5251", color: "#79b765", dream: { name: "\u4E16\u754C\u7B2C\u4E00\u5927\u5251\u8C6A", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u7ED3\u7B97\u4E09\u5200\u6D41\u5F3A\u5316\u7A81\u51FB\u6216\u963F\u4FEE\u7F57", awakenText: "\u963F\u4FEE\u7F57\u6D88\u8017\u964D\u4E3A3\uFF0C\u547D\u4E2D\u540E\u64781\u5F20\u724C\u3002" }, skills: [{ name: "\u4E09\u5200\u6D41", text: "\u5F031\u5F20\u975E\u54CD\u5E94\u724C\uFF0C\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1\u4E14\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\uFF1B\u5F03\u88C5\u5907\u724C\u65F6\u8FD8\u5FFD\u7565\u9632\u5177\u3002" }, { name: "\u5251\u58EB\u672C\u80FD", text: "\u6B66\u5668\u63D0\u4F9B\u7684\u653B\u51FB\u8DDD\u79BB\u989D\u5916+1\uFF1B\u6BCF\u56DE\u5408\u9996\u6B21\u7A81\u51FB\u88AB\u5B8C\u5168\u9632\u5FA1\u540E\u64781\u5F20\u3002" }], signature: { name: "\u4E5D\u5200\u6D41\xB7\u963F\u4FEE\u7F57", cost: 4, target: "enemy", text: "\u53D1\u52A8\u4E00\u6B21\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\u4E14\u5FFD\u7565\u9632\u5177\u7684\u5F3A\u88AD\uFF1B\u89C9\u9192\u540E\u6D88\u8017\u964D\u4E3A3\uFF0C\u547D\u4E2D\u540E\u64781\u5F20\u3002", effect: "asura" } },
    { id: "nami", name: "\u5A1C\u7F8E", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u8D44\u6E90", hp: 3, glyph: "\u822A", color: "#e5a75d", dream: { name: "\u7ED8\u5236\u4E16\u754C\u5730\u56FE", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u5728\u540C\u4E00\u56DE\u5408\u6210\u529F\u4F7F\u7528\u4E24\u79CD\u7C7B\u522B\u7684\u724C", awakenText: "\u822A\u6D77\u672F\u6539\u770B4\u5F20\u5E76\u83B7\u5F97\u5176\u4E2D\u7C7B\u522B\u4E0D\u540C\u76842\u5F20\u3002" }, skills: [{ name: "\u6C14\u8C61\u68D2", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u4F7F\u7528\u7B56\u7565\u724C\u540E\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" }, { name: "\u987A\u98CE\u822A\u7EBF", text: "\u822A\u6D77\u672F\u540E\u7684\u4E0B\u4E00\u5F20\u5355\u76EE\u6807\u7B56\u7565\u65E0\u89C6\u8DDD\u79BB\uFF1B\u82E5\u88AB\u53CD\u5236\u5219\u8FD4\u56DE\u624B\u724C\u3002" }], signature: { name: "\u96F7\u4E91\u5B99\u65AF", cost: 4, target: "enemy", text: "\u76EE\u6807\u5F032\u5F20\u724C\uFF0C\u5426\u5219\u53D7\u52302\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", effect: "zeus" } },
    { id: "usopp", name: "\u4E4C\u7D22\u666E", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u8BE1\u672F", hp: 3, glyph: "\u72D9", color: "#d39b62", dream: { name: "\u52C7\u6562\u7684\u6D77\u4E0A\u6218\u58EB", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u4EE4\u4ED6\u4EBA\u5F03\u724C\u6216\u53D6\u6D88\u724C", awakenText: "\u6BCF\u8F6E\u9996\u6B21\u89E6\u53D1\u8C0E\u8A00\u540E\uFF0C\u6697\u7F6E\u724C\u8FD4\u56DE\u624B\u724C\uFF1B\u672A\u89E6\u53D1\u7684\u8C0E\u8A00\u5728\u4E0B\u56DE\u5408\u5F00\u59CB\u65F6\u5F03\u7F6E\u3002" }, skills: [{ name: "\u72D9\u51FB\u738B", text: "\u5BF9\u8C0E\u8A00\u76EE\u6807\u4F7F\u7528\u7A81\u51FB\u6216\u5355\u76EE\u6807\u7B56\u7565\u65E0\u89C6\u8DDD\u79BB\u3002" }, { name: "\u8BC8\u672F\u56DE\u6536", text: "\u76EE\u6807\u5F03\u724C\u7EE7\u7EED\u65F6\u64781\uFF1B\u76EE\u6807\u653E\u5F03\u5BFC\u81F4\u53D6\u6D88\u65F6\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" }], signature: { name: "\u7EFF\u661F\xB7\u51B2\u51FB\u72FC\u8349", cost: 3, target: "enemy", text: "\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\uFF1B\u6D88\u8017\u8BE5\u76EE\u6807\u7684\u8C0E\u8A00\u540E\u5FFD\u7565\u9632\u5177\u4E14\u4E0D\u53EF\u4ECB\u5165\u3002", effect: "impactWolf" } },
    { id: "sanji", name: "\u6587\u65AF\u83AB\u514B\xB7\u5C71\u6CBB", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u7206\u53D1/\u8F85\u52A9", hp: 4, glyph: "\u8E22", color: "#c9a36b", dream: { name: "\u627E\u5230ALL BLUE", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u4EE4\u4ED6\u4EBA\u56DE\u590D\u6216\u83B7\u5F97\u81EA\u5DF1\u4EA4\u51FA\u7684\u724C", awakenText: "\u6D77\u4E0A\u9910\u5385\u8FD8\u4EE4\u76EE\u6807\u64781\u5F20\u724C\u3002" }, skills: [{ name: "\u9ED1\u8DB3", text: "\u672A\u88C5\u5907\u6B66\u5668\u65F6\uFF0C\u7A81\u51FB\u8DDD\u79BB+1\u4E14\u5FFD\u7565\u9632\u5177\u3002" }, { name: "\u63F4\u62A4\u53CD\u51FB", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u4EE4\u4ED6\u4EBA\u56DE\u590D\u6216\u4ECE\u81EA\u5DF1\u5904\u83B7\u5F97\u724C\u540E\uFF0C\u4E0B\u4E00\u6B21\u7A81\u51FB\u65E0\u89C6\u8DDD\u79BB\u4E14\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\u3002" }], signature: { name: "\u9B54\u795E\u98CE\u811A", cost: 4, target: "enemy", text: "\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\uFF1B\u82E5\u63F4\u62A4\u53CD\u51FB\u5F85\u89E6\u53D1\uFF0C\u672C\u6B21\u4E0D\u53EF\u4ECB\u5165\u3002", effect: "diableJambe" } },
    { id: "robin", name: "\u59AE\u53EF\xB7\u7F57\u5BBE", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u63A7\u5236", hp: 3, glyph: "\u82B1", color: "#a77cd2", dream: { name: "\u89E3\u8BFB\u771F\u6B63\u7684\u5386\u53F2", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u67E5\u770B\u9690\u85CF\u724C", awakenText: "\u767E\u82B1\u641C\u67E5\u5C55\u793A2\u5F20\u968F\u673A\u975E\u54CD\u5E94\u724C\uFF0C\u7531\u7F57\u5BBE\u9009\u62E9\u5176\u4E2D1\u5F20\u8FDB\u884C\u540C\u7C7B\u522B\u5C01\u5B58\u3002" }, skills: [{ name: "\u5386\u53F2\u5B66\u8005", text: "\u6BCF\u8F6E\u9996\u6B21\u67E5\u770B\u539F\u672C\u9690\u85CF\u7684\u624B\u724C\u6216\u4F0F\u7B14\u540E\u64781\u5F20\u724C\u3002" }, { name: "\u767E\u82B1\u7F2D\u4E71", text: "\u5355\u76EE\u6807\u7B56\u7565\u724C\u65E0\u89C6\u8DDD\u79BB\u3002" }], signature: { name: "\u4E07\u7D2B\u5343\u7EA2\xB7\u5DE8\u5927\u6811", cost: 3, target: "enemy", text: "\u6309\u5EA7\u6B21\u9010\u4E00\u5F031\u5F20\u724C\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", effect: "giganteFleur" } },
    { id: "franky", name: "\u5F17\u5170\u5947", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u8D44\u6E90/\u9632\u5FA1", hp: 4, glyph: "\u673A", color: "#4cb8d1", dream: { name: "\u9020\u51FA\u68A6\u60F3\u4E4B\u8239", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u6709\u88C5\u5907\u8FDB\u5165\u6216\u79BB\u5F00\u81EA\u5DF1\u7684\u88C5\u5907\u533A", awakenText: "\u6539\u9020\u5DE5\u574A\u53D6\u5F97\u7684\u88C5\u5907\u53EF\u76F4\u63A5\u88C5\u5907\uFF0C\u66FF\u6362\u4E0B\u6765\u7684\u65E7\u88C5\u5907\u8FD4\u56DE\u624B\u724C\u3002" }, skills: [{ name: "\u53EF\u4E50\u80FD\u6E90", text: "\u6BCF\u8F6E\u9996\u6B21\u6709\u88C5\u5907\u8FDB\u5165\u6216\u79BB\u5F00\u81EA\u5DF1\u7684\u88C5\u5907\u533A\u65F6\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" }, { name: "\u94A2\u94C1\u4E4B\u8EAF", text: "\u672A\u88C5\u5907\u9632\u5177\u65F6\uFF0C\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u7684\u7A81\u51FB\u4F24\u5BB3-1\u3002" }], signature: { name: "\u5F17\u5170\u5947\u5C06\u519B", cost: 4, target: "self", text: "\u4ECE\u5F03\u724C\u5806\u5206\u522B\u9009\u62E91\u4EF6\u6B66\u5668\u548C\u9632\u5177\u76F4\u63A5\u88C5\u5907\uFF0C\u4E0D\u5B58\u5728\u7684\u7C7B\u522B\u6539\u4E3A\u64781\uFF0C\u6700\u540E\u83B7\u5F971\u70B9\u62A4\u76FE\u3002", effect: "frankyGeneral" } },
    { id: "brook", name: "\u5E03\u9C81\u514B", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u63A7\u5236/\u8F85\u52A9", hp: 3, glyph: "\u9B42", color: "#9bb6dd", dream: { name: "\u4E0E\u62C9\u5E03\u518D\u4F1A", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u4EE4\u4ED6\u4EBA\u6478\u540E\u5F03\u724C\u6216\u83B7\u5F97\u5C11\u6478\u724C\u72B6\u6001", awakenText: "\u9996\u6B21\u53D7\u5230\u81F4\u547D\u4F24\u5BB3\u65F6\u6539\u4E3A\u4FDD\u75591\u4F53\u529B\uFF0C\u5F03\u7F6E\u5168\u90E8\u624B\u724C\u5E76\u6E05\u7A7A\u80FD\u91CF\u3002" }, skills: [{ name: "\u9EC4\u6CC9\u5BD2\u6C14", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u4EE5\u7A81\u51FB\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u4EE4\u76EE\u6807\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u3002" }, { name: "\u7075\u9B42\u51FA\u7A8D", text: "\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u7684\u7B56\u7565\u4F24\u5BB3-1\u3002" }], signature: { name: "\u9F3B\u6B4C\u4E09\u4E01\xB7\u7BAD\u5C3E\u65A9", cost: 4, target: "enemy", text: "\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\uFF1B\u5373\u4F7F\u5B8C\u5168\u9632\u5FA1\uFF0C\u76EE\u6807\u4ECD\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u3002", effect: "arrowNotch" } },
    { id: "jinbe", name: "\u751A\u5E73", series: "\u6D77\u8D3C\u738B", packId: "one_piece_grand_line", pack: "\u4F1F\u5927\u822A\u8DEF", role: "\u9632\u5FA1", hp: 4, glyph: "\u6D77", color: "#4f8fc5", dream: { name: "\u4FC3\u6210\u4EBA\u9C7C\u4E0E\u4EBA\u7C7B\u5171\u878D", conditionText: "\u6BCF\u8F6E\u9996\u6B21\u7ED9\u4E88\u4ED6\u4EBA\u62A4\u76FE\u6216\u4EE5\u4FA0\u4E49\u51CF\u5C11\u4ED6\u4EBA\u4F24\u5BB3", awakenText: "\u6D77\u6D41\u62A4\u822A\u4EE5\u4ED6\u4EBA\u4E3A\u76EE\u6807\u65F6\u65E0\u9700\u5F03\u724C\uFF1B\u4EE5\u81EA\u5DF1\u4E3A\u76EE\u6807\u4ECD\u9700\u5F03\u724C\u3002" }, skills: [{ name: "\u4FA0\u4E49", text: "\u6BCF\u8F6E\u4E00\u6B21\uFF0C\u8DDD\u79BB1\u5185\u5176\u4ED6\u89D2\u8272\u5C06\u53D7\u5230\u4F24\u5BB3\u65F6\uFF0C\u53EF\u5F031\u5F20\u57FA\u7840\u724C\u4EE4\u4F24\u5BB3-1\u3002" }, { name: "\u9C7C\u4EBA\u7A7A\u624B\u9053", text: "\u62E5\u6709\u62A4\u76FE\u65F6\uFF0C\u7A81\u51FB\u5FFD\u7565\u9632\u5177\u3002" }], signature: { name: "\u6B66\u8D56\u8D2F", cost: 4, target: "enemy", text: "\u5BF9\u8DDD\u79BB2\u4EE5\u5185\u654C\u65B9\u9020\u62102\u70B9\u4F24\u5BB3\u3001\u9700\u89812\u5F20\u9632\u5FA1\uFF1B\u547D\u4E2D\u540E\u81EA\u5DF1\u83B7\u5F971\u70B9\u62A4\u76FE\u3002", effect: "vagabondDrill" } },
    { id: "ichigo", name: "\u9ED1\u5D0E\u4E00\u62A4", series: "\u6B7B\u795E", role: "\u8F93\u51FA", hp: 4, glyph: "\u65A9", color: "#e78b39", skills: [{ name: "\u65A9\u6708", text: "\u4F60\u7684\u653B\u51FB\u8DDD\u79BB+1\u3002" }, { name: "\u6218\u610F", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u653B\u51FB\u88AB\u9632\u5FA1\u540E\u64781\u5F20\u724C\u3002" }], signature: { name: "\u534D\u89E3", cost: 4, target: "self", text: "\u672C\u56DE\u5408\u653B\u51FB\u8DDD\u79BB\u65E0\u9650\u3001\u653B\u51FB\u6B21\u6570+1\uFF0C\u5E76\u64781\u5F20\u653B\u51FB\u724C\u3002", effect: "bankai" } },
    { id: "rukia", name: "\u673D\u6728\u9732\u742A\u4E9A", series: "\u6B7B\u795E", role: "\u63A7\u5236", hp: 3, glyph: "\u96EA", color: "#9fb9e9", skills: [{ name: "\u521D\u821E\xB7\u6708\u767D", text: "\u653B\u51FB\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u76EE\u6807\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u724C\u3002" }, { name: "\u8896\u767D\u96EA", text: "\u4F60\u4F7F\u7528\u5355\u76EE\u6807\u7B56\u7565\u724C\u65F6\u65E0\u89C6\u8DDD\u79BB\u3002" }], signature: { name: "\u767D\u971E\u7F5A", cost: 4, target: "enemy", text: "\u4EE4\u76EE\u6807\u4E0B\u4E2A\u51FA\u724C\u9636\u6BB5\u65E0\u6CD5\u4F7F\u7528\u653B\u51FB\u548C\u7B56\u7565\u724C\u3002", effect: "freeze" } },
    { id: "tanjiro", name: "\u7076\u95E8\u70AD\u6CBB\u90CE", series: "\u9B3C\u706D\u4E4B\u5203", role: "\u8F93\u51FA", hp: 4, glyph: "\u70AD", color: "#55aa8a", skills: [{ name: "\u55C5\u89C9", text: "\u56DE\u5408\u5F00\u59CB\u989D\u5916\u89C2\u770B\u724C\u5806\u9876\u724C\uFF1B\u82E5\u4E3A\u57FA\u7840\u724C\u5219\u83B7\u5F97\u3002" }, { name: "\u6C34\u4E4B\u547C\u5438", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u653B\u51FB\u88AB\u9632\u5FA1\u540E\uFF0C\u53EF\u5F031\u5F20\u724C\u518D\u64781\u5F20\u3002" }], signature: { name: "\u706B\u4E4B\u795E\u795E\u4E50", cost: 4, target: "enemy", text: "\u53D1\u52A8\u4E00\u6B21\u4F24\u5BB3+1\u7684\u653B\u51FB\u3002", effect: "powerAttack" } },
    { id: "shinobu", name: "\u80E1\u8776\u5FCD", series: "\u9B3C\u706D\u4E4B\u5203", role: "\u63A7\u5236", hp: 3, glyph: "\u8776", color: "#a678d3", skills: [{ name: "\u6BD2\u5203", text: "\u653B\u51FB\u9020\u6210\u4F24\u5BB3\u540E\u9644\u52A0\u6BD2\uFF1B\u76EE\u6807\u56DE\u5408\u7ED3\u675F\u5931\u53BB1\u70B9\u4F53\u529B\u3002" }, { name: "\u8F7B\u8EAB", text: "\u6CA1\u6709\u9632\u5177\u65F6\uFF0C\u5176\u4ED6\u89D2\u8272\u8BA1\u7B97\u4E0E\u4F60\u7684\u8DDD\u79BB+1\u3002" }], signature: { name: "\u8708\u86A3\u4E4B\u821E", cost: 4, target: "enemy", text: "\u65E0\u8BBA\u662F\u5426\u88AB\u9632\u5FA1\uFF0C\u76EE\u6807\u90FD\u4F1A\u83B7\u5F97\u5267\u6BD2\u3002", effect: "venomStrike" } },
    { id: "gojo", name: "\u4E94\u6761\u609F", series: "\u5492\u672F\u56DE\u6218", role: "\u9632\u5FA1", hp: 3, glyph: "\u221E", color: "#75bff2", skills: [{ name: "\u65E0\u4E0B\u9650", text: "\u6BCF\u8F6E\u9996\u6B21\u6210\u4E3A\u653B\u51FB\u76EE\u6807\u65F6\uFF0C\u653B\u51FB\u8005\u987B\u989D\u5916\u5F031\u5F20\u724C\uFF0C\u5426\u5219\u653B\u51FB\u65E0\u6548\u3002" }], signature: { name: "\u865A\u5F0F\xB7\u8308", cost: 4, target: "enemy", text: "\u76EE\u6807\u5F032\u5F20\u724C\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u4F24\u5BB3\u5E76\u5931\u53BB\u88C5\u5907\u3002", effect: "hollowPurple" } },
    { id: "yuji", name: "\u864E\u6756\u60A0\u4EC1", series: "\u5492\u672F\u56DE\u6218", role: "\u8D44\u6E90", hp: 4, glyph: "\u62F3", color: "#e66b7c", skills: [{ name: "\u5F84\u5EAD\u62F3", text: "\u6BCF\u56DE\u5408\u9996\u6B21\u653B\u51FB\u547D\u4E2D\u540E\uFF0C\u76EE\u6807\u5F031\u5F20\u724C\u3002" }, { name: "\u4E0D\u5C48\u5BB9\u5668", text: "\u6BCF\u8F6E\u9996\u6B21\u4F53\u529B\u964D\u81F32\u6216\u4EE5\u4E0B\u65F6\u64782\u5F20\u724C\u3002" }], signature: { name: "\u9ED1\u95EA", cost: 3, target: "enemy", text: "\u53D1\u52A8\u4E00\u6B21\u653B\u51FB\uFF1B\u547D\u4E2D\u65F6\u4F24\u5BB3+1\uFF0C\u88AB\u9632\u5FA1\u5219\u8FD4\u8FD82\u70B9\u80FD\u91CF\u3002", effect: "blackFlash" } },
    { id: "mikasa", name: "\u4E09\u7B20\xB7\u963F\u514B\u66FC", series: "\u8FDB\u51FB\u7684\u5DE8\u4EBA", role: "\u7206\u53D1", hp: 3, glyph: "\u7FFC", color: "#b8bac8", skills: [{ name: "\u963F\u514B\u66FC\u672C\u80FD", text: "\u6BCF\u8F6E\u9996\u6B21\u9700\u8981\u9632\u5FA1\u65F6\uFF0C\u53EF\u5F031\u5F20\u724C\u4EE3\u66FF\u3002" }, { name: "\u7ACB\u4F53\u673A\u52A8", text: "\u88C5\u5907\u6B66\u5668\u65F6\u653B\u51FB\u8DDD\u79BB+1\u3002" }], signature: { name: "\u96F7\u67AA", cost: 4, target: "enemy", text: "\u76EE\u6807\u5F03\u7F6E\u6240\u6709\u88C5\u5907\uFF0C\u5426\u5219\u53D7\u52302\u70B9\u4F24\u5BB3\u3002", effect: "thunderSpear" } },
    { id: "armin", name: "\u963F\u5C14\u654F\xB7\u4E9A\u9C81\u96F7\u7279", series: "\u8FDB\u51FB\u7684\u5DE8\u4EBA", role: "\u8F85\u52A9", hp: 3, glyph: "\u7B56", color: "#e2c58c", skills: [{ name: "\u6218\u672F\u63A9\u62A4", text: "\u6BCF\u8F6E\u9996\u6B21\u6709\u53CB\u65B9\u53D7\u4F24\u540E\uFF0C\u4EE4\u5176\u64781\u5F20\u724C\u3002" }], signature: { name: "\u8D85\u5927\u578B\u5DE8\u4EBA", cost: 4, target: "self", text: "\u5931\u53BB1\u70B9\u4F53\u529B\uFF1B\u6240\u6709\u654C\u65B9\u5F031\u5F20\u724C\uFF0C\u6240\u6709\u53CB\u65B9\u64781\u5F20\u724C\u3002", effect: "colossal" } }
  ].map((character) => ({ ...character, handLimit: characterHandLimits[character.id] || 4 }));
  var activeSkills = {
    naruto: { name: "\u5F71\u5206\u8EAB", target: "self", cost: 1, costText: "1\u80FD\u91CF \xB7 \u5B581\u5F20\u57FA\u7840\u724C", effect: "shadowClone", text: "\u5C061\u5F20\u975E\u54CD\u5E94\u57FA\u7840\u724C\u6B63\u9762\u7F6E\u4E3A\u5206\u8EAB\u3002\u5206\u8EAB\u533A\u6700\u591A1\u5F20\uFF0C\u6BCF\u56DE\u5408\u9650\u4E00\u6B21\u3002" },
    gaara: { name: "\u7802\u7F1A", target: "enemy", cost: 1, costText: "1\u80FD\u91CF", effect: "sandBind", text: "\u4EE4\u8DDD\u79BB2\u4EE5\u5185\u4E00\u540D\u654C\u65B9\u5F031\u5F20\u724C\u5E76\u5728\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\uFF1B\u82E5\u5176\u6CA1\u6709\u624B\u724C\uFF0C\u5219\u6539\u4E3A\u53D7\u52301\u70B9\u4F24\u5BB3\u3002" },
    sakura: { name: "\u767E\u8C6A\u5370", target: "self", costText: "\u84C4\u5370\u6216\u89E3\u653E \xB7 \u6BCF\u56DE\u5408\u4E00\u6B21", effect: "byakugoStore", text: "\u9009\u62E9\u84C4\u51651\u5F20\u4E0D\u540C\u7C7B\u522B\u624B\u724C\uFF0C\u6216\u4E3B\u52A8\u89E3\u653E\u5DF2\u6709\u767E\u8C6A\u724C\uFF1B\u5177\u4F53\u8F6C\u5316\u6536\u76CA\u7531\u89D2\u8272\u6280\u80FD\u51B3\u5B9A\u3002" },
    shikamaru: { name: "\u843D\u5B50", target: "future", costText: "\u672C\u8F6E\u672A\u884C\u52A8\u89D2\u8272", effect: "chessMove", text: "\u5728\u672C\u8F6E\u5C1A\u672A\u884C\u52A8\u7684\u4E00\u540D\u89D2\u8272\u8EAB\u4E0A\u653E\u7F6E\u68CB\u5B50\u3002\u573A\u4E0A\u53EA\u80FD\u67091\u679A\u4F60\u7684\u68CB\u5B50\u3002" },
    itachi: { name: "\u5E7B\u8C61\u5E03\u7F6E", target: "enemy", costText: "\u6697\u7F6E1\u5F20\u975E\u4F0F\u7B14\u724C", effect: "illusionPlot", text: "\u5C061\u5F20\u975E\u4F0F\u7B14\u624B\u724C\u4F2A\u88C5\u6210\u672A\u77E5\u4F0F\u7B14\u5E76\u6307\u5B9A\u5176\u4ED6\u89D2\u8272\uFF0C\u5360\u7528\u6B63\u5E38\u4F0F\u7B14\u69FD\u4F4D\u3002" },
    sasuke: { name: "\u5929\u624B\u529B", target: "enemy", cost: 1, costText: "1\u80FD\u91CF \xB7 \u4EA4\u6362\u88C5\u5907", effect: "amenotejikara", text: "\u4E0E\u8DDD\u79BB2\u4EE5\u5185\u4E00\u540D\u654C\u65B9\u4EA4\u6362\u4E00\u4E2A\u975E\u7A7A\u88C5\u5907\u69FD\uFF0C\u5E76\u5C06\u5176\u6807\u8BB0\u4E3A\u8FFD\u730E\u76EE\u6807\u3002" },
    kakashi: { name: "\u62F7\u8D1D\u5FCD\u672F", target: "self", cost: 1, costText: "1\u80FD\u91CF \xB7 \u590D\u523B\u5F03\u724C", effect: "copyNinjutsu", text: "\u4ECE\u5F03\u724C\u5806\u9009\u62E9\u4E00\u5F20\u975E\u54CD\u5E94\u57FA\u7840\u724C\u6216\u5373\u65F6\u7B56\u7565\u724C\uFF0C\u751F\u6210\u4E00\u5F20\u4EC5\u6301\u7EED\u5230\u672C\u56DE\u5408\u7ED3\u675F\u7684\u62F7\u8D1D\u3002" },
    hinata: { name: "\u767D\u773C", target: "enemy", costText: "\u9501\u5B9A\u8DDD\u79BB2\u5185\u654C\u65B9", effect: "byakugan", text: "\u9501\u5B9A\u4E00\u540D\u654C\u65B9\u76F4\u5230\u4F60\u7684\u4E0B\u56DE\u5408\u5F00\u59CB\uFF1B\u4F60\u53EF\u5728\u89D2\u8272\u8BE6\u60C5\u4E2D\u67E5\u770B\u5176\u624B\u724C\u540D\u79F0\u4E0E\u771F\u5B9E\u4F0F\u7B14\u3002" },
    jiraiya: { name: "\u901A\u7075\xB7\u86E4\u87C6\u53E3\u675F\u7F1A", target: "enemy", cost: 2, costText: "2\u80FD\u91CF \xB7 \u8DDD\u79BB2\u5185 \xB7 \u6BCF\u8F6E\u4E00\u6B21", effect: "toadBind", text: "\u6BCF\u8F6E\u9650\u4E00\u6B21\uFF0C\u675F\u7F1A\u4E00\u540D\u654C\u4EBA\uFF1B\u5176\u672C\u56DE\u5408\u9996\u6B21\u4F7F\u7528\u653B\u51FB\u6216\u7B56\u7565\u724C\u65F6\uFF0C\u987B\u5F031\u5F20\u724C\uFF0C\u5426\u5219\u8BE5\u724C\u88AB\u53D6\u6D88\u3002" },
    orochimaru: { name: "\u5492\u5370\u5B9E\u9A8C", target: "enemy", costText: "\u5F031\u5F20\u724C\u4F5C\u4E3A\u6837\u672C", effect: "curseExperiment", text: "\u5F031\u5F20\u624B\u724C\u5E76\u5C06\u5176\u7C7B\u522B\u8BBE\u4E3A\u7814\u7A76\u65B9\u5411\uFF1B\u76EE\u6807\u5728\u4F60\u4E0B\u56DE\u5408\u524D\u9996\u6B21\u5C1D\u8BD5\u4F7F\u7528\u540C\u7C7B\u724C\u65F6\uFF0C\u8BE5\u724C\u88AB\u4F60\u593A\u53D6\u4E3A\u5B9E\u9A8C\u724C\u3002" },
    luffy: { name: "\u4E8C\u6863", target: "self", costText: "\u5931\u53BB1\u4F53\u529B", effect: "secondGear", text: "\u5931\u53BB1\u70B9\u4F53\u529B\u5E76\u64782\u5F20\u724C\uFF0C\u672C\u56DE\u5408\u653B\u51FB\u6B21\u6570+1\u3002" },
    chopper: { name: "\u533B\u672F", target: "ally", costText: "\u5F031\u57FA\u7840\u724C", effect: "medicine", text: "\u5F031\u5F20\u57FA\u7840\u724C\uFF0C\u4EE4\u4E00\u540D\u53D7\u4F24\u53CB\u65B9\u56DE\u590D1\u70B9\u4F53\u529B\u3002" },
    zoro: { name: "\u4E09\u5200\u6D41", target: "self", costText: "\u5F031\u975E\u54CD\u5E94\u724C", effect: "threeSwordStyle", text: "\u5F031\u5F20\u975E\u54CD\u5E94\u724C\uFF0C\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1\u4E14\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\uFF1B\u5F03\u88C5\u5907\u724C\u65F6\u8FD8\u5FFD\u7565\u9632\u5177\u3002" },
    nami: { name: "\u822A\u6D77\u672F", target: "self", costText: "\u5C55\u793A\u724C\u5806\u98763\u5F20", effect: "navigation", text: "\u5C55\u793A\u724C\u5806\u98763\u5F20\u5E76\u83B7\u5F971\u5F20\uFF0C\u5176\u4F59\u724C\u9010\u5F20\u9009\u62E9\u7F6E\u9876\u6216\u7F6E\u5E95\u3002" },
    usopp: { name: "\u8C0E\u8A00\u5F39", target: "enemy", cost: 1, costText: "1\u80FD\u91CF \xB7 \u6697\u7F6E1\u5F20\u624B\u724C", effect: "lieShot", text: "\u5C061\u5F20\u975E\u54CD\u5E94\u624B\u724C\u6697\u7F6E\u4E3A\u8C0E\u8A00\u5E76\u6307\u5B9A\u654C\u4EBA\uFF1B\u76EE\u6807\u4E0B\u4E00\u5F20\u975E\u54CD\u5E94\u724C\u7ED3\u7B97\u524D\u987B\u5F03\u724C\uFF0C\u5426\u5219\u8BE5\u724C\u53D6\u6D88\u3002" },
    sanji: { name: "\u6D77\u4E0A\u9910\u5385", target: "ally", costText: "\u5F031\u7B56\u7565\u6216\u88C5\u5907\u724C", effect: "allBlueKitchen", text: "\u5F031\u5F20\u7B56\u7565\u724C\u6216\u88C5\u5907\u724C\uFF0C\u4EE4\u4E00\u540D\u5176\u4ED6\u53D7\u4F24\u89D2\u8272\u56DE\u590D1\u70B9\u4F53\u529B\u3002" },
    robin: { name: "\u767E\u82B1\u641C\u67E5", target: "enemy", cost: 0, costText: "\u8DDD\u79BB2\u5185 \xB7 \u4E0D\u6D88\u8017\u80FD\u91CF", effect: "flowerSeizure", text: "\u4E0D\u6D88\u8017\u80FD\u91CF\uFF0C\u5C55\u793A\u76EE\u68071\u5F20\u968F\u673A\u975E\u54CD\u5E94\u624B\u724C\uFF1B\u53EF\u5F03\u540C\u7C7B\u522B\u724C\uFF0C\u5C06\u5C55\u793A\u724C\u5C01\u5B58\u81F3\u76EE\u6807\u4E0B\u56DE\u5408\u5F00\u59CB\u3002" },
    franky: { name: "\u6539\u9020\u5DE5\u574A", target: "self", cost: 1, costText: "1\u80FD\u91CF \xB7 \u5F03\u724C\u5806\u88C5\u5907", effect: "workshop", text: "\u4ECE\u5F03\u724C\u5806\u9009\u62E91\u5F20\u88C5\u5907\u724C\u52A0\u5165\u624B\u724C\uFF1B\u89C9\u9192\u540E\u53EF\u76F4\u63A5\u88C5\u5907\u3002" },
    brook: { name: "\u7075\u9B42\u4E50\u7AE0", target: "enemy", cost: 1, costText: "1\u80FD\u91CF \xB7 \u8DDD\u79BB2\u5185 \xB7 \u6BCF\u8F6E\u4E00\u6B21", effect: "soulConcert", text: "\u6BCF\u8F6E\u4E00\u6B21\uFF0C\u6D88\u80171\u70B9\u80FD\u91CF\uFF0C\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF0C\u53CC\u65B9\u5404\u64781\u5F20\uFF0C\u7136\u540E\u76EE\u6807\u5F031\u5F20\u3002" },
    jinbe: { name: "\u6D77\u6D41\u62A4\u822A", target: "other", costText: "\u5F031\u5F20\u724C", effect: "oceanGuard", text: "\u5F031\u5F20\u724C\uFF0C\u4EE4\u4EFB\u610F\u5B58\u6D3B\u89D2\u8272\u83B7\u5F971\u70B9\u62A4\u76FE\u3002" },
    ichigo: { name: "\u6708\u7259\u5929\u51B2", target: "enemy", cost: 1, costText: "1\u80FD\u91CF", effect: "getsuga", text: "\u5BF9\u8DDD\u79BB2\u4EE5\u5185\u4E00\u540D\u654C\u65B9\u53D1\u52A8\u4E00\u6B21\u865A\u62DF\u653B\u51FB\u3002" },
    rukia: { name: "\u521D\u821E\xB7\u6708\u767D", target: "enemy", cost: 1, costText: "1\u80FD\u91CF", effect: "firstDance", text: "\u4EE4\u4E00\u540D\u654C\u65B9\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u724C\u3002" },
    tanjiro: { name: "\u5168\u96C6\u4E2D\u547C\u5438", target: "self", costText: "\u5F031\u5F20\u724C", effect: "totalConcentration", text: "\u5F031\u5F20\u724C\u5E76\u64782\u5F20\uFF0C\u672C\u56DE\u5408\u653B\u51FB\u8DDD\u79BB+1\u3002" },
    shinobu: { name: "\u6BD2\u5203\u6D82\u5E03", target: "self", cost: 1, costText: "1\u80FD\u91CF", effect: "poisonCoat", text: "\u672C\u56DE\u5408\u4E0B\u4E00\u6B21\u653B\u51FB\u65E0\u8BBA\u662F\u5426\u547D\u4E2D\uFF0C\u90FD\u9644\u52A01\u5C42\u6BD2\u3002" },
    gojo: { name: "\u516D\u773C", target: "self", costText: "\u65E0\u6D88\u8017", effect: "sixEyes", text: "\u64782\u5F20\u724C\uFF0C\u7136\u540E\u5F031\u5F20\u724C\u3002\u6BCF\u56DE\u5408\u9650\u4E00\u6B21\u3002" },
    yuji: { name: "\u5F84\u5EAD\u62F3", target: "self", cost: 1, costText: "1\u80FD\u91CF", effect: "divergentPrep", text: "\u672C\u56DE\u5408\u4E0B\u4E00\u6B21\u653B\u51FB\u547D\u4E2D\u65F6\u4F24\u5BB3+1\u3002" },
    mikasa: { name: "\u7ACB\u4F53\u673A\u52A8", target: "self", costText: "\u5F031\u5F20\u724C", effect: "odmGear", text: "\u5F031\u5F20\u724C\uFF0C\u672C\u56DE\u5408\u653B\u51FB\u6B21\u6570\u4E0E\u653B\u51FB\u8DDD\u79BB\u5404+1\u3002" },
    armin: { name: "\u732E\u7B56", target: "ally", costText: "\u4EA4\u7ED91\u5F20\u724C", effect: "tacticalGift", text: "\u5C061\u5F20\u624B\u724C\u4EA4\u7ED9\u4E00\u540D\u53CB\u65B9\uFF0C\u4EE4\u5176\u518D\u64781\u5F20\u724C\u3002" }
  };
  var portraitPath = (characterId) => `./assets/portraits/${characterId}.webp`;
  var illustratedCardIds = /* @__PURE__ */ new Set([
    "attack",
    "guard",
    "heal",
    "focus",
    "overdrive",
    "adapt",
    "counter",
    "memory_exchange",
    "equipment_shift",
    "tactical_relay",
    "energy_auction",
    "intervene",
    "initiative_swap",
    "limit_contract",
    "causal_mark",
    "rhythm_break",
    "guardian_oath",
    "return_route",
    "delayed_cast",
    "echo_script",
    "dimensional_barrage",
    "rift_invasion",
    "will_duel",
    "mind_burn",
    "energy_collapse",
    "weapon",
    "piercer",
    "repeater",
    "impact_hammer",
    "armor",
    "reflector",
    "adaptive_armor",
    "limit_shield",
    "charm",
    "battery",
    "memory_core",
    "life_pendant"
  ]);
  var cardArtPath = (cardId) => illustratedCardIds.has(cardId) ? `./assets/cards/${cardId}.webp` : null;
  var tableSeatLayouts = {
    4: {
      1: { x: 13, y: 43 },
      2: { x: 50, y: 8 },
      3: { x: 87, y: 43 }
    },
    8: {
      1: { x: 10, y: 65 },
      2: { x: 11, y: 31 },
      3: { x: 27, y: 7 },
      4: { x: 50, y: 4 },
      5: { x: 73, y: 7 },
      6: { x: 89, y: 31 },
      7: { x: 90, y: 65 }
    }
  };
  function tableSeatPosition(playerCount, seat) {
    return tableSeatLayouts[playerCount]?.[seat] || { x: 50, y: 10 };
  }
  var cardDefinitions = {
    attack: { id: "attack", name: "\u7A81\u51FB", type: "basic", effect: "attack", targetMode: "enemy", icon: "\u65A9", description: "\u5BF9\u653B\u51FB\u8303\u56F4\u5185\u4E00\u540D\u89D2\u8272\u4F7F\u7528\uFF0C\u9020\u62101\u70B9\u4F24\u5BB3\u3002", color: "red" },
    guard: { id: "guard", name: "\u9632\u5FA1", type: "basic", effect: "guard", icon: "\u76FE", description: "\u54CD\u5E94\u7A81\u51FB\uFF0C\u62B5\u6D88\u6B64\u6B21\u4F24\u5BB3\u3002", color: "blue", responseOnly: true },
    heal: { id: "heal", name: "\u6062\u590D", type: "basic", effect: "heal", targetMode: "self", icon: "\u6108", description: "\u56DE\u590D1\u70B9\u4F53\u529B\uFF1B\u91CD\u4F24\u6551\u63F4\u65F6\u53EF\u5BF9\u91CD\u4F24\u89D2\u8272\u4F7F\u7528\u3002", color: "green" },
    focus: { id: "focus", name: "\u84C4\u80FD", type: "basic", effect: "focus", targetMode: "self", icon: "\u80FD", description: "\u83B7\u5F971\u70B9\u80FD\u91CF\u5E76\u64781\u5F20\u724C\u3002", color: "gold" },
    overdrive: { id: "overdrive", name: "\u8D85\u8F7D", type: "basic", effect: "overdrive", targetMode: "self", icon: "\u7206", description: "\u6BCF\u56DE\u5408\u96501\u6B21\uFF0C\u4EE4\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1\uFF1B\u81EA\u5DF1\u91CD\u4F24\u65F6\u6539\u4E3A\u56DE\u590D1\u70B9\u4F53\u529B\u3002", color: "red" },
    adapt: { id: "adapt", name: "\u5E94\u53D8", type: "basic", effect: "adapt", targetMode: "choice", icon: "\u53D8", description: "\u5F53\u4F5C\u9664\u5E94\u53D8\u5916\u7684\u4EFB\u610F\u57FA\u7840\u724C\u4F7F\u7528\uFF0C\u987B\u9075\u5B88\u5BF9\u5E94\u4F7F\u7528\u6761\u4EF6\u3002", color: "cyan" },
    counter: { id: "counter", name: "\u53CD\u5236", type: "strategy", effect: "counter", strategyKind: "response", icon: "\u9006", description: "\u62B5\u6D88\u4E00\u5F20\u6B63\u5728\u4EE5\u81EA\u5DF1\u4E3A\u76EE\u6807\u6216\u5BF9\u81EA\u5DF1\u5E03\u7F6E\u7684\u7B56\u7565\u724C\u3002", fullDescription: "\u5728\u4E00\u5F20\u7B56\u7565\u724C\u5373\u5C06\u4EE5\u4F60\u4E3A\u76EE\u6807\uFF0C\u6216\u6709\u672A\u77E5\u4F0F\u7B14\u5373\u5C06\u5BF9\u4F60\u5E03\u7F6E\u65F6\u4F7F\u7528\uFF1A\u62B5\u6D88\u8BE5\u7B56\u7565\u724C\u3002\u53CD\u5236\u4E0D\u80FD\u518D\u88AB\u53CD\u5236\uFF0C\u6BCF\u4E2A\u4E8B\u4EF6\u6700\u591A\u6D88\u8017\u4E00\u5F20\u53CD\u5236\u3002", color: "cyan", responseOnly: true },
    memory_exchange: { id: "memory_exchange", name: "\u8BB0\u5FC6\u4EA4\u6362", type: "strategy", effect: "memoryExchange", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", icon: "\u5FC6", description: "\u4F60\u4E0E\u4E00\u540D\u6709\u624B\u724C\u7684\u89D2\u8272\u5404\u79D8\u5BC6\u90091\u5F20\u624B\u724C\uFF0C\u540C\u65F6\u5C55\u793A\u5E76\u4EA4\u6362\u3002", fullDescription: "\u9009\u62E9\u4E00\u540D\u6709\u624B\u724C\u7684\u5176\u4ED6\u89D2\u8272\u3002\u4F60\u4E0E\u5176\u5404\u81EA\u79D8\u5BC6\u9009\u62E9\u4E00\u5F20\u624B\u724C\uFF0C\u7136\u540E\u540C\u65F6\u5C55\u793A\u5E76\u4EA4\u6362\uFF1B\u76EE\u6807\u53EF\u5728\u79D8\u5BC6\u9009\u724C\u524D\u4F7F\u7528\u53CD\u5236\u3002\u6B64\u724C\u53EF\u4EE5\u88AB\u5F3A\u5236\u4ECB\u5165\u8F6C\u79FB\u76EE\u6807\u3002", color: "violet" },
    equipment_shift: { id: "equipment_shift", name: "\u88C5\u5907\u8F6C\u79FB", type: "strategy", effect: "equipmentShift", strategyKind: "instant", counterable: true, targetMode: "twoPlayers", icon: "\u8F6C", description: "\u9009\u62E9\u4E24\u540D\u89D2\u8272\u548C\u4E00\u4E2A\u88C5\u5907\u69FD\uFF0C\u4EA4\u6362\u8BE5\u69FD\u88C5\u5907\uFF0C\u5141\u8BB8\u4E00\u65B9\u4E3A\u7A7A\u3002", fullDescription: "\u9009\u62E9\u4E24\u540D\u89D2\u8272\u548C\u6B66\u5668\u3001\u9632\u5177\u6216\u9970\u54C1\u4E2D\u7684\u4E00\u4E2A\u69FD\u4F4D\uFF0C\u4EA4\u6362\u53CC\u65B9\u8BE5\u69FD\u88C5\u5907\uFF0C\u5141\u8BB8\u4E00\u65B9\u4E3A\u7A7A\u3002\u53D7\u5F71\u54CD\u89D2\u8272\u4F9D\u6B21\u83B7\u5F97\u53CD\u5236\u673A\u4F1A\uFF0C\u4EFB\u610F\u4E00\u4EBA\u53CD\u5236\u5373\u53D6\u6D88\u6574\u5F20\u724C\uFF1B\u88C5\u5907\u79FB\u52A8\u4E0D\u4F1A\u89E6\u53D1\u4ECE\u624B\u724C\u88C5\u5907\u65F6\u7684\u6548\u679C\u3002", color: "violet" },
    tactical_relay: { id: "tactical_relay", name: "\u6218\u672F\u63A5\u529B", type: "strategy", effect: "tacticalRelay", strategyKind: "instant", targetMode: "other", icon: "\u63A5", description: "\u5C061\u5F20\u57FA\u7840\u724C\u4EA4\u7ED9\u5176\u4ED6\u89D2\u8272\uFF1B\u5176\u53EF\u7ACB\u5373\u4F7F\u7528\uFF0C\u6210\u529F\u540E\u53CC\u65B9\u5404\u83B71\u80FD\u91CF\u3002", fullDescription: "\u5C06\u4E00\u5F20\u57FA\u7840\u724C\u4EA4\u7ED9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u3002\u5176\u53EF\u4EE5\u7ACB\u5373\u6309\u7167\u6B63\u5E38\u76EE\u6807\u89C4\u5219\u4F7F\u7528\uFF1B\u82E5\u6210\u529F\u4F7F\u7528\uFF0C\u4F60\u4E0E\u5176\u5404\u83B7\u5F971\u70B9\u80FD\u91CF\uFF0C\u5426\u5219\u5176\u4FDD\u7559\u8BE5\u724C\u3002", color: "gold" },
    energy_auction: { id: "energy_auction", name: "\u80FD\u91CF\u7ADE\u9010", type: "strategy", effect: "energyAuction", strategyKind: "instant", targetMode: "self", icon: "\u7ADE", description: "\u5168\u5458\u79D8\u5BC6\u62950\u20132\u80FD\u91CF\uFF1B\u552F\u4E00\u6700\u9AD8\u8005\u64783\u5F031\uFF0C\u5E76\u5217\u6700\u9AD8\u8005\u5404\u64781\u3002", fullDescription: "\u6240\u6709\u5B58\u6D3B\u89D2\u8272\u79D8\u5BC6\u6295\u51650\u81F32\u70B9\u80FD\u91CF\u5E76\u540C\u65F6\u516C\u5F00\u3002\u552F\u4E00\u6700\u9AD8\u8005\u64783\u5F20\u724C\u540E\u5F031\u5F20\uFF1B\u6700\u9AD8\u503C\u5E76\u5217\u8005\u5404\u64781\u5F20\uFF1B\u6240\u6709\u4EBA\u90FD\u6295\u51650\u65F6\uFF0C\u4F7F\u7528\u8005\u64781\u5F20\u3002\u6295\u5165\u7684\u80FD\u91CF\u4E0D\u4F1A\u8FD4\u8FD8\u3002", color: "gold" },
    intervene: { id: "intervene", name: "\u5F3A\u5236\u4ECB\u5165", type: "strategy", effect: "intervene", strategyKind: "response", icon: "\u4ECB", description: "\u4EE3\u66FF\u5176\u4ED6\u89D2\u8272\u6210\u4E3A\u5355\u76EE\u6807\u7A81\u51FB\u6216\u53EF\u8F6C\u79FB\u5373\u65F6\u7B56\u7565\u7684\u76EE\u6807\uFF0C\u7ED3\u7B97\u540E\u64781\u3002", fullDescription: "\u5F53\u5176\u4ED6\u89D2\u8272\u6210\u4E3A\u5355\u76EE\u6807\u7A81\u51FB\u6216\u6807\u8BB0\u4E3A\u53EF\u8F6C\u79FB\u7684\u5373\u65F6\u7B56\u7565\u76EE\u6807\u65F6\u4F7F\u7528\uFF1A\u5C06\u76EE\u6807\u6539\u4E3A\u4F60\u3002\u8BE5\u4E8B\u4EF6\u7ED3\u7B97\u7ED3\u675F\u4E14\u4F60\u4ECD\u5B58\u6D3B\u65F6\u64781\u5F20\u724C\uFF1B\u6BCF\u4E2A\u4E8B\u4EF6\u6700\u591A\u53D1\u751F\u4E00\u6B21\u5F3A\u5236\u4ECB\u5165\u3002", color: "cyan", responseOnly: true },
    initiative_swap: { id: "initiative_swap", name: "\u65F6\u5E8F\u6539\u5199", type: "strategy", effect: "initiativeSwap", strategyKind: "instant", counterable: true, targetMode: "futureTwo", icon: "\u5E8F", description: "\u4EA4\u6362\u672C\u8F6E\u5C1A\u672A\u884C\u52A8\u7684\u4E24\u540D\u89D2\u8272\u7684\u884C\u52A8\u987A\u5E8F\uFF0C\u4E0D\u6539\u53D8\u5EA7\u6B21\u4E0E\u8DDD\u79BB\u3002", fullDescription: "\u9009\u62E9\u672C\u8F6E\u5C1A\u672A\u884C\u52A8\u7684\u4E24\u540D\u89D2\u8272\uFF0C\u4EA4\u6362\u5176\u5728\u672C\u8F6E\u5269\u4F59\u884C\u52A8\u961F\u5217\u4E2D\u7684\u987A\u5E8F\u3002\u53CC\u65B9\u4F9D\u6B21\u83B7\u5F97\u53CD\u5236\u673A\u4F1A\uFF1B\u6B64\u6548\u679C\u4E0D\u6539\u53D8\u6C38\u4E45\u5EA7\u6B21\u3001\u8DDD\u79BB\u6216\u4E0B\u4E00\u8F6E\u7684\u6B63\u5E38\u987A\u5E8F\u3002", color: "violet" },
    limit_contract: { id: "limit_contract", name: "\u6781\u9650\u5951\u7EA6", type: "strategy", effect: "limitContract", strategyKind: "instant", targetMode: "other", icon: "\u5951", description: "\u76EE\u6807\u9009\u62E9\u7206\u53D1\uFF08\u83B72\u80FD\u91CF\u3001\u4F60\u64781\uFF0C\u5176\u4E0B\u56DE\u5408\u672B\u59311\u4F53\u529B\uFF09\u6216\u5C01\u5B58\uFF08\u5176\u64782\u3001\u4F60\u83B71\u80FD\u91CF\uFF0C\u5176\u62DB\u724C\u6280\u9501\u5B9A\u81F3\u4E0B\u56DE\u5408\u672B\uFF09\u3002", fullDescription: "\u76EE\u6807\u9009\u62E9\u4E00\u9879\uFF1A\u7206\u53D1\u2014\u2014\u76EE\u6807\u83B7\u5F972\u70B9\u80FD\u91CF\uFF0C\u4F60\u64781\u5F20\u724C\uFF0C\u76EE\u6807\u4E0B\u56DE\u5408\u7ED3\u675F\u65F6\u5931\u53BB1\u70B9\u4F53\u529B\uFF1B\u5C01\u5B58\u2014\u2014\u76EE\u6807\u64782\u5F20\u724C\uFF0C\u4F60\u83B7\u5F971\u70B9\u80FD\u91CF\uFF0C\u76EE\u6807\u7684\u62DB\u724C\u6280\u9501\u5B9A\u81F3\u5176\u4E0B\u56DE\u5408\u7ED3\u675F\u3002", color: "red" },
    dimensional_barrage: { id: "dimensional_barrage", name: "\u6B21\u5143\u5F39\u5E55", type: "strategy", effect: "dimensionalBarrage", strategyKind: "instant", counterable: true, targetMode: "allOther", responsePattern: "guard", icon: "\u5E55", description: "\u6240\u6709\u5176\u4ED6\u89D2\u8272\u4F9D\u5EA7\u6B21\u6253\u51FA\u9632\u5FA1\u6216\u5E94\u53D8\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", fullDescription: "\u5BF9\u6240\u6709\u5176\u4ED6\u5B58\u6D3B\u89D2\u8272\u4F7F\u7528\uFF0C\u4ECE\u4F60\u7684\u4E0B\u5BB6\u5F00\u59CB\u4F9D\u5EA7\u6B21\u9010\u4E2A\u7ED3\u7B97\u3002\u6BCF\u540D\u76EE\u6807\u53EF\u6253\u51FA\u9632\u5FA1\u6216\u5E94\u53D8\uFF0C\u5426\u5219\u53D7\u5230\u4F60\u9020\u6210\u76841\u70B9\u7B56\u7565\u4F24\u5BB3\uFF1B\u5176\u4E5F\u53EF\u4F7F\u7528\u53CD\u5236\uFF0C\u4EC5\u514D\u9664\u5BF9\u81EA\u5DF1\u7684\u6548\u679C\u3002", color: "red" },
    rift_invasion: { id: "rift_invasion", name: "\u88C2\u9699\u4FB5\u88AD", type: "strategy", effect: "riftInvasion", strategyKind: "instant", counterable: true, targetMode: "allOther", responsePattern: "attack", icon: "\u88AD", description: "\u6240\u6709\u5176\u4ED6\u89D2\u8272\u4F9D\u5EA7\u6B21\u6253\u51FA\u7A81\u51FB\u6216\u5E94\u53D8\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", fullDescription: "\u5BF9\u6240\u6709\u5176\u4ED6\u5B58\u6D3B\u89D2\u8272\u4F7F\u7528\uFF0C\u4ECE\u4F60\u7684\u4E0B\u5BB6\u5F00\u59CB\u4F9D\u5EA7\u6B21\u9010\u4E2A\u7ED3\u7B97\u3002\u6BCF\u540D\u76EE\u6807\u53EF\u6253\u51FA\u7A81\u51FB\u6216\u5E94\u53D8\uFF0C\u5426\u5219\u53D7\u5230\u4F60\u9020\u6210\u76841\u70B9\u7B56\u7565\u4F24\u5BB3\uFF1B\u5176\u4E5F\u53EF\u4F7F\u7528\u53CD\u5236\uFF0C\u4EC5\u514D\u9664\u5BF9\u81EA\u5DF1\u7684\u6548\u679C\u3002", color: "red" },
    will_duel: { id: "will_duel", name: "\u610F\u5FD7\u5BF9\u51B3", type: "strategy", effect: "willDuel", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", responsePattern: "duel", icon: "\u51B3", description: "\u76EE\u6807\u5148\u5F00\u59CB\uFF0C\u53CC\u65B9\u4EA4\u66FF\u6253\u51FA\u7A81\u51FB\u6216\u5E94\u53D8\uFF0C\u9996\u5148\u505C\u6B62\u7684\u4E00\u65B9\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", fullDescription: "\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF0C\u7531\u76EE\u6807\u5F00\u59CB\uFF0C\u53CC\u65B9\u4EA4\u66FF\u6253\u51FA\u7A81\u51FB\u6216\u5E94\u53D8\u3002\u9996\u5148\u65E0\u6CD5\u6216\u9009\u62E9\u4E0D\u6253\u51FA\u724C\u7684\u4E00\u65B9\uFF0C\u53D7\u5230\u5BF9\u65B9\u9020\u6210\u76841\u70B9\u7B56\u7565\u4F24\u5BB3\u3002\u54CD\u5E94\u724C\u4E0D\u8BA1\u5165\u56DE\u5408\u7A81\u51FB\u6B21\u6570\uFF0C\u4E5F\u4E0D\u89E6\u53D1\u7A81\u51FB\u4E13\u5C5E\u6548\u679C\u3002", color: "red" },
    mind_burn: { id: "mind_burn", name: "\u7CBE\u795E\u707C\u70E7", type: "strategy", effect: "mindBurn", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "handOther", icon: "\u707C", description: "\u76EE\u6807\u5C55\u793A1\u5F20\u624B\u724C\uFF1B\u4F60\u53EF\u5F03\u7F6E1\u5F20\u76F8\u540C\u7C7B\u522B\u624B\u724C\uFF0C\u5BF9\u5176\u9020\u62101\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", fullDescription: "\u9009\u62E9\u4E00\u540D\u6709\u624B\u724C\u7684\u5176\u4ED6\u89D2\u8272\u3002\u76EE\u6807\u5148\u5C55\u793A\u4E00\u5F20\u624B\u724C\uFF0C\u4F60\u53EF\u4EE5\u5F03\u7F6E\u4E00\u5F20\u4E0E\u5C55\u793A\u724C\u540C\u7C7B\u522B\u7684\u5176\u4ED6\u624B\u724C\uFF1B\u82E5\u5F03\u7F6E\uFF0C\u5BF9\u76EE\u6807\u9020\u62101\u70B9\u7B56\u7565\u4F24\u5BB3\u3002\u88AB\u53CD\u5236\u65F6\u4E0D\u4F1A\u5C55\u793A\u624B\u724C\uFF0C\u5C55\u793A\u724C\u7ED3\u7B97\u540E\u4ECD\u7559\u5728\u76EE\u6807\u624B\u4E2D\u3002", color: "violet" },
    energy_collapse: { id: "energy_collapse", name: "\u80FD\u91CF\u5D29\u89E3", type: "strategy", effect: "energyCollapse", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", icon: "\u5D29", description: "\u76EE\u6807\u6D88\u80172\u70B9\u80FD\u91CF\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\uFF1B\u80FD\u91CF\u4E0D\u8DB3\u65F6\u53EA\u80FD\u53D7\u5230\u4F24\u5BB3\u3002", fullDescription: "\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u3002\u76EE\u6807\u9009\u62E9\u6D88\u80172\u70B9\u80FD\u91CF\uFF0C\u6216\u53D7\u5230\u4F60\u9020\u6210\u76841\u70B9\u7B56\u7565\u4F24\u5BB3\uFF1B\u80FD\u91CF\u4E0D\u8DB32\u70B9\u65F6\u53EA\u80FD\u53D7\u5230\u4F24\u5BB3\u3002\u88AB\u6D88\u8017\u7684\u80FD\u91CF\u76F4\u63A5\u79FB\u9664\uFF0C\u4E0D\u4F1A\u8F6C\u79FB\u7ED9\u4F7F\u7528\u8005\u3002", color: "gold" },
    causal_mark: { id: "causal_mark", name: "\u56E0\u679C\u6807\u8BB0", type: "strategy", effect: "causalMark", strategyKind: "plot", hidden: true, counterable: true, targetMode: "other", icon: "\u56E0", description: "\u4F0F\u7B14\uFF1A\u76EE\u6807\u9996\u6B21\u9020\u6210\u4F24\u5BB3\u65F6\u4F60\u64782\u5E76\u83B71\u80FD\u91CF\uFF1B\u672A\u89E6\u53D1\u5230\u671F\u65F6\u76EE\u6807\u64781\u3002", fullDescription: "\u6697\u7F6E\u5E76\u6307\u5B9A\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u3002\u5176\u5728\u4F60\u4E0B\u56DE\u5408\u5F00\u59CB\u524D\u9996\u6B21\u5B9E\u9645\u9020\u6210\u4F24\u5BB3\u65F6\u89E6\u53D1\uFF1A\u4F60\u64782\u5F20\u724C\u5E76\u83B7\u5F971\u70B9\u80FD\u91CF\uFF1B\u82E5\u5230\u671F\u524D\u59CB\u7EC8\u6CA1\u6709\u89E6\u53D1\uFF0C\u8BE5\u76EE\u6807\u64781\u5F20\u724C\u3002", color: "violet" },
    rhythm_break: { id: "rhythm_break", name: "\u8282\u594F\u65AD\u70B9", type: "strategy", effect: "rhythmBreak", strategyKind: "plot", hidden: true, counterable: true, targetMode: "other", icon: "\u65AD", description: "\u4F0F\u7B14\uFF1A\u76EE\u6807\u5C1D\u8BD5\u4F7F\u7528\u7B2C3\u5F20\u975E\u54CD\u5E94\u724C\u65F6\uFF0C\u987B\u5F03\u53E61\u5F20\u624B\u724C\uFF0C\u5426\u5219\u53D6\u6D88\u8BE5\u724C\u5E76\u7ED3\u675F\u51FA\u724C\u3002", fullDescription: "\u6697\u7F6E\u5E76\u6307\u5B9A\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u3002\u5176\u5728\u4E00\u4E2A\u51FA\u724C\u9636\u6BB5\u5C1D\u8BD5\u4F7F\u7528\u7B2C3\u5F20\u975E\u54CD\u5E94\u724C\u65F6\u89E6\u53D1\uFF1A\u5176\u5F03\u7F6E\u53E6\u4E00\u5F20\u624B\u724C\u4F7F\u5F53\u524D\u724C\u7EE7\u7EED\uFF0C\u6216\u53D6\u6D88\u5F53\u524D\u724C\u5E76\u7ACB\u5373\u7ED3\u675F\u51FA\u724C\u9636\u6BB5\u3002", color: "red" },
    guardian_oath: { id: "guardian_oath", name: "\u5B88\u62A4\u8A93\u7EA6", type: "strategy", effect: "guardianOath", strategyKind: "plot", hidden: true, counterable: true, targetMode: "any", icon: "\u8A93", description: "\u4F0F\u7B14\uFF1A\u76EE\u6807\u5728\u4F60\u4E0B\u56DE\u5408\u524D\u9996\u6B21\u5C06\u53D7\u5230\u7684\u4F24\u5BB3-1\u3002", fullDescription: "\u6697\u7F6E\u5E76\u6307\u5B9A\u4E00\u540D\u5B58\u6D3B\u89D2\u8272\u3002\u5176\u5728\u4F60\u4E0B\u56DE\u5408\u5F00\u59CB\u524D\u9996\u6B21\u5C06\u53D7\u5230\u4F24\u5BB3\u65F6\u89E6\u53D1\uFF0C\u4EE4\u8BE5\u6B21\u4F24\u5BB3\u51CF\u5C111\u70B9\uFF1B\u591A\u4E2A\u4E0D\u540C\u8BBE\u7F6E\u8005\u7684\u5B88\u62A4\u8A93\u7EA6\u53EF\u4EE5\u5206\u522B\u89E6\u53D1\u3002", color: "blue" },
    return_route: { id: "return_route", name: "\u56DE\u51FB\u8F68\u8FF9", type: "strategy", effect: "returnRoute", strategyKind: "plot", hidden: true, counterable: true, targetMode: "any", icon: "\u8FD4", description: "\u4F0F\u7B14\uFF1A\u76EE\u6807\u6210\u4E3A\u5355\u76EE\u6807\u7A81\u51FB\u7684\u76EE\u6807\u540E\uFF0C\u7ED3\u7B97\u5B8C\u53EF\u65E0\u89C6\u8DDD\u79BB\u53CD\u51FB\u3002", fullDescription: "\u6697\u7F6E\u5E76\u6307\u5B9A\u4E00\u540D\u5B58\u6D3B\u89D2\u8272\u3002\u5176\u6210\u4E3A\u5355\u76EE\u6807\u7A81\u51FB\u7684\u76EE\u6807\u65F6\u89E6\u53D1\uFF1B\u539F\u7A81\u51FB\u7ED3\u7B97\u5B8C\u6BD5\u540E\uFF0C\u5176\u53EF\u4EE5\u5BF9\u653B\u51FB\u8005\u6253\u51FA\u4E00\u5F20\u4E0D\u8BA1\u6B21\u6570\u4E14\u65E0\u89C6\u8DDD\u79BB\u7684\u7A81\u51FB\u3002", color: "red" },
    delayed_cast: { id: "delayed_cast", name: "\u5EF6\u8FDF\u548F\u5531", type: "strategy", effect: "delayedCast", strategyKind: "plot", hidden: true, targetMode: "self", icon: "\u548F", description: "\u4F0F\u7B14\uFF1A\u4E0B\u56DE\u5408\u5F00\u59CB\u9009\u62E9\u64782\u6216\u83B72\u80FD\u91CF\uFF1B\u82E5\u671F\u95F4\u672A\u53D7\u4F24\u5219\u4E24\u9879\u90FD\u83B7\u5F97\u3002", fullDescription: "\u5BF9\u81EA\u5DF1\u6697\u7F6E\u3002\u4F60\u4E0B\u56DE\u5408\u5F00\u59CB\u65F6\u9009\u62E9\u64782\u5F20\u724C\u6216\u83B7\u5F972\u70B9\u80FD\u91CF\uFF1B\u82E5\u5E03\u7F6E\u540E\u6CA1\u6709\u5B9E\u9645\u53D7\u5230\u8FC7\u4F24\u5BB3\uFF0C\u5219\u4E24\u9879\u6548\u679C\u90FD\u83B7\u5F97\u3002", color: "gold" },
    echo_script: { id: "echo_script", name: "\u62DB\u5F0F\u6B8B\u54CD", type: "strategy", effect: "echoScript", strategyKind: "plot", hidden: true, targetMode: "self", icon: "\u54CD", description: "\u4F0F\u7B14\uFF1A\u4E0B\u56DE\u5408\u7B2C1\u5F20\u57FA\u7840\u724C\u7ED3\u7B97\u540E\uFF0C\u5C06\u5176\u4ECE\u5F03\u724C\u5806\u8FD4\u56DE\u624B\u724C\u3002", fullDescription: "\u5BF9\u81EA\u5DF1\u6697\u7F6E\u3002\u4F60\u4E0B\u56DE\u5408\u51FA\u724C\u9636\u6BB5\u4F7F\u7528\u7684\u7B2C1\u5F20\u57FA\u7840\u724C\u7ED3\u7B97\u540E\uFF0C\u5C06\u8BE5\u5B9E\u4F53\u724C\u4ECE\u5F03\u724C\u5806\u8FD4\u56DE\u624B\u724C\uFF0C\u7136\u540E\u79FB\u9664\u6B64\u4F0F\u7B14\uFF1B\u82E5\u8BE5\u56DE\u5408\u6CA1\u6709\u89E6\u53D1\uFF0C\u56DE\u5408\u7ED3\u675F\u65F6\u79FB\u9664\u3002", color: "cyan" },
    weapon: { id: "weapon", name: "\u589E\u5E45\u6B66\u88C5", type: "equipment", effect: "range", slot: "weapon", rangeBonus: 1, icon: "\u5203", description: "\u653B\u51FB\u8DDD\u79BB+1\u3002", color: "orange" },
    piercer: { id: "piercer", name: "\u7834\u754C\u5203", type: "equipment", effect: "pierceArmor", slot: "weapon", rangeBonus: 1, icon: "\u7834", description: "\u653B\u51FB\u8DDD\u79BB+1\uFF1B\u7A81\u51FB\u5FFD\u7565\u76EE\u6807\u7684\u9632\u5177\u724C\u6548\u679C\u3002", color: "red" },
    repeater: { id: "repeater", name: "\u8FDE\u5C04\u88C5\u7F6E", type: "equipment", effect: "extraAttack", slot: "weapon", rangeBonus: 0, icon: "\u8FDE", description: "\u6BCF\u56DE\u5408\u7A81\u51FB\u6B21\u6570\u4E0A\u9650+1\u3002", color: "orange" },
    impact_hammer: { id: "impact_hammer", name: "\u9707\u8361\u91CD\u9524", type: "equipment", effect: "impact", slot: "weapon", rangeBonus: 2, icon: "\u9707", description: "\u653B\u51FB\u8DDD\u79BB+2\uFF1B\u6BCF\u56DE\u5408\u9996\u6B21\u4EE5\u7A81\u51FB\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u76EE\u6807\u5F031\u5F20\u624B\u724C\u3002", color: "orange" },
    armor: { id: "armor", name: "\u9632\u62A4\u88C5\u7532", type: "equipment", effect: "roundReduction", slot: "armor", icon: "\u7532", description: "\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u7684\u7A81\u51FB\u4F24\u5BB3-1\u3002", color: "blue" },
    reflector: { id: "reflector", name: "\u53CD\u5C04\u5C4F\u969C", type: "equipment", effect: "guardDraw", slot: "armor", icon: "\u53CD", description: "\u6BCF\u8F6E\u9996\u6B21\u4EE5\u9632\u5FA1\u5B8C\u5168\u62B5\u6D88\u7A81\u51FB\u540E\u64781\u3002", color: "cyan" },
    adaptive_armor: { id: "adaptive_armor", name: "\u81EA\u9002\u5E94\u5916\u8863", type: "equipment", effect: "basicAsGuard", slot: "armor", icon: "\u9002", description: "\u6BCF\u8F6E\u4E00\u6B21\uFF0C\u53EF\u5C06\u4E00\u5F20\u975E\u9632\u5FA1\u3001\u975E\u5E94\u53D8\u57FA\u7840\u724C\u5F53\u9632\u5FA1\u3002", color: "blue" },
    limit_shield: { id: "limit_shield", name: "\u9650\u754C\u62A4\u76FE", type: "equipment", effect: "capDamage", slot: "armor", icon: "\u9650", description: "\u53D7\u5230\u81F3\u5C112\u70B9\u4F24\u5BB3\u65F6\u6539\u4E3A1\u70B9\uFF0C\u7136\u540E\u5F03\u7F6E\u6B64\u88C5\u5907\u3002", color: "blue" },
    charm: { id: "charm", name: "\u80FD\u91CF\u6838\u5FC3", type: "equipment", effect: "turnEnergy", slot: "charm", icon: "\u6838", description: "\u56DE\u5408\u5F00\u59CB\u989D\u5916\u83B7\u5F971\u70B9\u80FD\u91CF\u3002", color: "gold" },
    battery: { id: "battery", name: "\u5907\u7528\u7535\u6C60", type: "equipment", effect: "energyCap", slot: "charm", icon: "\u7535", description: "\u80FD\u91CF\u4E0A\u9650+1\uFF0C\u4ECE\u624B\u724C\u88C5\u5907\u65F6\u83B71\u70B9\u80FD\u91CF\u3002", color: "gold" },
    memory_core: { id: "memory_core", name: "\u8BB0\u5FC6\u6676\u4F53", type: "equipment", effect: "handLimit", slot: "charm", icon: "\u5FC6", description: "\u624B\u724C\u4E0A\u9650+2\u3002", color: "violet" },
    life_pendant: { id: "life_pendant", name: "\u751F\u547D\u540A\u5760", type: "equipment", effect: "autoRescue", slot: "charm", icon: "\u751F", description: "\u8FDB\u5165\u91CD\u4F24\u65F6\u81EA\u52A8\u5F03\u7F6E\uFF0C\u5E76\u56DE\u590D\u81F31\u70B9\u4F53\u529B\u3002", color: "green" }
  };
  var deckProfiles = {
    standard144: {
      attack: 31,
      guard: 20,
      heal: 11,
      focus: 6,
      overdrive: 5,
      adapt: 3,
      counter: 5,
      memory_exchange: 3,
      equipment_shift: 2,
      tactical_relay: 3,
      energy_auction: 1,
      intervene: 3,
      initiative_swap: 1,
      limit_contract: 3,
      dimensional_barrage: 2,
      rift_invasion: 2,
      will_duel: 2,
      mind_burn: 2,
      energy_collapse: 2,
      causal_mark: 3,
      rhythm_break: 3,
      guardian_oath: 3,
      return_route: 2,
      delayed_cast: 3,
      echo_script: 3,
      weapon: 2,
      piercer: 2,
      repeater: 2,
      impact_hammer: 1,
      armor: 2,
      reflector: 2,
      adaptive_armor: 1,
      limit_shield: 1,
      charm: 2,
      battery: 2,
      memory_core: 2,
      life_pendant: 1
    },
    compact80: {
      attack: 17,
      guard: 11,
      heal: 6,
      focus: 3,
      overdrive: 3,
      adapt: 2,
      counter: 3,
      memory_exchange: 2,
      equipment_shift: 1,
      tactical_relay: 2,
      energy_auction: 1,
      intervene: 2,
      initiative_swap: 1,
      limit_contract: 1,
      dimensional_barrage: 1,
      rift_invasion: 1,
      will_duel: 1,
      mind_burn: 1,
      energy_collapse: 1,
      causal_mark: 2,
      rhythm_break: 1,
      guardian_oath: 2,
      return_route: 1,
      delayed_cast: 1,
      echo_script: 1,
      weapon: 1,
      piercer: 1,
      repeater: 1,
      impact_hammer: 1,
      armor: 1,
      reflector: 1,
      adaptive_armor: 1,
      limit_shield: 1,
      charm: 1,
      battery: 1,
      memory_core: 1,
      life_pendant: 1
    }
  };
  var deckRecipe = deckProfiles.standard144;
  function getCharacter(id) {
    return characters.find((character) => character.id === id);
  }
  function getMode(id) {
    return modes.find((mode) => mode.id === id);
  }

  // ../src/packs/one-piece.js
  var ONE_PIECE_PACK = "one_piece_grand_line";
  var ONE_PIECE_IDS = /* @__PURE__ */ new Set(["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe"]);
  function isOnePieceCharacter(value) {
    const id = typeof value === "string" ? value : value?.characterId || value?.id;
    return ONE_PIECE_IDS.has(id);
  }
  function initializeOnePieceState(player, character) {
    if (!character || character.packId !== ONE_PIECE_PACK) return player;
    player.dreamState = { progress: 0, awakened: false, progressedRound: 0 };
    player.reviveUsed = false;
    player.navigationWind = false;
    return player;
  }
  function getPlayer(game2, id) {
    return game2.player(id);
  }
  function enemies(game2, sourceId, range = 2) {
    return game2.players.filter((target) => target.alive && target.id !== sourceId && (game2.mode.id === "classic8" || !game2.isAlly(sourceId, target.id)) && game2.distance(sourceId, target.id) <= range).map((target) => target.id);
  }
  function nonResponseCards(target) {
    return target.hand.filter((card) => !card.responseOnly);
  }
  function progress(game2, targetId, reason) {
    const target = getPlayer(game2, targetId), state = target?.dreamState;
    if (!target?.alive || !state || state.awakened || state.progressedRound === game2.round) return false;
    state.progressedRound = game2.round;
    state.progress += 1;
    game2.log("event", game2.nameOf(target) + "\u7684\u68A6\u60F3\u822A\u8FF9\u63A8\u8FDB\u81F3" + state.progress + "/3\uFF08" + reason + "\uFF09");
    if (state.progress >= 3) {
      state.progress = 3;
      state.awakened = true;
      game2.log("event", game2.nameOf(target) + "\u5B9E\u73B0\u68A6\u60F3\u300C" + game2.characterOf(target).dream.name + "\u300D\uFF0C\u7ACB\u5373\u89C9\u9192");
    }
    return true;
  }
  function resetLie(game2, owner) {
    for (const lie of [...owner.specialCards].filter((item) => item.kind === "lie" && item.setTurn < game2.turnNumber)) {
      const index = owner.specialCards.findIndex((item) => item.uid === lie.uid);
      if (index >= 0) owner.specialCards.splice(index, 1);
      if (owner.alive) game2.discard.push(lie.card);
      game2.log("event", game2.nameOf(owner) + "\u672A\u89E6\u53D1\u7684\u8C0E\u8A00\u5F39\u5230\u671F");
    }
  }
  function signatureCost(game2, playerId) {
    const current = getPlayer(game2, playerId), signature = game2.characterOf(current)?.signature;
    if (!signature) return Infinity;
    return current.characterId === "zoro" && current.dreamState?.awakened ? 3 : signature.cost;
  }
  function getOnePieceActiveTargets(game2, playerId, skill) {
    const current = getPlayer(game2, playerId);
    if (!current?.alive || !isOnePieceCharacter(current) || current.turnFlags.activeUsed) return [];
    if (skill.cost && current.energy < skill.cost) return [];
    const enemyIds = enemies(game2, playerId);
    switch (skill.effect) {
      case "secondGear":
        return current.hp > 1 ? [playerId] : [];
      case "threeSwordStyle":
        return nonResponseCards(current).length ? [playerId] : [];
      case "navigation":
        return game2.deck.length ? [playerId] : [];
      case "lieShot":
        return current.energy >= 1 && !current.specialCards.some((item) => item.kind === "lie") && nonResponseCards(current).length ? enemyIds : [];
      case "allBlueKitchen":
        return current.hand.some((card) => card.type === "strategy" || card.type === "equipment") ? game2.players.filter((target) => target.alive && target.id !== playerId && target.hp < target.maxHp && (game2.mode.id === "classic8" || game2.isAlly(playerId, target.id))).map((target) => target.id) : [];
      case "medicine":
        return current.hand.some((card) => card.type === "basic") ? game2.players.filter((target) => target.alive && target.id !== playerId && (game2.mode.id === "classic8" || game2.isAlly(playerId, target.id)) && (target.hp < target.maxHp || current.dreamState?.awakened && (target.poison || target.frozenDraw || target.energyLocked || target.signatureLocked))).map((target) => target.id) : [];
      case "flowerSeizure":
        return enemyIds;
      case "workshop":
        return current.energy >= 1 && game2.discard.some((card) => card.type === "equipment") ? [playerId] : [];
      case "soulConcert":
        return current.roundFlags.soulConcertUsed ? [] : enemyIds;
      case "oceanGuard":
        return game2.players.filter((target) => target.alive && target.id !== playerId).map((target) => target.id);
      default:
        return [];
    }
  }
  function choose(game2, playerId, config) {
    return game2.requestChoice(playerId, config);
  }
  function useOnePieceActive(game2, playerId, targetId, skill) {
    const current = getPlayer(game2, playerId);
    if (!current || !getOnePieceActiveTargets(game2, playerId, skill).includes(targetId)) return { ok: false, reason: "\u6D88\u8017\u4E0D\u8DB3\u6216\u76EE\u6807\u4E0D\u5408\u6CD5" };
    if (skill.cost) current.energy -= skill.cost;
    current.turnFlags.activeUsed = true;
    game2.log("signature", game2.nameOf(current) + "\u53D1\u52A8\u4E3B\u52A8\u6280\u300C" + skill.name + "\u300D");
    switch (skill.effect) {
      case "secondGear":
        game2.loseHp(playerId, 1, null, "skill");
        if (current.alive) {
          game2.draw(playerId, 2);
          current.attackLimit += 1;
        }
        return { ok: true };
      case "threeSwordStyle": {
        const cards = nonResponseCards(current);
        return choose(game2, playerId, {
          title: "\u4E09\u5200\u6D41\uFF1A\u9009\u62E9\u5F03\u724C",
          text: "\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1\u4E14\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1\uFF1B\u82E5\u5F03\u7F6E\u88C5\u5907\u724C\u5219\u5FFD\u7565\u9632\u5177\u3002",
          options: cards.map((card) => ({ value: card.uid, label: "\u5F03\u7F6E\u3010" + card.name + "\u3011", description: card.type === "equipment" ? "\u4E0B\u4E00\u6B21\u7A81\u51FB\u5FFD\u7565\u9632\u5177" : "\u4E0B\u4E00\u6B21\u7A81\u51FB\u4F24\u5BB3+1" })),
          aiChoice: cards[0]?.uid,
          onResolve: (uid) => {
            const chosen = current.hand.find((card) => card.uid === uid && !card.responseOnly);
            if (!chosen) return;
            game2.removeCard(playerId, uid);
            current.turnFlags.nextAttackBonus = true;
            current.turnFlags.nextAttackRequiredGuard = (current.turnFlags.nextAttackRequiredGuard || 0) + 1;
            if (chosen.type === "equipment") current.turnFlags.nextAttackIgnoreArmor = true;
          }
        });
      }
      case "navigation": {
        const pickCount = current.dreamState?.awakened ? 2 : 1;
        const revealed = game2.deck.splice(0, Math.min(current.dreamState?.awakened ? 4 : 3, game2.deck.length));
        const picked = [];
        const finish = () => {
          current.hand.push(...picked);
          const rest = revealed.filter((card) => !picked.some((item) => item.uid === card.uid));
          const tops = [], bottoms = [];
          const placeNext = (index) => {
            if (index >= rest.length) {
              game2.deck.unshift(...tops);
              game2.deck.push(...bottoms);
              current.navigationWind = true;
              return;
            }
            const card = rest[index];
            return choose(game2, playerId, {
              title: "\u822A\u6D77\u672F\uFF1A\u5B89\u6392\u5269\u4F59\u724C",
              text: "\u5C06\u3010" + card.name + "\u3011\u7F6E\u4E8E\u724C\u5806\u9876\u6216\u724C\u5806\u5E95\u3002",
              options: [{ value: "top", label: "\u7F6E\u9876" }, { value: "bottom", label: "\u7F6E\u5E95" }],
              aiChoice: index === 0 ? "top" : "bottom",
              onResolve: (value) => {
                if (value === "top") tops.push(card);
                else bottoms.push(card);
                placeNext(index + 1);
              }
            });
          };
          placeNext(0);
        };
        const choosePick = (index) => {
          if (index >= pickCount || picked.length >= revealed.length) return finish();
          const allAvailable = revealed.filter((card) => !picked.some((item) => item.uid === card.uid));
          const distinct = current.dreamState?.awakened && picked.length ? allAvailable.filter((card) => !picked.some((item) => item.type === card.type)) : allAvailable;
          const available = distinct.length ? distinct : allAvailable;
          return choose(game2, playerId, {
            title: "\u822A\u6D77\u672F\uFF1A\u9009\u62E9\u7B2C" + (index + 1) + "\u5F20\u724C",
            text: "\u4ECE\u5C55\u793A\u7684" + revealed.length + "\u5F20\u724C\u4E2D\u83B7\u5F97" + pickCount + "\u5F20\u3002",
            options: available.map((card) => ({ value: card.uid, label: "\u83B7\u5F97\u3010" + card.name + "\u3011", description: card.description })),
            aiChoice: available[0]?.uid,
            onResolve: (uid) => {
              const card = available.find((item) => item.uid === uid);
              if (card) picked.push(card);
              choosePick(index + 1);
            }
          });
        };
        return choosePick(0);
      }
      case "lieShot": {
        const cards = nonResponseCards(current);
        return choose(game2, playerId, {
          title: "\u8C0E\u8A00\u5F39\uFF1A\u9009\u62E9\u6697\u7F6E\u724C",
          text: "\u5C06\u4E00\u5F20\u724C\u6697\u7F6E\u4E3A\u8C0E\u8A00\uFF0C\u76EE\u6807\u4E3A" + game2.nameOf(targetId) + "\u3002",
          options: cards.map((card) => ({ value: card.uid, label: "\u6697\u7F6E\u3010" + card.name + "\u3011" })),
          aiChoice: cards[0]?.uid,
          onResolve: (uid) => {
            const index = current.hand.findIndex((card2) => card2.uid === uid && !card2.responseOnly);
            if (index < 0) return;
            const [card] = current.hand.splice(index, 1);
            current.specialCards.push({ uid: "lie-" + card.uid, kind: "lie", card, targetId, setTurn: game2.turnNumber });
            game2.log("event", game2.nameOf(current) + "\u5411" + game2.nameOf(targetId) + "\u5E03\u4E0B\u672A\u77E5\u8C0E\u8A00");
          }
        });
      }
      case "allBlueKitchen":
      case "medicine": {
        const allowed = skill.effect === "medicine" ? current.hand.filter((card) => card.type === "basic").map((card) => card.uid) : current.hand.filter((card) => card.type === "strategy" || card.type === "equipment").map((card) => card.uid);
        return game2.requestDiscard(playerId, 1, {
          reason: skill.effect === "medicine" ? "\u533B\u672F\uFF1A\u8BF7\u9009\u62E91\u5F20\u57FA\u7840\u724C\u5F03\u7F6E" : "\u6D77\u4E0A\u9910\u5385\uFF1A\u8BF7\u9009\u62E91\u5F20\u7B56\u7565\u724C\u6216\u88C5\u5907\u724C\u5F03\u7F6E",
          allowedUids: allowed,
          shouldLog: false,
          onComplete: () => {
            const target = getPlayer(game2, targetId);
            if (!target?.alive) return;
            game2.resolveHeal(playerId, targetId);
            if (skill.effect === "allBlueKitchen" && current.dreamState?.awakened) game2.draw(targetId, 1);
            if (skill.effect === "medicine" && current.dreamState?.awakened) {
              target.poison = 0;
              target.frozenDraw = 0;
              target.energyLocked = false;
              target.signatureLocked = 0;
            }
          }
        });
      }
      case "flowerSeizure": {
        const target = getPlayer(game2, targetId), cards = target.hand.filter((card) => !card.responseOnly);
        if (!cards.length) return { ok: true };
        const shown = cards[Math.floor(game2.random() * cards.length)];
        game2.emitOnePieceEvent?.({ type: "hiddenCardViewed", sourceId: playerId, viewerId: playerId, ownerId: targetId, card: shown });
        const matches = current.hand.filter((card) => card.type === shown.type);
        return choose(game2, playerId, {
          title: "\u767E\u82B1\u641C\u67E5\uFF1A\u662F\u5426\u5C01\u5B58",
          text: "\u4F60\u67E5\u770B\u5230\u76EE\u6807\u7684\u4E00\u5F20\u9690\u85CF\u624B\u724C\uFF0C\u53EF\u5F03\u7F6E\u540C\u7C7B\u522B\u724C\u5C06\u5176\u5C01\u5B58\u3002",
          options: [{ value: "pass", label: "\u4E0D\u5C01\u5B58" }, ...matches.map((card) => ({ value: card.uid, label: "\u5F03\u7F6E\u3010" + card.name + "\u3011\u5E76\u5C01\u5B58" }))],
          aiChoice: matches[0]?.uid || "pass",
          onResolve: (uid) => {
            if (uid === "pass") return;
            const paid = current.hand.find((card) => card.uid === uid && card.type === shown.type);
            const index = target.hand.findIndex((card) => card.uid === shown.uid);
            if (!paid || index < 0) return;
            game2.removeCard(playerId, paid.uid);
            const sealed = target.hand.splice(index, 1)[0];
            target.sealedCards.push({ uid: "sealed-" + sealed.uid, card: sealed, sealedBy: playerId, returnAtPlayerId: targetId, setTurn: game2.turnNumber });
          }
        });
      }
      case "workshop": {
        const equipments = game2.discard.filter((card) => card.type === "equipment");
        return choose(game2, playerId, { title: "\u6539\u9020\u5DE5\u574A\uFF1A\u9009\u62E9\u88C5\u5907", options: equipments.map((card) => ({ value: card.uid, label: "\u53D6\u5F97\u3010" + card.name + "\u3011" })), aiChoice: equipments[0]?.uid, onResolve: (uid) => {
          const index = game2.discard.findIndex((card2) => card2.uid === uid && card2.type === "equipment");
          if (index < 0) return;
          const card = game2.discard.splice(index, 1)[0];
          if (current.dreamState?.awakened) game2.equip(playerId, card, { replaceToHand: true });
          else current.hand.push(card);
        } });
      }
      case "soulConcert":
        current.roundFlags.soulConcertUsed = true;
        game2.draw(playerId, 1);
        game2.draw(targetId, 1);
        return game2.requestDiscard(targetId, 1, { reason: "\u7075\u9B42\u4E50\u7AE0\uFF1A\u8BF7\u5F03\u7F6E1\u5F20\u624B\u724C", onComplete: () => {
          progress(game2, playerId, "\u4EE4\u4ED6\u4EBA\u6478\u540E\u5F03\u724C");
        } });
      case "oceanGuard":
        if (targetId !== playerId && current.dreamState?.awakened) {
          game2.gainShield(targetId, 1, playerId);
          return { ok: true };
        }
        return game2.requestDiscard(playerId, 1, { reason: "\u6D77\u6D41\u62A4\u822A\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", onComplete: () => {
          game2.gainShield(targetId, 1, playerId);
        } });
      default:
        return { ok: false, reason: "\u672A\u77E5\u7684\u4F1F\u5927\u822A\u8DEF\u6280\u80FD" };
    }
  }
  function getOnePieceSignatureTargets(game2, playerId, signature) {
    const current = getPlayer(game2, playerId);
    if (!current?.alive || !isOnePieceCharacter(current)) return [];
    if (signature.target === "self") return [playerId];
    return enemies(game2, playerId, signature.effect === "vagabondDrill" ? 2 : 99);
  }
  function lieForTarget(current, targetId) {
    return current.specialCards.find((item) => item.kind === "lie" && item.targetId === targetId);
  }
  function useOnePieceSignature(game2, playerId, targetId, signature) {
    const current = getPlayer(game2, playerId), target = getPlayer(game2, targetId);
    if (!target && signature.target !== "self") return { ok: false, reason: "\u76EE\u6807\u4E0D\u5B58\u5728" };
    switch (signature.effect) {
      case "gearFive":
        current.hp = Math.min(current.maxHp, current.hp + 1);
        game2.draw(playerId, 2);
        current.attackLimit += 1;
        if (current.dreamState?.awakened) {
          current.rangeInfinite = true;
          current.turnFlags.nextAttackIgnoreArmor = true;
        }
        return { ok: true };
      case "asura": {
        const hpBefore = target.hp;
        return game2.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "asura", skipIntervene: false, onComplete: () => {
          if (target.hp < hpBefore && current.dreamState?.awakened) game2.draw(playerId, 1);
        } });
      }
      case "zeus":
        if (target.hand.length >= 2) return game2.requestDiscard(targetId, 2, { reason: "\u96F7\u4E91\u5B99\u65AF\uFF1A\u8BF7\u9009\u62E92\u5F20\u624B\u724C\u5F03\u7F6E" });
        game2.dealDamage(playerId, targetId, 2, "strategy");
        return { ok: true };
      case "impactWolf": {
        const lie = lieForTarget(current, targetId);
        if (lie) {
          current.specialCards = current.specialCards.filter((item) => item.uid !== lie.uid);
          game2.discard.push(lie.card);
          current.turnFlags.nextAttackIgnoreArmor = true;
        }
        return game2.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "impactWolf", skipIntervene: Boolean(lie) });
      }
      case "diableJambe":
        return game2.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "diableJambe", skipIntervene: Boolean(current.turnFlags.supportCounter) });
      case "monsterPoint":
        game2.gainShield(playerId, 2);
        game2.draw(playerId, 1);
        current.attackLimit += 1;
        current.turnFlags.rangeBonus = (current.turnFlags.rangeBonus || 0) + 1;
        return { ok: true };
      case "giganteFleur": {
        const targets = game2.clockwiseTargets(playerId).filter((id) => !game2.isAlly(playerId, id));
        const step = (index) => {
          if (index >= targets.length) return;
          const id = targets[index], foe = getPlayer(game2, id);
          if (!foe?.alive) return step(index + 1);
          const options = [{ value: "take", label: "\u627F\u53D71\u70B9\u7B56\u7565\u4F24\u5BB3" }];
          if (foe.hand.length) options.unshift({ value: "discard", label: "\u5F03\u7F6E1\u5F20\u624B\u724C" });
          return choose(game2, id, { title: "\u5DE8\u5927\u6811\uFF1A\u54CD\u5E94", text: "\u5F03\u7F6E1\u5F20\u624B\u724C\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002", options, aiChoice: foe.hand.length ? "discard" : "take", onResolve: (value) => {
            if (value === "discard") game2.requestDiscard(id, 1, { reason: "\u5DE8\u5927\u6811\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", onComplete: () => step(index + 1) });
            else game2.dealDamage(playerId, id, 1, "strategy", () => step(index + 1));
          } });
        };
        return step(0) || { ok: true };
      }
      case "frankyGeneral": {
        const slots = ["weapon", "armor"];
        const equipNext = (index) => {
          if (index >= slots.length) {
            game2.gainShield(playerId, 1);
            return;
          }
          const slot = slots[index], cards = game2.discard.filter((card) => card.type === "equipment" && card.slot === slot);
          if (!cards.length) {
            game2.draw(playerId, 1);
            return equipNext(index + 1);
          }
          return choose(game2, playerId, { title: "\u5F17\u5170\u5947\u5C06\u519B\uFF1A\u9009\u62E9\u88C5\u5907", options: cards.map((card) => ({ value: card.uid, label: "\u88C5\u5907\u3010" + card.name + "\u3011" })), aiChoice: cards[0].uid, onResolve: (uid) => {
            const pos = game2.discard.findIndex((card) => card.uid === uid);
            if (pos >= 0) game2.equip(playerId, game2.discard.splice(pos, 1)[0]);
            equipNext(index + 1);
          } });
        };
        return equipNext(0) || { ok: true };
      }
      case "arrowNotch": {
        const finish = () => {
          if (target.alive) target.frozenDraw = Math.max(1, target.frozenDraw);
        };
        return game2.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "arrowNotch", onComplete: finish });
      }
      case "vagabondDrill": {
        const hpBefore = target.hp;
        return game2.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "vagabondDrill", onComplete: () => {
          if (target.hp < hpBefore) game2.gainShield(playerId, 1);
        } });
      }
      default:
        return { ok: false, reason: "\u672A\u77E5\u7684\u4F1F\u5927\u822A\u8DEF\u62DB\u724C\u6280" };
    }
  }
  function handleOnePieceEvent(game2, event) {
    const source = getPlayer(game2, event.sourceId), target = getPlayer(game2, event.targetId);
    switch (event.type) {
      case "turnStart":
        if (source) resetLie(game2, source);
        break;
      case "afterDamage":
        if (source?.characterId === "luffy" && event.origin === "attack") progress(game2, source.id, "\u7A81\u51FB\u547D\u4E2D");
        if (source?.characterId === "zoro" && event.origin === "asura") progress(game2, source.id, "\u963F\u4FEE\u7F57");
        if (source?.characterId === "usopp" && event.lieTriggered) progress(game2, source.id, "\u8C0E\u8A00\u5F39");
        if (source?.characterId === "brook" && event.origin === "attack" && target) target.frozenDraw = Math.max(1, target.frozenDraw);
        break;
      case "lieTriggered":
        if (source?.characterId === "usopp") progress(game2, source.id, "\u8C0E\u8A00\u5F39");
        break;
      case "afterHpLoss":
        if (source?.characterId === "luffy" && event.origin === "skill") progress(game2, source.id, "\u4E8C\u6863\u5931\u8840");
        break;
      case "beforeDamage":
        if (target?.characterId === "franky" && event.origin === "attack" && !target.equipment.armor && !target.roundFlags.frankySteel) {
          target.roundFlags.frankySteel = true;
          event.amount = Math.max(0, event.amount - 1);
        }
        if (target?.characterId === "brook" && event.origin === "strategy" && !target.roundFlags.soulCold) {
          target.roundFlags.soulCold = true;
          event.amount = Math.max(0, event.amount - 1);
        }
        const protector = game2.players.find((player) => player.alive && player.characterId === "jinbe" && player.id !== event.targetId && !player.roundFlags.jinbeGuard && player.hand.some((card) => card.type === "basic") && game2.distance(player.id, event.targetId) <= 1 && (game2.mode.id === "classic8" || game2.isAlly(player.id, event.targetId)));
        if (protector?.human) event.optionalProtector = protector.id;
        if (protector && !protector.human) {
          const basic = protector.hand.find((card) => card.type === "basic");
          game2.removeCard(protector.id, basic.uid);
          protector.roundFlags.jinbeGuard = true;
          event.amount = Math.max(0, event.amount - 1);
          progress(game2, protector.id, "\u4FA0\u4E49");
        }
        break;
      case "afterHeal":
        if (source?.characterId === "chopper" && source.id !== target?.id) progress(game2, source.id, "\u533B\u672F");
        if (source?.characterId === "sanji" && source.id !== target?.id) progress(game2, source.id, "\u63F4\u62A4");
        break;
      case "equipmentChanged":
        if (source?.characterId === "franky") {
          if (!source.roundFlags.colaEnergy) {
            source.roundFlags.colaEnergy = true;
            game2.gainEnergy(source.id, 1);
          }
          progress(game2, source.id, "\u88C5\u5907\u6539\u9020");
        }
        break;
      case "hiddenCardViewed": {
        const viewer = getPlayer(game2, event.viewerId || event.sourceId);
        if (viewer?.characterId === "robin") {
          game2.draw(viewer.id, 1);
          progress(game2, viewer.id, "\u5386\u53F2\u5B66\u8005");
        }
        break;
      }
      case "shieldGranted":
        if (source?.characterId === "jinbe" && event.targetId !== source.id) progress(game2, source.id, "\u6D77\u6D41\u62A4\u822A");
        break;
      case "beforeDying":
        if (target?.characterId === "brook" && target.dreamState?.awakened && !target.reviveUsed && ["damage", "attack", "strategy", "signature", "asura", "arrowNotch", "vagabondDrill", "impactWolf", "diableJambe"].includes(event.origin)) {
          target.reviveUsed = true;
          target.hp = 1;
          target.dying = false;
          target.hand = [];
          target.energy = 0;
          game2.log("heal", game2.nameOf(target) + "\u4EE5\u201C\u7075\u9B42\u51FA\u7A8D\u201D\u4FDD\u75591\u70B9\u4F53\u529B");
          return { rescued: true };
        }
        break;
      case "cardResolved":
        if (source?.characterId === "nami" && source.navigationWind && event.card?.type === "strategy" && event.card?.targetMode !== "self" && event.card?.targetMode !== "allOther") source.navigationWind = false;
        if (source?.characterId === "nami" && event.card?.type === "strategy" && !source.roundFlags.weatherEnergy) {
          source.roundFlags.weatherEnergy = true;
          game2.gainEnergy(source.id, 1);
        }
        if (source?.characterId === "nami") {
          const categories = source.turnFlags.cardCategories || (source.turnFlags.cardCategories = []);
          if (event.card?.type && !categories.includes(event.card.type)) categories.push(event.card.type);
          if (categories.length >= 2) progress(game2, source.id, "\u822A\u6D77\u8BB0\u5F55");
        }
        break;
      default:
        break;
    }
    return event;
  }

  // ../src/engine.js
  var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  var GameEngine = class {
    constructor({ modeId, humanCharacterId, random = Math.random, fixedAnchorSeat = null } = {}) {
      this.random = random;
      this.fixedAnchorSeat = fixedAnchorSeat;
      this.mode = getMode(modeId) || getMode("classic8");
      this.humanCharacterId = humanCharacterId || characters[0].id;
      this.players = [];
      this.deck = [];
      this.discard = [];
      this.logs = [];
      this.eventHistory = [];
      this.telemetry = { rounds: 0, turns: 0, damage: 0, cardDeclared: 0, cardResolved: 0, cardCancelled: 0, shieldGranted: 0 };
      this.visualEvents = [];
      this.round = 0;
      this.phase = "setup";
      this.currentPlayerId = null;
      this.turnQueue = [];
      this.pendingResponse = null;
      this.pendingDiscard = null;
      this.pendingChoice = null;
      this.pendingChoiceResolver = null;
      this.pendingStrategySequence = null;
      this.pendingDiscardResolver = null;
      this.discardPromptId = 0;
      this.choicePromptId = 0;
      this.winner = null;
      this.instance = 0;
      this.turnNumber = 0;
    }
    setup() {
      this.deck = this.shuffle(this.buildDeck());
      const available = this.shuffle(characters.filter((c) => c.id !== this.humanCharacterId));
      let roleList = [...this.mode.roles];
      if (this.mode.id === "classic8") roleList = this.shuffle(roleList);
      this.players = Array.from({ length: this.mode.playerCount }, (_, seat) => {
        const character = seat === 0 ? getCharacter(this.humanCharacterId) : available[seat - 1];
        const roleId = roleList[seat];
        const lordBonus = roleId === "lord" ? 1 : 0;
        return {
          id: `p${seat}`,
          seat,
          human: seat === 0,
          characterId: character.id,
          roleId,
          revealed: this.mode.publicRoles.includes(roleId),
          alive: true,
          hp: character.hp + lordBonus,
          maxHp: character.hp + lordBonus,
          baseHandLimit: character.handLimit,
          handLimitModifier: lordBonus,
          energy: 0,
          maxEnergy: 4,
          hand: [],
          equipment: { weapon: null, armor: null, charm: null },
          plots: [],
          specialCards: [],
          sealedCards: [],
          chessTargetId: null,
          sandMarkedBy: null,
          sandMarkSetTurn: 0,
          swapMarkedId: null,
          scoutedTargetId: null,
          scoutSetTurn: 0,
          toadBindTargetId: null,
          toadBindExpiresTurn: 0,
          sageMarks: 0,
          sageResonance: false,
          sageMarkRoundFlags: { dealt: false, taken: false },
          curseSeal: null,
          curseResearchType: null,
          byakugoMode: false,
          byakugoActivatedTurn: 0,
          lastSealType: null,
          dying: false,
          shield: 0,
          poison: 0,
          frozenDraw: 0,
          skipOffense: false,
          attackLimit: 1,
          attacksUsed: 0,
          rangeInfinite: false,
          armorReady: true,
          signatureLocked: 0,
          contractHpLoss: 0,
          energyLocked: false,
          dreamState: { progress: 0, awakened: false, progressedRound: 0 },
          reviveUsed: false,
          nextAttackState: { bonus: false, ignoreArmor: false, requiredGuards: 0, shadowNeckTarget: null },
          roundFlags: {},
          turnFlags: {}
        };
      });
      for (const player of this.players) initializeOnePieceState(player, this.characterOf(player));
      for (const player of this.players) this.draw(player.id, player.baseHandLimit + player.handLimitModifier, false);
      const lord = this.players.find((player) => player.roleId === "lord");
      this.anchorSeat = this.mode.id === "ranked2v2" ? this.fixedAnchorSeat ?? Math.floor(this.random() * this.players.length) : lord?.seat ?? 0;
      this.anchorSeatRoll = this.mode.id === "ranked2v2" ? this.anchorSeat : null;
      this.log("system", `\u5BF9\u5C40\u5F00\u59CB\uFF1A${this.mode.name}`);
      if (lord) this.log("event", `${this.nameOf(lord)}\u516C\u5F00\u8EAB\u4EFD\uFF1A${roles.lord.name}`);
      this.startRound();
      return this;
    }
    buildDeck() {
      const cards = [];
      const recipe = deckProfiles[this.mode.deckProfile] || deckProfiles.standard144;
      for (const [id, count] of Object.entries(recipe)) {
        for (let index = 0; index < count; index += 1) cards.push({ ...cardDefinitions[id], uid: `${id}-${this.instance++}` });
      }
      return cards;
    }
    shuffle(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    startRound() {
      if (this.winner) return;
      this.round += 1;
      this.telemetry.rounds += 1;
      for (const player of this.players) {
        player.roundFlags = {};
        player.armorReady = true;
        player.sageMarkRoundFlags = { dealt: false, taken: false };
      }
      const alive = this.players.filter((player) => player.alive);
      this.turnQueue = [...alive.filter((p) => p.seat >= this.anchorSeat), ...alive.filter((p) => p.seat < this.anchorSeat)].map((p) => p.id);
      this.log("round", `\u7B2C ${this.round} \u8F6E\u5F00\u59CB`);
      this.startNextTurn();
    }
    startNextTurn() {
      if (this.winner) return;
      while (this.turnQueue.length && !this.player(this.turnQueue[0])?.alive) this.turnQueue.shift();
      if (!this.turnQueue.length) return this.startRound();
      const player = this.player(this.turnQueue.shift());
      this.currentPlayerId = player.id;
      this.turnNumber += 1;
      this.telemetry.turns += 1;
      this.phase = "play";
      if (this.expirePlotsAtTurnStart(player.id, () => this.completeTurnStart(player.id))) return;
      this.completeTurnStart(player.id);
    }
    completeTurnStart(playerId) {
      const player = this.player(playerId);
      if (!player?.alive || this.winner) return;
      this.returnSealedCards(playerId);
      this.expireFalsePlots(playerId);
      if (player.scoutedTargetId && player.scoutSetTurn < this.turnNumber) {
        player.scoutedTargetId = null;
        this.log("event", `${this.nameOf(player)}\u7684\u767D\u773C\u9501\u5B9A\u7ED3\u675F`);
      }
      if (player.characterId === "jiraiya" && player.toadBindTargetId) {
        player.toadBindTargetId = null;
        player.toadBindExpiresTurn = 0;
        this.log("event", `${this.nameOf(player)}\u7684\u201C\u86E4\u87C6\u53E3\u675F\u7F1A\u201D\u7ED3\u675F`);
      }
      for (const target of this.players) {
        if (target.curseSeal?.sourceId === playerId && target.curseSeal.setTurn < this.turnNumber) {
          target.curseSeal = null;
          this.log("event", `${this.nameOf(player)}\u5E03\u7F6E\u7684\u5492\u5370\u5B9E\u9A8C\u5230\u671F`);
        }
      }
      if (player.byakugoMode && player.byakugoActivatedTurn < this.turnNumber) {
        player.byakugoMode = false;
        player.roundFlags.byakugoReturnedTypes = [];
        this.log("event", `${this.nameOf(player)}\u7684\u201C\u767E\u8C6A\u4E4B\u672F\u201D\u7ED3\u675F`);
      }
      const prior = player.turnFlags || {};
      const carry = {
        ...player.nextAttackState || {},
        bonus: Boolean(player.nextAttackState?.bonus || prior.nextAttackBonus),
        ignoreArmor: Boolean(player.nextAttackState?.ignoreArmor || prior.nextAttackIgnoreArmor),
        requiredGuards: (player.nextAttackState?.requiredGuards || 0) + (prior.nextAttackRequiredGuard || 0),
        shadowNeckTarget: player.nextAttackState?.shadowNeckTarget || prior.shadowNeckTarget || null
      };
      player.turnFlags = {
        cardsPlayed: 0,
        nextAttackBonus: Boolean(carry.bonus),
        nextAttackIgnoreArmor: Boolean(carry.ignoreArmor),
        nextAttackRequiredGuard: carry.requiredGuards || 0,
        shadowNeckTarget: carry.shadowNeckTarget || null
      };
      player.nextAttackState = { bonus: false, ignoreArmor: false, requiredGuards: 0, shadowNeckTarget: null };
      this.emitOnePieceEvent({ type: "turnStart", sourceId: playerId });
      player.attacksUsed = 0;
      player.attackLimit = 1 + (player.equipment.weapon?.id === "repeater" ? 1 : 0);
      player.rangeInfinite = false;
      this.refreshEnergyCap(player);
      this.gainEnergy(player.id, 1 + (player.equipment.charm?.id === "charm" ? 1 : 0));
      let drawCount = Math.max(0, 2 - player.frozenDraw);
      player.frozenDraw = 0;
      this.draw(player.id, drawCount);
      if (player.characterId === "tanjiro") {
        const top = this.peek();
        if (top?.type === "basic") {
          player.hand.push(this.takeTop());
          this.log("event", `${this.nameOf(player)}\u4EE5\u201C\u55C5\u89C9\u201D\u83B7\u5F97\u4E861\u5F20\u57FA\u7840\u724C`);
        }
      }
      this.log("turn", `${this.nameOf(player)}\u7684\u56DE\u5408`);
    }
    endTurn(playerId = this.currentPlayerId) {
      if (this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice || playerId !== this.currentPlayerId) return false;
      const player = this.player(playerId);
      if (!player?.alive) return false;
      const expiredCopies = player.hand.filter((card) => card._copiedBy === playerId);
      if (expiredCopies.length) {
        player.hand = player.hand.filter((card) => card._copiedBy !== playerId);
        this.log("event", `${this.nameOf(player)}\u672A\u4F7F\u7528\u7684${expiredCopies.length}\u5F20\u62F7\u8D1D\u724C\u968F\u67E5\u514B\u62C9\u6D88\u6563`);
      }
      if (player.poison > 0) {
        player.poison -= 1;
        this.log("damage", `${this.nameOf(player)}\u53D7\u5230\u6BD2\u7D20\u4FB5\u8680\uFF0C\u5931\u53BB1\u70B9\u4F53\u529B`);
        this.loseHp(player.id, 1, null, "poison");
        if (this.winner || this.pendingChoice) return true;
      }
      player.skipOffense = false;
      const limit = this.handLimit(player.id);
      if (player.hand.length > limit) {
        const count = player.hand.length - limit;
        this.phase = "discard";
        this.requestDiscard(player.id, count, {
          reason: `\u56DE\u5408\u7ED3\u675F\uFF1A\u624B\u724C\u4E0A\u9650\u4E3A${limit}\uFF0C\u8BF7\u9009\u62E9${count}\u5F20\u624B\u724C\u5F03\u7F6E`,
          shouldLog: false,
          onComplete: () => {
            this.log("system", `${this.nameOf(player)}\u5F03\u7F6E\u4E86${count}\u5F20\u8D85\u51FA\u4E0A\u9650\u7684\u624B\u724C`);
            this.finishTurn(player.id);
          }
        });
        return true;
      }
      return this.finishTurn(player.id);
    }
    finishTurn(playerId) {
      if (this.winner || this.pendingDiscard || this.pendingChoice || playerId !== this.currentPlayerId) return false;
      const player = this.player(playerId);
      if (player?.contractHpLoss > 0) {
        const loss = player.contractHpLoss;
        player.contractHpLoss = 0;
        this.log("event", `${this.nameOf(player)}\u7684\u6781\u9650\u5951\u7EA6\u5230\u671F\uFF0C\u5931\u53BB${loss}\u70B9\u4F53\u529B`);
        this.loseHp(playerId, loss, null, "contract", () => this.finishTurnAfterEffects(playerId));
        return true;
      }
      return this.finishTurnAfterEffects(playerId);
    }
    finishTurnAfterEffects(playerId) {
      const player = this.player(playerId);
      if (player?.signatureLocked > 0) player.signatureLocked -= 1;
      if (player?.energyLocked) player.energyLocked = false;
      this.expireEchoAtTurnEnd(playerId);
      for (const target of this.players) {
        if (target.sandMarkedBy === playerId && target.sandMarkSetTurn < this.turnNumber) {
          target.sandMarkedBy = null;
          target.sandMarkSetTurn = 0;
        }
      }
      this.emitOnePieceEvent({ type: "turnEnd", sourceId: playerId });
      this.phase = "between";
      this.startNextTurn();
      return true;
    }
    advancePastEliminatedCurrent() {
      if (this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice) return false;
      const current = this.player(this.currentPlayerId);
      if (!current || current.alive) return false;
      this.phase = "between";
      this.startNextTurn();
      return true;
    }
    draw(playerId, count = 1, shouldLog = true) {
      const player = this.player(playerId);
      if (!player?.alive) return [];
      const cards = [];
      for (let i = 0; i < count; i += 1) {
        if (!this.deck.length) {
          if (!this.discard.length) break;
          this.deck = this.shuffle(this.discard.splice(0));
          this.log("system", "\u5F03\u724C\u5806\u5DF2\u91CD\u65B0\u6D17\u5165\u724C\u5806");
        }
        const card = this.deck.shift();
        player.hand.push(card);
        cards.push(card);
      }
      if (shouldLog && cards.length) this.log("system", `${this.nameOf(player)}\u6478\u4E86${cards.length}\u5F20\u724C`);
      return cards;
    }
    peek() {
      return this.deck[0] || null;
    }
    takeTop() {
      return this.deck.shift() || null;
    }
    player(id) {
      return this.players.find((player) => player.id === id);
    }
    characterOf(playerOrId) {
      const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId;
      return getCharacter(player?.characterId);
    }
    nameOf(playerOrId) {
      return this.characterOf(playerOrId)?.name || "\u672A\u77E5\u89D2\u8272";
    }
    roleOf(playerOrId) {
      const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId;
      return roles[player?.roleId];
    }
    emitOnePieceEvent(event) {
      if (event?.type) {
        this.eventHistory.push({ ...event });
        if (Object.prototype.hasOwnProperty.call(this.telemetry, event.type)) this.telemetry[event.type] += 1;
      }
      return handleOnePieceEvent(this, event) || event;
    }
    refreshEnergyCap(playerOrId) {
      const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId;
      if (!player) return;
      player.maxEnergy = 4 + (player.equipment.charm?.id === "battery" ? 1 : 0);
      player.energy = clamp(player.energy, 0, player.maxEnergy);
    }
    gainEnergy(playerId, amount = 1) {
      const player = this.player(playerId);
      if (!player?.alive || amount <= 0 || player.energyLocked) return 0;
      const before = player.energy;
      player.energy = clamp(player.energy + amount, 0, player.maxEnergy);
      return player.energy - before;
    }
    gainShield(playerId, amount = 1, sourceId = playerId) {
      const player = this.player(playerId);
      if (!player?.alive || amount <= 0) return 0;
      const before = player.shield;
      player.shield = clamp(player.shield + amount, 0, 3);
      const gained = player.shield - before;
      if (gained > 0) this.emitOnePieceEvent({ type: "shieldGranted", sourceId, targetId: playerId, amount: gained });
      return gained;
    }
    pushDamageFeedback(playerId, amount) {
      if (amount > 0) this.visualEvents.push({ type: "damage", playerId, amount });
    }
    consumeVisualEvents() {
      return this.visualEvents.splice(0);
    }
    handLimit(playerId) {
      const player = this.player(playerId);
      if (!player) return 0;
      const printed = player.baseHandLimit ?? this.characterOf(player)?.handLimit ?? 4;
      return Math.max(0, printed + (player.handLimitModifier || 0) + (player.equipment.charm?.id === "memory_core" ? 2 : 0));
    }
    getVisiblePlots(viewerId, ownerId) {
      const owner = this.player(ownerId);
      if (!owner) return [];
      const viewer = this.player(viewerId);
      const scouted = viewer?.characterId === "hinata" && viewer.scoutedTargetId === ownerId;
      return owner.plots.map((plot) => viewerId === ownerId || plot.revealed || scouted ? { ...plot, hidden: false } : {
        uid: plot.uid,
        ownerId: plot.ownerId,
        targetId: plot.targetId,
        hidden: true,
        name: "\u672A\u77E5\u4F0F\u7B14"
      });
    }
    getSpecialCards(playerId, kind = null) {
      const player = this.player(playerId);
      if (!player) return [];
      return player.specialCards.filter((item) => !kind || item.kind === kind);
    }
    storeSpecialCard(playerId, cardUid, kind) {
      const player = this.player(playerId);
      const index = player?.hand.findIndex((card2) => card2.uid === cardUid) ?? -1;
      if (index < 0) return null;
      const [card] = player.hand.splice(index, 1);
      const stored = { uid: `special-${card.uid}`, kind, card, storedTurn: this.turnNumber };
      player.specialCards.push(stored);
      return stored;
    }
    consumeSpecialCard(playerId, kind, { returnToHand = false } = {}) {
      const player = this.player(playerId);
      const index = player?.specialCards.findIndex((item) => item.kind === kind) ?? -1;
      if (index < 0) return null;
      const [stored] = player.specialCards.splice(index, 1);
      if (returnToHand && player.alive) player.hand.push(stored.card);
      else this.discard.push(stored.card);
      return stored;
    }
    returnSealedCards(playerId) {
      for (const player of this.players) {
        const returning = player.sealedCards.filter((item) => item.returnAtPlayerId === playerId || !item.returnAtPlayerId && item.sealedBy === playerId);
        if (!returning.length) continue;
        player.sealedCards = player.sealedCards.filter((item) => !(item.returnAtPlayerId === playerId || !item.returnAtPlayerId && item.sealedBy === playerId));
        if (player.alive) player.hand.push(...returning.map((item) => item.card));
        else this.discard.push(...returning.map((item) => item.card));
        this.log("event", `${this.nameOf(player)}\u88AB\u201C\u6708\u8BFB\u201D\u5C01\u5B58\u7684${returning.length}\u5F20\u724C\u8FD4\u56DE\u624B\u724C`);
      }
    }
    expireFalsePlots(ownerId) {
      const owner = this.player(ownerId);
      if (!owner) return;
      for (const plot of [...owner.plots].filter((item) => item.isFalse && item.setTurn < this.turnNumber)) {
        this.removePlot(plot, { discard: false, reveal: true, triggerOwnerSkill: false });
        if (owner.alive) owner.hand.push(plot.card);
        else this.discard.push(plot.card);
        this.log("event", `\u865A\u5047\u4F0F\u7B14\u3010${plot.card.name}\u3011\u5230\u671F\u5E76\u8FD4\u56DE${this.nameOf(owner)}\u7684\u624B\u724C`);
      }
    }
    nearbySakuraProtectors(targetId) {
      const target = this.player(targetId);
      if (!target) return [];
      return this.players.filter((player) => {
        if (!player.alive || player.characterId !== "sakura" || !player.byakugoMode && this.distance(player.id, targetId) > 1) return false;
        if (player.id === targetId || this.mode.id === "ranked2v2") return player.id === targetId || this.isAlly(player.id, targetId);
        return player.revealed && target.revealed && this.isAlly(player.id, targetId);
      });
    }
    consumeByakugo(targetId, type, reason) {
      const sakura = this.nearbySakuraProtectors(targetId).find((player) => this.getSpecialCards(player.id, "byakugo").some((item) => item.card.type === type));
      if (!sakura) return false;
      const stored = this.getSpecialCards(sakura.id, "byakugo").find((item) => item.card.type === type);
      const index = sakura.specialCards.findIndex((item) => item.uid === stored.uid);
      sakura.specialCards.splice(index, 1);
      const returnedTypes = sakura.roundFlags.byakugoReturnedTypes || (sakura.roundFlags.byakugoReturnedTypes = []);
      const returns = sakura.byakugoMode && !returnedTypes.includes(type);
      if (returns) {
        returnedTypes.push(type);
        sakura.hand.push(stored.card);
      } else this.discard.push(stored.card);
      if (sakura.lastSealType && sakura.lastSealType !== type) this.gainEnergy(sakura.id, 1);
      if (sakura.characterId === "sakura" && type === "basic") sakura.turnFlags.nextAttackBonus = true;
      if (sakura.characterId === "sakura" && type === "strategy") {
        const control = this.plotsTargeting(sakura.id).find((plot) => plot.effect !== "echoScript");
        if (control) this.removePlot(control);
        else if (sakura.poison > 0) sakura.poison = 0;
        else if (sakura.frozenDraw > 0) sakura.frozenDraw = 0;
        else if (sakura.skipOffense) sakura.skipOffense = false;
        else if (sakura.energyLocked) sakura.energyLocked = false;
        else if (sakura.signatureLocked > 0) sakura.signatureLocked = 0;
      }
      sakura.lastSealType = type;
      this.log("event", `${this.nameOf(sakura)}\u89E3\u653E${{ basic: "\u57FA\u7840", strategy: "\u7B56\u7565", equipment: "\u88C5\u5907" }[type]}\u767E\u8C6A\u724C\uFF0C${reason}`);
      return true;
    }
    plotsTargeting(targetId, effect = null) {
      return this.players.flatMap((player) => player.plots).filter((plot) => plot.targetId === targetId && (!effect || plot.effect === effect));
    }
    removePlot(plot, { discard = true, reveal = true, triggerOwnerSkill = true } = {}) {
      const owner = this.player(plot?.ownerId);
      if (!owner) return null;
      const index = owner.plots.findIndex((item) => item.uid === plot.uid);
      if (index < 0) return null;
      const [removed] = owner.plots.splice(index, 1);
      if (discard) this.discard.push(removed.card);
      if (reveal) this.log("event", `\u4F0F\u7B14\u3010${removed.card.name}\u3011\u88AB\u63ED\u793A`);
      if (triggerOwnerSkill) this.afterOwnedPlotRemoved(owner.id);
      return removed;
    }
    triggerTacticalForesight(ownerId, targetId = null, reason = "\u5C40\u52BF\u53D8\u5316") {
      const owner = this.player(ownerId);
      const markedId = targetId || owner?.chessTargetId;
      if (owner?.characterId !== "shikamaru" || owner.roundFlags.foresight || !markedId || owner.chessTargetId !== markedId) return false;
      const index = this.turnQueue.indexOf(markedId);
      if (index < 0 || index >= this.turnQueue.length - 1) return false;
      [this.turnQueue[index], this.turnQueue[index + 1]] = [this.turnQueue[index + 1], this.turnQueue[index]];
      owner.roundFlags.foresight = true;
      owner.turnFlags.shadowNeckTarget = markedId;
      this.log("event", `${this.nameOf(owner)}\u56E0${reason}\u53D1\u52A8\u201C\u6218\u672F\u9884\u8BFB\u201D\uFF0C\u4EE4${this.nameOf(markedId)}\u7684\u884C\u52A8\u540E\u79FB\u4E00\u4F4D`);
      return true;
    }
    notifyCardCancelled(playerId, reason = "\u51FA\u724C\u88AB\u53D6\u6D88") {
      this.emitOnePieceEvent({ type: "cardCancelled", sourceId: playerId, reason });
      const owner = this.findChessOwner(playerId);
      if (owner) this.triggerTacticalForesight(owner.id, playerId, reason);
    }
    afterOwnedPlotRemoved(ownerId) {
      this.triggerTacticalForesight(ownerId, null, "\u4F0F\u7B14\u88AB\u79FB\u9664");
    }
    requestChoice(playerId, { title = "\u8BF7\u9009\u62E9", text = "", options = [], onResolve = null, aiChoice = null } = {}) {
      const player = this.player(playerId);
      const available = options.filter((option) => !option.disabled);
      if (!player?.alive || !available.length) {
        if (onResolve) onResolve(null);
        return { ok: true, pending: false };
      }
      if (!player.human) {
        const value = typeof aiChoice === "function" ? aiChoice(available, player) : aiChoice;
        const chosen = available.find((option) => option.value === value) || available[0];
        if (onResolve) onResolve(chosen.value);
        return { ok: true, pending: false, value: chosen.value };
      }
      this.pendingChoice = { id: ++this.choicePromptId, playerId, title, text, options: available.map((option) => ({ value: option.value, label: option.label, description: option.description || "" })) };
      this.pendingChoiceResolver = onResolve;
      return { ok: true, pending: true };
    }
    resolveChoice(playerId, value) {
      const pending = this.pendingChoice;
      if (!pending || pending.playerId !== playerId || !pending.options.some((option) => option.value === value)) return { ok: false, reason: "\u5F53\u524D\u9009\u9879\u65E0\u6548" };
      const resolver = this.pendingChoiceResolver;
      this.pendingChoice = null;
      this.pendingChoiceResolver = null;
      if (resolver) resolver(value);
      return { ok: true };
    }
    isAlly(aId, bId) {
      const a = this.player(aId), b = this.player(bId);
      if (!a || !b) return false;
      if (a.roleId === "lone" || b.roleId === "lone") return a.id === b.id;
      return this.roleOf(a).camp === this.roleOf(b).camp;
    }
    distance(aId, bId) {
      const alive = this.players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat);
      const ai = alive.findIndex((player) => player.id === aId), bi = alive.findIndex((player) => player.id === bId);
      if (ai < 0 || bi < 0) return Infinity;
      const direct = Math.abs(ai - bi);
      let distance = Math.min(direct, alive.length - direct);
      const target = this.player(bId);
      if (target.characterId === "shinobu" && !target.equipment.armor) distance += 1;
      return distance;
    }
    attackRange(playerId) {
      const player = this.player(playerId);
      if (player.rangeInfinite) return 99;
      let range = 1 + (player.equipment.weapon?.rangeBonus || 0) + (player.turnFlags.rangeBonus || 0);
      if (["ichigo"].includes(player.characterId)) range += 1;
      if (player.characterId === "mikasa" && player.equipment.weapon) range += 1;
      if (player.characterId === "zoro" && player.equipment.weapon) range += 1;
      if (player.characterId === "sanji" && !player.equipment.weapon) range += 1;
      if (player.characterId === "jiraiya" && player.sageMarks > 0) range += 1;
      if (player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length) return 99;
      return range;
    }
    getCardTargets(playerId, card) {
      const player = this.player(playerId);
      if (!player?.alive || !card || card.responseOnly) return [];
      if (player.navigationWind && card.type === "strategy" && card.targetMode !== "self" && card.targetMode !== "allOther") {
        return this.players.filter((target) => target.alive && target.id !== playerId).map((target) => target.id);
      }
      if (card.type === "equipment" || ["focus", "overdrive", "energy_auction", "delayed_cast", "echo_script", "dimensional_barrage", "rift_invasion"].includes(card.id)) return [playerId];
      if (card.id === "adapt") return this.players.filter((target) => target.alive && (target.id === playerId || this.distance(playerId, target.id) <= this.attackRange(playerId))).map((target) => target.id);
      if (card.id === "heal") {
        const targets = player.hp < player.maxHp ? [playerId] : [];
        if (player.characterId === "chopper") targets.push(...this.players.filter((p) => p.alive && p.id !== playerId && (this.mode.id === "classic8" || this.isAlly(playerId, p.id)) && p.hp < p.maxHp && this.distance(playerId, p.id) <= 1).map((p) => p.id));
        return targets;
      }
      if (card.id === "attack") return this.players.filter((p) => p.alive && p.id !== playerId && (this.distance(playerId, p.id) <= this.attackRange(playerId) || player.characterId === "sasuke" && player.swapMarkedId === p.id || player.characterId === "shikamaru" && player.turnFlags.shadowNeckTarget === p.id || player.characterId === "gaara" && p.sandMarkedBy === playerId || player.characterId === "hinata" && player.scoutedTargetId === p.id)).map((p) => p.id);
      if (card.id === "memory_exchange") return this.players.filter((p) => p.alive && p.id !== playerId && p.hand.length && player.hand.some((item) => item.uid !== card.uid)).map((p) => p.id);
      if (card.id === "tactical_relay") return player.hand.some((item) => item.uid !== card.uid && item.type === "basic") ? this.players.filter((p) => p.alive && p.id !== playerId).map((p) => p.id) : [];
      if (["limit_contract", "causal_mark", "rhythm_break", "will_duel", "energy_collapse"].includes(card.id)) return this.players.filter((p) => p.alive && p.id !== playerId).map((p) => p.id);
      if (card.id === "mind_burn") return this.players.filter((p) => p.alive && p.id !== playerId && p.hand.length).map((p) => p.id);
      if (["guardian_oath", "return_route"].includes(card.id)) return this.players.filter((p) => p.alive).map((p) => p.id);
      if (card.id === "equipment_shift") return this.players.some((p) => Object.values(p.equipment).some(Boolean)) ? this.players.filter((p) => p.alive).map((p) => p.id) : [];
      if (card.id === "initiative_swap") return this.turnQueue.filter((id) => this.player(id)?.alive).length >= 2 ? [...this.turnQueue].filter((id) => this.player(id)?.alive) : [];
      return [];
    }
    getSignatureTargets(playerId) {
      const player = this.player(playerId), signature = this.characterOf(player)?.signature;
      if (!player?.alive || !signature) return [];
      if (isOnePieceCharacter(player)) return getOnePieceSignatureTargets(this, playerId, signature);
      if (signature.effect === "colossal" && player.hp <= 1) return [];
      if (signature.effect === "checkmate") {
        const targetId = player.chessTargetId;
        return targetId && this.player(targetId)?.alive ? [targetId] : [];
      }
      if (signature.effect === "tsukuyomi") {
        return player.plots.filter((plot) => plot.isFalse && this.player(plot.targetId)?.alive && this.player(plot.targetId).hand.some((card) => !card.responseOnly)).map((plot) => plot.targetId);
      }
      if (signature.effect === "kirin") return player.swapMarkedId && this.player(player.swapMarkedId)?.alive ? [player.swapMarkedId] : [];
      if (signature.effect === "kamuiRaikiri") {
        if (!player.hand.some((card) => card._copiedBy === playerId)) return [];
        return this.players.filter((target) => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= Math.max(2, this.attackRange(playerId))).map((target) => target.id);
      }
      if (signature.effect === "sixtyFourPalms") return player.scoutedTargetId && this.player(player.scoutedTargetId)?.alive ? [player.scoutedTargetId] : [];
      if (signature.effect === "goemon") {
        return this.players.filter((target) => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map((target) => target.id);
      }
      if (signature.effect === "immortality") return player.hand.some((card) => card._curseSpoil === playerId) ? [playerId] : [];
      if (signature.target === "self") return [playerId];
      const candidates = this.players.filter((p) => p.alive && p.id !== playerId);
      if (signature.target === "ally") return candidates.filter((p) => this.mode.id === "classic8" || this.isAlly(playerId, p.id)).map((p) => p.id);
      return candidates.filter((p) => (this.mode.id === "classic8" || !this.isAlly(playerId, p.id)) && this.distance(playerId, p.id) <= Math.max(2, this.attackRange(playerId))).map((p) => p.id);
    }
    getActiveSkillTargets(playerId) {
      const player = this.player(playerId), skill = activeSkills[player?.characterId];
      if (!player?.alive || !skill || player.turnFlags.activeUsed) return [];
      if (isOnePieceCharacter(player)) return getOnePieceActiveTargets(this, playerId, skill);
      if (skill.cost && player.energy < skill.cost) return [];
      if (["totalConcentration", "odmGear", "tacticalGift"].includes(skill.effect) && !player.hand.length) return [];
      if (skill.effect === "shadowClone" && (this.getSpecialCards(playerId, "clone").length || !player.hand.some((card) => card.type === "basic" && !card.responseOnly))) return [];
      if (skill.effect === "byakugoStore") {
        const stored = this.getSpecialCards(playerId, "byakugo");
        const storedTypes = new Set(stored.map((item) => item.card.type));
        const canStore = stored.length < 3 && player.hand.some((card) => !storedTypes.has(card.type));
        if (!canStore && !stored.length) return [];
      }
      if (skill.effect === "illusionPlot" && !player.hand.some((card) => card.strategyKind !== "plot")) return [];
      if (skill.effect === "amenotejikara") {
        return this.players.filter((target) => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2 && ["weapon", "armor", "charm"].some((slot) => player.equipment[slot] || target.equipment[slot])).map((target) => target.id);
      }
      if (skill.effect === "copyNinjutsu" && !this.discard.some((card) => !card.responseOnly && !card._copiedBy && (card.type === "basic" || card.strategyKind === "instant"))) return [];
      if (skill.effect === "toadBind") {
        if (player.toadBindTargetId || player.roundFlags.toadBindUsed) return [];
        return this.players.filter((target) => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map((target) => target.id);
      }
      if (skill.effect === "curseExperiment" && !player.hand.length) return [];
      if (skill.effect === "medicine" && !player.hand.some((card) => card.type === "basic")) return [];
      if (skill.effect === "secondGear" && player.hp <= 1) return [];
      if (skill.target === "self") return [playerId];
      if (skill.target === "future") return this.turnQueue.filter((id) => this.player(id)?.alive);
      const candidates = this.players.filter((target) => target.alive && target.id !== playerId);
      if (skill.target === "other") return candidates.map((target) => target.id);
      if (skill.target === "ally") {
        return candidates.filter((target) => (this.mode.id === "classic8" || this.isAlly(playerId, target.id)) && (skill.effect !== "medicine" || target.hp < target.maxHp)).map((target) => target.id);
      }
      return candidates.filter((target) => (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map((target) => target.id);
    }
    useActiveSkill(playerId, targetId) {
      const player = this.player(playerId), skill = activeSkills[player?.characterId];
      if (!this.canAct(playerId)) return { ok: false, reason: "\u73B0\u5728\u4E0D\u80FD\u53D1\u52A8\u6280\u80FD" };
      if (!skill || player.turnFlags.activeUsed) return { ok: false, reason: "\u4E3B\u52A8\u6280\u672C\u56DE\u5408\u5DF2\u7ECF\u4F7F\u7528" };
      if (!this.getActiveSkillTargets(playerId).includes(targetId)) return { ok: false, reason: "\u6D88\u8017\u4E0D\u8DB3\u6216\u76EE\u6807\u4E0D\u5408\u6CD5" };
      if (isOnePieceCharacter(player)) return useOnePieceActive(this, playerId, targetId, skill);
      if (skill.cost) player.energy -= skill.cost;
      player.turnFlags.activeUsed = true;
      this.log("signature", `${this.nameOf(player)}\u53D1\u52A8\u4E3B\u52A8\u6280\u300C${skill.name}\u300D`);
      switch (skill.effect) {
        case "shadowClone": {
          const cards = player.hand.filter((card) => card.type === "basic" && !card.responseOnly);
          return this.requestChoice(playerId, {
            title: "\u5F71\u5206\u8EAB\uFF1A\u9009\u62E9\u57FA\u7840\u724C",
            text: "\u8BE5\u724C\u5C06\u6B63\u9762\u7F6E\u4E8E\u5206\u8EAB\u533A\uFF0C\u4E0D\u8BA1\u5165\u624B\u724C\u4E0A\u9650\u3002",
            options: cards.map((card) => ({ value: card.uid, label: `\u4EE5\u3010${card.name}\u3011\u5236\u9020\u5206\u8EAB`, description: card.description })),
            aiChoice: cards[0]?.uid,
            onResolve: (uid) => {
              const stored = this.storeSpecialCard(playerId, uid, "clone");
              if (stored) this.log("event", `${this.nameOf(player)}\u5C06\u3010${stored.card.name}\u3011\u5316\u4E3A\u5F71\u5206\u8EAB`);
            }
          });
        }
        case "byakugoStore":
          return this.resolveByakugoSkill(playerId);
        case "chessMove":
          player.chessTargetId = targetId;
          this.log("event", `${this.nameOf(player)}\u5C06${this.nameOf(targetId)}\u8BBE\u4E3A\u201C\u68CB\u5B50\u201D`);
          break;
        case "illusionPlot": {
          const cards = player.hand.filter((card) => card.strategyKind !== "plot");
          return this.requestChoice(playerId, {
            title: "\u5E7B\u8C61\u5E03\u7F6E\uFF1A\u9009\u62E9\u4F2A\u88C5\u724C",
            text: `\u8BE5\u724C\u5C06\u4F5C\u4E3A\u672A\u77E5\u4F0F\u7B14\u6307\u5B9A${this.nameOf(targetId)}\u3002`,
            options: cards.map((card) => ({ value: card.uid, label: `\u6697\u7F6E\u3010${card.name}\u3011`, description: card.description })),
            aiChoice: cards[0]?.uid,
            onResolve: (uid) => this.beginFalsePlot(playerId, targetId, uid)
          });
        }
        case "amenotejikara":
          return this.resolveAmenotejikara(playerId, targetId);
        case "copyNinjutsu":
          return this.resolveCopyNinjutsu(playerId);
        case "byakugan": {
          player.scoutedTargetId = targetId;
          player.scoutSetTurn = this.turnNumber;
          this.log("event", `${this.nameOf(player)}\u4EE5\u767D\u773C\u9501\u5B9A\u4E86${this.nameOf(targetId)}`);
          break;
        }
        case "toadBind": {
          player.toadBindTargetId = targetId;
          player.toadBindExpiresTurn = this.turnNumber + 1;
          player.roundFlags.toadBindUsed = true;
          this.log("event", `${this.nameOf(player)}\u4EE5\u201C\u86E4\u87C6\u53E3\u675F\u7F1A\u201D\u56F0\u4F4F\u4E86${this.nameOf(targetId)}`);
          return { ok: true };
        }
        case "sandBind":
          return this.resolveSandBind(playerId, targetId);
        case "curseExperiment":
          return this.resolveCurseExperiment(playerId, targetId);
        case "secondGear":
          this.loseHp(playerId, 1, null, "skill");
          if (player.alive) {
            this.draw(playerId, 2);
            player.attackLimit += 1;
          }
          break;
        case "medicine": {
          const basicCards = player.hand.filter((item) => item.type === "basic").map((item) => item.uid);
          return this.requestDiscard(playerId, 1, {
            reason: "\u533B\u672F\uFF1A\u8BF7\u9009\u62E91\u5F20\u57FA\u7840\u724C\u5F03\u7F6E",
            allowedUids: basicCards,
            shouldLog: false,
            onComplete: () => {
              const target = this.player(targetId);
              target.hp = clamp(target.hp + 1, 0, target.maxHp);
              this.log("heal", `${this.nameOf(target)}\u56DE\u590D\u4E861\u70B9\u4F53\u529B`);
              if (!player.roundFlags.diagnosis) {
                player.roundFlags.diagnosis = true;
                this.draw(playerId, 1);
                this.draw(targetId, 1);
              }
            }
          });
        }
        case "getsuga":
          return this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "active" });
        case "firstDance":
          this.player(targetId).frozenDraw = Math.max(1, this.player(targetId).frozenDraw);
          break;
        case "totalConcentration":
          return this.requestDiscard(playerId, 1, { reason: "\u5168\u96C6\u4E2D\u547C\u5438\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", shouldLog: false, onComplete: () => {
            this.draw(playerId, 2);
            player.turnFlags.rangeBonus = (player.turnFlags.rangeBonus || 0) + 1;
          } });
        case "poisonCoat":
          player.turnFlags.nextAttackPoison = true;
          break;
        case "sixEyes":
          this.draw(playerId, 2);
          return this.requestDiscard(playerId, 1, { reason: "\u516D\u773C\uFF1A\u6478\u724C\u540E\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", shouldLog: false });
        case "divergentPrep":
          player.turnFlags.nextAttackBonus = true;
          break;
        case "odmGear":
          return this.requestDiscard(playerId, 1, { reason: "\u7ACB\u4F53\u673A\u52A8\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", shouldLog: false, onComplete: () => {
            player.attackLimit += 1;
            player.turnFlags.rangeBonus = (player.turnFlags.rangeBonus || 0) + 1;
          } });
        case "tacticalGift": {
          const [card] = player.hand.splice(0, 1);
          if (card) this.player(targetId).hand.push(card);
          this.draw(targetId, 1);
          break;
        }
      }
      return { ok: true };
    }
    resolveByakugoSkill(playerId) {
      const player = this.player(playerId);
      const stored = this.getSpecialCards(playerId, "byakugo");
      const storedTypes = new Set(stored.map((item) => item.card.type));
      const cards = player.hand.filter((card) => !storedTypes.has(card.type));
      const canStore = stored.length < 3 && cards.length > 0;
      const typeNames = { basic: "\u57FA\u7840", strategy: "\u7B56\u7565", equipment: "\u88C5\u5907" };
      const options = [
        ...canStore ? [{ value: "store", label: "\u7EE7\u7EED\u84C4\u5370", description: "\u9009\u62E91\u5F20\u4E0D\u540C\u7C7B\u522B\u624B\u724C\u7F6E\u5165\u767E\u8C6A\u533A" }] : [],
        ...stored.map((item) => ({
          value: `release:${item.uid}`,
          label: `\u89E3\u653E\u3010${item.card.name}\u3011`,
          description: item.card.type === "basic" ? "\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u5F3A\u5316\u4E0B\u4E00\u6B21\u653B\u51FB" : item.card.type === "strategy" ? "\u51C0\u5316\u4F0F\u7B14\u6216\u5F02\u5E38\u5E76\u64781\u5F20\u724C" : "\u83B7\u5F972\u70B9\u62A4\u76FE"
        }))
      ];
      const preferredRelease = stored.find((item) => item.card.type === "basic" && player.hp < player.maxHp) || stored.find((item) => item.card.type === "strategy" && (this.plotsTargeting(playerId).length || player.poison || player.frozenDraw || player.skipOffense || player.energyLocked || player.signatureLocked)) || (!canStore ? stored[0] : null);
      return this.requestChoice(playerId, {
        title: "\u767E\u8C6A\u5370\uFF1A\u84C4\u5370\u6216\u89E3\u653E",
        text: "\u6BCF\u56DE\u5408\u53EF\u9009\u62E9\u7EE7\u7EED\u50A8\u5B58\uFF0C\u6216\u4E3B\u52A8\u89E3\u653E\u4E00\u5F20\u767E\u8C6A\u724C\u3002",
        options,
        aiChoice: preferredRelease ? `release:${preferredRelease.uid}` : "store",
        onResolve: (value) => {
          if (value === "store") {
            this.requestChoice(playerId, {
              title: "\u767E\u8C6A\u84C4\u5370\uFF1A\u9009\u62E9\u5361\u724C",
              text: "\u767E\u8C6A\u533A\u6700\u591A3\u5F20\uFF0C\u4E14\u5361\u724C\u7C7B\u522B\u4E0D\u80FD\u91CD\u590D\u3002",
              options: cards.map((card) => ({ value: card.uid, label: `\u84C4\u5165\u3010${card.name}\u3011`, description: `${typeNames[card.type]}\u724C \xB7 ${card.description}` })),
              aiChoice: cards[0]?.uid,
              onResolve: (uid2) => {
                const sealed = this.storeSpecialCard(playerId, uid2, "byakugo");
                if (sealed) this.log("event", `${this.nameOf(player)}\u84C4\u5165\u4E86\u4E00\u5F20${typeNames[sealed.card.type]}\u767E\u8C6A\u724C`);
              }
            });
            return;
          }
          const uid = value?.slice("release:".length);
          const selected = stored.find((item) => item.uid === uid);
          if (!selected || !this.consumeByakugo(playerId, selected.card.type, `\u4E3B\u52A8\u89E3\u653E\u3010${selected.card.name}\u3011`)) return;
          if (selected.card.type === "basic") {
            player.hp = clamp(player.hp + 1, 0, player.maxHp);
            this.log("heal", `${this.nameOf(player)}\u4EE5\u767E\u8C6A\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u51DD\u805A\u602A\u529B`);
          } else if (selected.card.type === "strategy") {
            this.draw(playerId, 1);
            this.log("event", `${this.nameOf(player)}\u4EE5\u533B\u7597\u5FCD\u672F\u51C0\u5316\u5F02\u5E38\u5E76\u64781\u5F20\u724C`);
          } else {
            this.gainShield(playerId, 2);
            this.log("event", `${this.nameOf(player)}\u5C06\u88C5\u5907\u767E\u8C6A\u724C\u8F6C\u5316\u4E3A2\u70B9\u62A4\u76FE`);
          }
        }
      });
    }
    resolveAmenotejikara(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      const slots = ["weapon", "armor", "charm"].filter((slot) => source.equipment[slot] || target.equipment[slot]);
      return this.requestChoice(sourceId, {
        title: "\u5929\u624B\u529B\uFF1A\u9009\u62E9\u6362\u4F4D\u69FD\u4F4D",
        text: `\u4E0E${this.nameOf(target)}\u4EA4\u6362\u5BF9\u5E94\u88C5\u5907\uFF0C\u5E76\u5EFA\u7ACB\u8FFD\u730E\u6807\u8BB0\u3002`,
        options: slots.map((slot) => ({ value: slot, label: { weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot], description: `${source.equipment[slot]?.name || "\u7A7A\u69FD"} \u2194 ${target.equipment[slot]?.name || "\u7A7A\u69FD"}` })),
        aiChoice: slots[0],
        onResolve: (slot) => {
          const sourceEquip = source.equipment[slot], targetEquip = target.equipment[slot];
          this.moveEquipment(source.id, slot, targetEquip, sourceId);
          this.moveEquipment(target.id, slot, sourceEquip, sourceId);
          source.swapMarkedId = targetId;
          this.log("event", `${this.nameOf(source)}\u4EE5\u201C\u5929\u624B\u529B\u201D\u4EA4\u6362${{ weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot]}\u5E76\u6807\u8BB0${this.nameOf(target)}`);
        }
      });
    }
    resolveCopyNinjutsu(playerId) {
      const player = this.player(playerId);
      const candidates = [...this.discard].reverse().filter((card) => !card.responseOnly && !card._copiedBy && (card.type === "basic" || card.strategyKind === "instant"));
      return this.requestChoice(playerId, {
        title: "\u62F7\u8D1D\u5FCD\u672F\uFF1A\u9009\u62E9\u672F\u5F0F",
        text: "\u751F\u6210\u7684\u62F7\u8D1D\u4E0D\u8BA1\u51FA\u724C\u6570\uFF0C\u4EC5\u6301\u7EED\u5230\u672C\u56DE\u5408\u7ED3\u675F\u3002",
        options: candidates.map((card) => ({ value: card.uid, label: `\u590D\u523B\u3010${card.name}\u3011`, description: card.description })),
        aiChoice: candidates.find((card) => card.type === "strategy")?.uid || candidates[0]?.uid,
        onResolve: (uid) => {
          const original = candidates.find((card) => card.uid === uid);
          if (!original) return;
          const copy = { ...original, uid: `copy-${original.uid}-${this.instance++}`, name: `\u62F7\u8D1D\xB7${original.name}`, _copiedBy: playerId, _ephemeral: true };
          player.hand.push(copy);
          if (original.type === "basic") player.turnFlags.nextAttackBonus = true;
          if (original.type === "strategy") player.turnFlags.copyNoIntervene = true;
          this.log("event", `${this.nameOf(player)}\u590D\u523B\u4E86\u3010${original.name}\u3011`);
        }
      });
    }
    resolveCurseExperiment(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      return this.requestDiscard(sourceId, 1, {
        reason: "\u5492\u5370\u5B9E\u9A8C\uFF1A\u9009\u62E91\u5F20\u624B\u724C\u4F5C\u4E3A\u7C7B\u522B\u6837\u672C",
        onComplete: (removed) => {
          const sample = removed[0];
          if (!sample || !target?.alive) return;
          source.curseResearchType = sample.type;
          target.curseSeal = { sourceId, type: sample.type, setTurn: this.turnNumber };
          this.log("event", `${this.nameOf(source)}\u4EE5${{ basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" }[sample.type]}\u4E3A\u6837\u672C\uFF0C\u5BF9${this.nameOf(target)}\u5E03\u4E0B\u5492\u5370`);
        }
      });
    }
    findToadBindOwner(targetId) {
      return this.players.find((player) => player.alive && player.characterId === "jiraiya" && player.toadBindTargetId === targetId);
    }
    findChessOwner(targetId) {
      return this.players.find((player) => player.alive && player.characterId === "shikamaru" && player.chessTargetId === targetId);
    }
    handleChessPressure(playerId, card, cardUid, targetId, options = {}) {
      if (options.ignoreChessPressure || card.id !== "attack" && card.type !== "strategy") return null;
      const owner = this.findChessOwner(playerId);
      const player = this.player(playerId);
      if (!owner || player.roundFlags.chessPressure) return null;
      const markTriggered = () => {
        player.roundFlags.chessPressure = true;
      };
      const cancel = () => {
        markTriggered();
        this.removeCard(playerId, cardUid);
        this.log("event", `${this.nameOf(player)}\u88AB\u201C\u5F71\u7F1D\u201D\u6253\u65AD\u4E86\u3010${card.name}\u3011`);
        this.notifyCardCancelled(playerId, "\u68CB\u5B50\u51FA\u724C\u88AB\u53D6\u6D88");
        return { ok: true, cancelled: true };
      };
      const proceed = () => {
        markTriggered();
        return this.playCard(playerId, cardUid, targetId, { ...options, ignoreChessPressure: true });
      };
      const payable = player.hand.filter((item) => item.uid !== cardUid);
      if (!payable.length) return cancel();
      if (!player.human) {
        this.discardRandom(playerId, 1, true, payable.map((item) => item.uid));
        return proceed();
      }
      return this.requestChoice(playerId, {
        title: "\u5F71\u7F1D\u89E6\u53D1",
        text: `\u4F60\u88AB${this.nameOf(owner)}\u7684\u68CB\u5B50\u9501\u5B9A\u3002\u5F03\u7F6E\u53E6\u4E00\u5F20\u624B\u724C\u53EF\u7EE7\u7EED\uFF0C\u5426\u5219\u6B64\u724C\u88AB\u53D6\u6D88\u3002`,
        options: [{ value: "pay", label: "\u5F03\u724C\u7EE7\u7EED" }, { value: "cancel", label: "\u53D6\u6D88\u6B64\u724C" }],
        onResolve: (value) => {
          if (value === "pay") this.requestDiscard(playerId, 1, { reason: "\u5F71\u7F1D\uFF1A\u8BF7\u5F03\u7F6E\u5F53\u524D\u5F85\u4F7F\u7528\u724C\u4E4B\u5916\u76841\u5F20\u724C", allowedUids: payable.map((item) => item.uid), onComplete: proceed });
          else cancel();
        }
      });
    }
    resolveSandBind(sourceId, targetId) {
      const target = this.player(targetId);
      if (!target?.alive) return { ok: false, reason: "\u76EE\u6807\u5DF2\u7ECF\u9000\u573A" };
      target.sandMarkedBy = sourceId;
      target.sandMarkSetTurn = this.turnNumber;
      const finish = (removed) => {
        if (removed.length) {
          target.frozenDraw = Math.max(1, target.frozenDraw);
          this.log("event", `${this.nameOf(target)}\u88AB\u201C\u7802\u7F1A\u7262\u201D\u9650\u5236\uFF0C\u4E0B\u56DE\u5408\u5C11\u64781\u5F20\u724C`);
        } else if (target.alive) {
          this.log("event", `${this.nameOf(target)}\u6CA1\u6709\u624B\u724C\uFF0C\u7802\u7F1A\u7262\u9020\u62101\u70B9\u4F24\u5BB3`);
          this.dealDamage(sourceId, targetId, 1, "skill");
        }
      };
      return this.requestDiscard(targetId, 1, { reason: "\u7802\u7F1A\u7262\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", onComplete: finish });
    }
    handleToadBind(playerId, card, cardUid, targetId, options = {}) {
      if (options.ignoreToadBind || card.id !== "attack" && card.type !== "strategy") return null;
      const owner = this.findToadBindOwner(playerId);
      if (!owner) return null;
      const player = this.player(playerId);
      const clear = () => {
        owner.toadBindTargetId = null;
        owner.toadBindExpiresTurn = 0;
      };
      const cancel = () => {
        clear();
        this.removeCard(playerId, cardUid);
        this.log("event", `${this.nameOf(player)}\u88AB\u201C\u86E4\u87C6\u53E3\u675F\u7F1A\u201D\u6253\u65AD\u4E86\u3010${card.name}\u3011`);
        this.draw(owner.id, 1);
        this.log("event", `${this.nameOf(owner)}\u53D1\u52A8\u201C\u86E4\u87C6\u534F\u653B\u201D\u64781\u5F20\u724C`);
        this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u86E4\u87C6\u675F\u7F1A\u53D6\u6D88");
        return { ok: true, cancelled: true };
      };
      const proceed = () => {
        clear();
        this.gainEnergy(owner.id, 1);
        this.log("event", `${this.nameOf(owner)}\u53D1\u52A8\u201C\u86E4\u87C6\u534F\u653B\u201D\u83B7\u5F971\u70B9\u80FD\u91CF`);
        return this.playCard(playerId, cardUid, targetId, { ...options, ignoreToadBind: true });
      };
      const payable = player.hand.filter((item) => item.uid !== cardUid);
      if (!payable.length) return cancel();
      if (!player.human) {
        this.discardRandom(playerId, 1, true, payable.map((item) => item.uid));
        return proceed();
      }
      return this.requestChoice(playerId, {
        title: "\u86E4\u87C6\u53E3\u675F\u7F1A\u89E6\u53D1",
        text: `\u4F60\u672C\u56DE\u5408\u9996\u6B21\u4F7F\u7528\u3010${card.name}\u3011\u3002\u5F03\u7F6E\u53E6\u4E00\u5F20\u624B\u724C\u53EF\u7EE7\u7EED\uFF0C\u5426\u5219\u6B64\u724C\u88AB\u53D6\u6D88\u3002`,
        options: [{ value: "pay", label: "\u5F03\u724C\u7EE7\u7EED" }, { value: "cancel", label: "\u53D6\u6D88\u6B64\u724C" }],
        onResolve: (value) => {
          if (value === "pay") this.requestDiscard(playerId, 1, { reason: "\u86E4\u87C6\u53E3\u675F\u7F1A\uFF1A\u8BF7\u5F03\u7F6E\u5F53\u524D\u5F85\u4F7F\u7528\u724C\u4E4B\u5916\u76841\u5F20\u724C", allowedUids: payable.map((item) => item.uid), onComplete: proceed });
          else cancel();
        }
      });
    }
    handleUsoppLie(playerId, card, cardUid, targetId, options = {}) {
      if (options.ignoreLie || card.responseOnly || card.id !== "attack" && card.type !== "strategy") return null;
      const owner = this.players.find((player) => player.alive && player.characterId === "usopp" && player.specialCards.some((item) => item.kind === "lie" && item.targetId === playerId));
      if (!owner) return null;
      const lie = owner.specialCards.find((item) => item.kind === "lie" && item.targetId === playerId);
      const clear = () => {
        owner.specialCards = owner.specialCards.filter((item) => item.uid !== lie.uid);
        this.discard.push(lie.card);
        this.emitOnePieceEvent({ type: "lieTriggered", sourceId: owner.id, targetId: playerId });
      };
      const cancel = () => {
        clear();
        this.removeCard(playerId, cardUid);
        this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u8C0E\u8A00\u5F39\u53D6\u6D88");
        this.log("event", `${this.nameOf(playerId)}\u88AB\u4E4C\u7D22\u666E\u7684\u201C\u8C0E\u8A00\u5F39\u201D\u53D6\u6D88\u4E86\u3010${card.name}\u3011`);
        return { ok: true, cancelled: true };
      };
      const proceed = () => {
        clear();
        return this.playCard(playerId, cardUid, targetId, { ...options, ignoreLie: true });
      };
      const payable = this.player(playerId).hand.filter((item) => item.uid !== cardUid);
      if (!payable.length) return cancel();
      if (!this.player(playerId).human) {
        this.discardRandom(playerId, 1, true, payable.map((item) => item.uid));
        return proceed();
      }
      return this.requestChoice(playerId, {
        title: "\u8C0E\u8A00\u5F39\u89E6\u53D1",
        text: `\u4F60\u88AB${this.nameOf(owner)}\u7684\u672A\u77E5\u8C0E\u8A00\u6807\u8BB0\u3002\u5F03\u7F6E\u53E6\u4E00\u5F20\u624B\u724C\u53EF\u7EE7\u7EED\uFF0C\u5426\u5219\u5F53\u524D\u724C\u88AB\u53D6\u6D88\u3002`,
        options: [{ value: "pay", label: "\u5F03\u724C\u7EE7\u7EED" }, { value: "cancel", label: "\u53D6\u6D88\u5F53\u524D\u724C" }],
        onResolve: (value) => value === "pay" ? this.requestDiscard(playerId, 1, { reason: "\u8C0E\u8A00\u5F39\uFF1A\u8BF7\u5F03\u7F6E\u53E6\u4E00\u5F20\u624B\u724C", allowedUids: payable.map((item) => item.uid), onComplete: proceed }) : cancel()
      });
    }
    playCard(playerId, cardUid, targetId, options = {}) {
      const player = this.player(playerId);
      if (!options.freeUse && !this.canAct(playerId)) return { ok: false, reason: "\u73B0\u5728\u4E0D\u80FD\u51FA\u724C" };
      if (options.freeUse && (!player?.alive || this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice)) return { ok: false, reason: "\u73B0\u5728\u4E0D\u80FD\u51FA\u724C" };
      const index = player.hand.findIndex((card2) => card2.uid === cardUid);
      const card = player.hand[index];
      if (!card || card.responseOnly) return { ok: false, reason: "\u8FD9\u5F20\u724C\u53EA\u80FD\u7528\u4E8E\u54CD\u5E94" };
      if (!this.getCardTargets(playerId, card).includes(targetId)) return { ok: false, reason: "\u76EE\u6807\u4E0D\u5408\u6CD5" };
      if (card.id === "attack" && !options.freeUse && (player.skipOffense || player.attacksUsed >= player.attackLimit)) return { ok: false, reason: player.skipOffense ? "\u4F60\u672C\u56DE\u5408\u65E0\u6CD5\u653B\u51FB" : "\u672C\u56DE\u5408\u653B\u51FB\u6B21\u6570\u5DF2\u7528\u5B8C" };
      if (card.type === "strategy" && player.skipOffense) return { ok: false, reason: "\u4F60\u672C\u56DE\u5408\u65E0\u6CD5\u4F7F\u7528\u7B56\u7565\u724C" };
      if (player.curseSeal?.type === card.type) {
        const curse = player.curseSeal;
        const experimenter = this.player(curse.sourceId);
        player.curseSeal = null;
        if (experimenter?.alive) {
          player.hand.splice(index, 1);
          card._curseSpoil = experimenter.id;
          experimenter.hand.push(card);
          this.gainEnergy(experimenter.id, 1);
          this.log("event", `${this.nameOf(player)}\u89E6\u53D1\u5492\u5370\uFF0C\u3010${card.name}\u3011\u88AB${this.nameOf(experimenter)}\u593A\u4E3A\u5B9E\u9A8C\u724C`);
          this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u5492\u5370\u593A\u53D6");
          return { ok: true, cancelled: true };
        }
      }
      this.emitOnePieceEvent({ type: "cardDeclared", sourceId: playerId, targetId, card });
      if (!options.freeUse) {
        const checkmate = this.plotsTargeting(playerId, "checkmateTrap")[0];
        if (checkmate) {
          if (this.consumeByakugo(playerId, "strategy", "\u89E3\u9664\u4E86\u201C\u5C06\u519B\u201D\u9677\u9631")) {
            this.removePlot(checkmate);
          } else {
            this.removePlot(checkmate);
            this.log("event", `${this.nameOf(player)}\u88AB\u201C\u5C06\u519B\u201D\u4E2D\u65AD\u4E86\u51FA\u724C\u9636\u6BB5`);
            this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u5C06\u519B\u53D6\u6D88");
            return this.forceEndPlayPhase(playerId);
          }
        }
      }
      if (!options.skipRhythm && !options.freeUse && !card._copiedBy && (player.turnFlags.cardsPlayed || 0) >= 2) {
        const rhythm = this.plotsTargeting(playerId, "rhythmBreak")[0];
        if (rhythm) return this.triggerRhythmBreak(rhythm, playerId, cardUid, targetId);
      }
      const bindResult = this.handleToadBind(playerId, card, cardUid, targetId, options);
      if (bindResult) return bindResult;
      const lieResult = this.handleUsoppLie(playerId, card, cardUid, targetId, options);
      if (lieResult) return lieResult;
      const chessResult = this.handleChessPressure(playerId, card, cardUid, targetId, options);
      if (chessResult) return chessResult;
      player.hand.splice(index, 1);
      if (card.type !== "equipment" && card.strategyKind !== "plot" && !card._ephemeral) this.discard.push(card);
      if (!options.freeUse && !card._copiedBy) player.turnFlags.cardsPlayed = (player.turnFlags.cardsPlayed || 0) + 1;
      this.log("card", `${this.nameOf(player)}\u4F7F\u7528\u4E86\u3010${card.name}\u3011${targetId !== playerId ? `\uFF0C\u76EE\u6807\u662F${this.nameOf(targetId)}` : ""}`);
      this.emitOnePieceEvent({ type: "cardResolved", sourceId: playerId, targetId, card });
      if (player.characterId === "kakashi" && card._copiedBy === playerId && !player.roundFlags.copyRecovery) {
        player.roundFlags.copyRecovery = true;
        this.gainEnergy(playerId, 1);
        this.log("event", `${this.nameOf(player)}\u56DE\u6536\u62F7\u8D1D\u5FCD\u672F\u7684\u67E5\u514B\u62C9\uFF0C\u83B7\u5F971\u70B9\u80FD\u91CF`);
      }
      if (player.characterId === "orochimaru" && player.curseResearchType === card.type) {
        this.gainEnergy(playerId, 1);
        this.log("event", `${this.nameOf(player)}\u4F7F\u7528\u7814\u7A76\u7C7B\u522B\u724C\uFF0C\u83B7\u5F971\u70B9\u80FD\u91CF`);
      }
      if (player.characterId === "hinata" && card.type === "strategy" && targetId === player.scoutedTargetId && !player.roundFlags.meridianSeal) {
        player.roundFlags.meridianSeal = true;
        const target = this.player(targetId);
        if (target?.alive) {
          target.energyLocked = true;
          this.log("event", `${this.nameOf(player)}\u4EE5\u201C\u7ECF\u7EDC\u5C01\u9501\u201D\u963B\u65AD${this.nameOf(target)}\u7684\u80FD\u91CF\u83B7\u53D6`);
        }
      }
      if (card.id === "attack") {
        if (!options.freeUse) player.attacksUsed += 1;
        const result = this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "attack", freeUse: options.freeUse });
        return this.finishBasicUse(playerId, card, result);
      }
      if (card.id === "heal") return this.finishBasicUse(playerId, card, this.resolveHeal(playerId, targetId));
      if (card.id === "focus") {
        this.gainEnergy(playerId, 1);
        this.draw(playerId, 1);
        return this.finishBasicUse(playerId, card, { ok: true });
      }
      if (card.id === "overdrive") {
        if (player.turnFlags.overdriveUsed) {
          player.hand.push(this.discard.pop());
          return { ok: false, reason: "\u672C\u56DE\u5408\u5DF2\u4F7F\u7528\u8D85\u8F7D" };
        }
        player.turnFlags.overdriveUsed = true;
        player.turnFlags.nextAttackBonus = true;
        return this.finishBasicUse(playerId, card, { ok: true });
      }
      if (card.id === "adapt") return this.resolveAdapt(playerId, card, targetId, options);
      if (card.type === "strategy") return this.resolveStrategyCard(playerId, targetId, card);
      if (card.type === "equipment") return this.equip(playerId, card);
      return { ok: true };
    }
    finishBasicUse(playerId, card, result) {
      const echo = this.player(playerId)?.plots.find((plot) => plot.effect === "echoScript" && plot.armed);
      if (echo) {
        this.removePlot(echo);
        const index = this.discard.findIndex((item) => item.uid === card.uid);
        if (index >= 0 && this.player(playerId)?.alive) {
          this.player(playerId).hand.push(this.discard.splice(index, 1)[0]);
          this.log("event", `\u3010\u62DB\u5F0F\u6B8B\u54CD\u3011\u5C06\u3010${card.name}\u3011\u9001\u56DE\u4E86${this.nameOf(playerId)}\u7684\u624B\u724C`);
        }
      }
      return result;
    }
    resolveAdapt(playerId, physicalCard, targetId, options = {}) {
      const player = this.player(playerId);
      const forms = [];
      if (targetId !== playerId && this.distance(playerId, targetId) <= this.attackRange(playerId) && (options.freeUse || player.attacksUsed < player.attackLimit)) forms.push({ value: "attack", label: `\u5316\u4E3A\u7A81\u51FB \u2192 ${this.nameOf(targetId)}` });
      if (targetId === playerId && player.hp < player.maxHp) forms.push({ value: "heal", label: "\u5316\u4E3A\u6062\u590D" });
      if (targetId === playerId) forms.push({ value: "focus", label: "\u5316\u4E3A\u84C4\u80FD" });
      if (targetId === playerId && !player.turnFlags.overdriveUsed) forms.push({ value: "overdrive", label: "\u5316\u4E3A\u8D85\u8F7D" });
      if (!forms.length) {
        const discardIndex = this.discard.findIndex((item) => item.uid === physicalCard.uid);
        if (discardIndex >= 0) player.hand.push(this.discard.splice(discardIndex, 1)[0]);
        return { ok: false, reason: "\u6CA1\u6709\u53EF\u7528\u7684\u5E94\u53D8\u5F62\u6001" };
      }
      return this.requestChoice(playerId, {
        title: "\u9009\u62E9\u5E94\u53D8\u5F62\u6001",
        text: `\u3010\u5E94\u53D8\u3011\u5C06\u4EE5\u9009\u5B9A\u7684\u57FA\u7840\u724C\u6548\u679C\u7ED3\u7B97\u3002`,
        options: forms,
        aiChoice: forms.some((item) => item.value === "attack") ? "attack" : forms[0].value,
        onResolve: (form) => {
          if (form === "attack") {
            if (!options.freeUse) player.attacksUsed += 1;
            this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "attack", freeUse: options.freeUse });
          } else if (form === "heal") this.resolveHeal(playerId, playerId);
          else if (form === "focus") {
            this.gainEnergy(playerId, 1);
            this.draw(playerId, 1);
          } else if (form === "overdrive") {
            player.turnFlags.overdriveUsed = true;
            player.turnFlags.nextAttackBonus = true;
          }
          this.finishBasicUse(playerId, physicalCard, { ok: true });
        }
      });
    }
    equip(playerId, card, { replaceToHand = false, sourceId = playerId } = {}) {
      const player = this.player(playerId);
      const old = player.equipment[card.slot];
      if (old) {
        if (replaceToHand && player.alive) player.hand.push(old);
        else this.discard.push(old);
      }
      player.equipment[card.slot] = card;
      this.refreshEnergyCap(player);
      if (card.id === "battery") this.gainEnergy(playerId, 1);
      this.log("event", `${this.nameOf(player)}\u88C5\u5907\u4E86\u3010${card.name}\u3011`);
      this.emitOnePieceEvent({ type: "equipmentChanged", sourceId, ownerId: playerId, targetId: playerId, slot: card.slot, entered: card, left: old, card, old });
      return { ok: true };
    }
    moveEquipment(playerId, slot, card, sourceId = playerId) {
      const owner = this.player(playerId);
      if (!owner) return null;
      const left = owner.equipment[slot] || null;
      owner.equipment[slot] = card || null;
      this.refreshEnergyCap(owner);
      this.emitOnePieceEvent({ type: "equipmentChanged", sourceId, ownerId: playerId, targetId: playerId, slot, entered: card || null, left, card: card || null, old: left, moved: true });
      return left;
    }
    resolveHeal(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      const before = target.hp;
      target.hp = clamp(target.hp + 1, 0, target.maxHp);
      this.log("heal", `${this.nameOf(target)}\u56DE\u590D\u4E861\u70B9\u4F53\u529B`);
      if (target.hp > before) this.emitOnePieceEvent({ type: "afterHeal", sourceId, targetId, amount: target.hp - before });
      if (source.characterId === "chopper" && sourceId !== targetId && !source.roundFlags.diagnosis) {
        source.roundFlags.diagnosis = true;
        this.draw(sourceId, 1);
        this.draw(targetId, 1);
        this.log("event", `${this.nameOf(source)}\u53D1\u52A8\u201C\u8BCA\u65AD\u201D\uFF0C\u53CC\u65B9\u5404\u64781\u5F20\u724C`);
      }
      return { ok: true };
    }
    resolveStrategyCard(sourceId, targetId, card) {
      if (card.strategyKind === "plot") return this.beginPlot(sourceId, targetId, card);
      if (card.id === "dimensional_barrage") return this.resolveMassDamageStrategy(sourceId, card, "guard");
      if (card.id === "rift_invasion") return this.resolveMassDamageStrategy(sourceId, card, "attack");
      if (card.id === "will_duel") return this.offerStrategyIntervention(sourceId, targetId, card, (actualTargetId) => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveWillDuel(sourceId, actualTargetId)));
      if (card.id === "mind_burn") return this.offerStrategyIntervention(sourceId, targetId, card, (actualTargetId) => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveMindBurn(sourceId, actualTargetId)));
      if (card.id === "energy_collapse") return this.offerStrategyIntervention(sourceId, targetId, card, (actualTargetId) => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveEnergyCollapse(sourceId, actualTargetId)));
      if (card.id === "memory_exchange") return this.offerStrategyIntervention(sourceId, targetId, card, (actualTargetId) => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveMemoryExchange(sourceId, actualTargetId)));
      if (card.id === "equipment_shift") return this.resolveEquipmentShiftSetup(sourceId, targetId, card);
      if (card.id === "tactical_relay") return this.resolveTacticalRelay(sourceId, targetId);
      if (card.id === "energy_auction") return this.resolveEnergyAuction(sourceId);
      if (card.id === "initiative_swap") return this.resolveInitiativeSwapSetup(sourceId, targetId, card);
      if (card.id === "limit_contract") return this.resolveLimitContract(sourceId, targetId);
      return { ok: true };
    }
    clockwiseTargets(sourceId) {
      const source = this.player(sourceId);
      if (!source) return [];
      const count = this.players.length;
      return this.players.filter((player) => player.alive && player.id !== sourceId).sort((a, b) => (a.seat - source.seat + count) % count - (b.seat - source.seat + count) % count).map((player) => player.id);
    }
    strategyResponseResources(playerId, kind) {
      if (kind === "guard") return this.guardResources(playerId);
      const player = this.player(playerId);
      return player?.hand.filter((card) => card.id === "attack" || card.id === "adapt").length || 0;
    }
    spendStrategyResponse(playerId, kind) {
      if (kind === "guard") return this.spendGuards(playerId, 1);
      const player = this.player(playerId);
      const card = player?.hand.find((item) => item.id === "attack") || player?.hand.find((item) => item.id === "adapt");
      if (card) this.removeCard(playerId, card.uid);
    }
    resolveMassDamageStrategy(sourceId, card, responseKind) {
      const targetIds = this.clockwiseTargets(sourceId);
      const total = targetIds.length;
      const step = (index) => {
        if (this.winner || index >= targetIds.length) {
          this.pendingStrategySequence = null;
          return { ok: true };
        }
        const targetId = targetIds[index], target = this.player(targetId);
        if (!target?.alive) return step(index + 1);
        this.pendingStrategySequence = { kind: "mass", cardName: card.name, sourceId, currentTargetId: targetId, current: index + 1, total, remaining: total - index - 1 };
        const responseLabel = responseKind === "guard" ? "\u9632\u5FA1\u6216\u5E94\u53D8" : "\u7A81\u51FB\u6216\u5E94\u53D8";
        const options = [];
        if (this.strategyResponseResources(targetId, responseKind) > 0) options.push({ value: "respond", label: `\u6253\u51FA${responseLabel}`, description: "\u62B5\u6D88\u5BF9\u81EA\u5DF1\u7684\u8FD9\u6B21\u6548\u679C" });
        if (target.hand.some((item) => item.id === "counter")) options.push({ value: "counter", label: "\u6253\u51FA\u53CD\u5236", description: "\u4EC5\u514D\u9664\u5BF9\u81EA\u5DF1\u7684\u6548\u679C\uFF0C\u4E0D\u5F71\u54CD\u5176\u4ED6\u76EE\u6807" });
        options.push({ value: "take", label: "\u4E0D\u54CD\u5E94", description: "\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3" });
        const aiChoice = options.some((option) => option.value === "respond") ? "respond" : options.some((option) => option.value === "counter") && (target.hp <= 1 || !this.isAlly(sourceId, targetId)) ? "counter" : "take";
        return this.requestChoice(targetId, {
          title: `${card.name} \xB7 \u54CD\u5E94 ${index + 1}/${total}`,
          text: `${this.nameOf(sourceId)}\u53D1\u52A8\u3010${card.name}\u3011\uFF0C${this.nameOf(targetId)}\u987B\u6253\u51FA${responseLabel}\uFF0C\u5426\u5219\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002`,
          options,
          aiChoice,
          onResolve: (value) => {
            if (value === "respond") {
              this.spendStrategyResponse(targetId, responseKind);
              this.log("event", `${this.nameOf(targetId)}\u54CD\u5E94\u3010${card.name}\u3011\uFF0C\u514D\u9664\u4E86\u6B64\u6B21\u6548\u679C`);
              step(index + 1);
            } else if (value === "counter") {
              const counter = target.hand.find((item) => item.id === "counter");
              if (counter) this.removeCard(targetId, counter.uid);
              this.log("event", `${this.nameOf(targetId)}\u4EE5\u3010\u53CD\u5236\u3011\u514D\u9664\u4E86\u3010${card.name}\u3011\u5BF9\u81EA\u5DF1\u7684\u6548\u679C`);
              step(index + 1);
            } else this.dealDamage(sourceId, targetId, 1, "strategy", () => step(index + 1));
          }
        });
      };
      const result = step(0);
      return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard || this.pendingResponse), result };
    }
    resolveWillDuel(sourceId, targetId) {
      const exchange = (currentId, opponentId, count = 1) => {
        const current = this.player(currentId), opponent = this.player(opponentId);
        if (this.winner || !current?.alive || !opponent?.alive) {
          this.pendingStrategySequence = null;
          return { ok: true };
        }
        const cards = current.hand.filter((card) => card.id === "attack" || card.id === "adapt");
        this.pendingStrategySequence = { kind: "duel", cardName: "\u610F\u5FD7\u5BF9\u51B3", sourceId, currentTargetId: currentId, current: count, total: null, remaining: null };
        return this.requestChoice(currentId, {
          title: `\u610F\u5FD7\u5BF9\u51B3 \xB7 \u7B2C${count}\u6B21\u4EA4\u950B`,
          text: `${this.nameOf(currentId)}\u987B\u6253\u51FA\u7A81\u51FB\u6216\u5E94\u53D8\uFF0C\u5426\u5219\u53D7\u5230${this.nameOf(opponentId)}\u9020\u6210\u76841\u70B9\u7B56\u7565\u4F24\u5BB3\u3002`,
          options: [...cards.map((card) => ({ value: card.uid, label: `\u6253\u51FA\u3010${card.name}\u3011`, description: "\u4F5C\u4E3A\u5BF9\u51B3\u54CD\u5E94\uFF0C\u4E0D\u6D88\u8017\u7A81\u51FB\u6B21\u6570" })), { value: "pass", label: "\u505C\u6B62\u5BF9\u51B3", description: "\u627F\u53D71\u70B9\u7B56\u7565\u4F24\u5BB3" }],
          aiChoice: cards.find((card) => card.id === "attack")?.uid || cards[0]?.uid || "pass",
          onResolve: (value) => {
            if (value === "pass") return this.dealDamage(opponentId, currentId, 1, "strategy", () => {
              this.pendingStrategySequence = null;
            });
            const card = current.hand.find((item) => item.uid === value && (item.id === "attack" || item.id === "adapt"));
            if (!card) return this.dealDamage(opponentId, currentId, 1, "strategy", () => {
              this.pendingStrategySequence = null;
            });
            this.removeCard(currentId, card.uid);
            this.log("event", `${this.nameOf(currentId)}\u5728\u3010\u610F\u5FD7\u5BF9\u51B3\u3011\u4E2D\u6253\u51FA\u3010${card.name}\u3011`);
            exchange(opponentId, currentId, count + 1);
          }
        });
      };
      return exchange(targetId, sourceId);
    }
    resolveMindBurn(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      if (!source?.alive || !target?.alive || !target.hand.length) return { ok: true };
      return this.requestChoice(targetId, {
        title: "\u7CBE\u795E\u707C\u70E7 \xB7 \u5C55\u793A\u624B\u724C",
        text: "\u9009\u62E9\u4E00\u5F20\u624B\u724C\u5C55\u793A\uFF1B\u8BE5\u724C\u7ED3\u7B97\u540E\u4ECD\u4FDD\u7559\u5728\u4F60\u7684\u624B\u4E2D\u3002",
        options: target.hand.map((card) => ({ value: card.uid, label: `\u5C55\u793A\u3010${card.name}\u3011`, description: { basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" }[card.type] })),
        aiChoice: target.hand[0].uid,
        onResolve: (uid) => {
          const shown = target.hand.find((card) => card.uid === uid);
          if (!shown) return;
          this.log("event", `${this.nameOf(target)}\u4E3A\u3010\u7CBE\u795E\u707C\u70E7\u3011\u5C55\u793A\u4E86${{ basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" }[shown.type]}\u3010${shown.name}\u3011`);
          const matches = source.hand.filter((card) => card.type === shown.type);
          if (!matches.length) return this.log("event", `${this.nameOf(source)}\u6CA1\u6709\u5F03\u7F6E\u540C\u7C7B\u522B\u624B\u724C\uFF0C\u3010\u7CBE\u795E\u707C\u70E7\u3011\u672A\u9020\u6210\u4F24\u5BB3`);
          this.requestChoice(sourceId, {
            title: "\u7CBE\u795E\u707C\u70E7 \xB7 \u662F\u5426\u8FFD\u51FB",
            text: `\u5F03\u7F6E\u4E00\u5F20${{ basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" }[shown.type]}\uFF0C\u5BF9${this.nameOf(target)}\u9020\u62101\u70B9\u7B56\u7565\u4F24\u5BB3\u3002`,
            options: [{ value: "pass", label: "\u653E\u5F03\u8FFD\u51FB" }, ...matches.map((card) => ({ value: card.uid, label: `\u5F03\u7F6E\u3010${card.name}\u3011`, description: card.description }))],
            aiChoice: matches[0].uid,
            onResolve: (value) => {
              if (value === "pass") return;
              const paid = source.hand.find((card) => card.uid === value && card.type === shown.type);
              if (!paid) return;
              this.removeCard(sourceId, paid.uid);
              this.dealDamage(sourceId, targetId, 1, "strategy");
            }
          });
        }
      });
    }
    resolveEnergyCollapse(sourceId, targetId) {
      const target = this.player(targetId);
      if (!target?.alive) return { ok: true };
      if (target.energy < 2) {
        this.dealDamage(sourceId, targetId, 1, "strategy");
        return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard) };
      }
      const signature = this.characterOf(target)?.signature;
      const preserveEnergy = target.hp > 1 && target.signatureLocked <= 0 && target.energy >= Math.max(2, (signature?.cost || 4) - 1);
      return this.requestChoice(targetId, {
        title: "\u80FD\u91CF\u5D29\u89E3",
        text: "\u6D88\u80172\u70B9\u80FD\u91CF\u514D\u9664\u4F24\u5BB3\uFF0C\u6216\u4FDD\u7559\u80FD\u91CF\u5E76\u53D7\u52301\u70B9\u7B56\u7565\u4F24\u5BB3\u3002",
        options: [{ value: "energy", label: "\u6D88\u80172\u70B9\u80FD\u91CF" }, { value: "damage", label: "\u627F\u53D71\u70B9\u4F24\u5BB3" }],
        aiChoice: preserveEnergy ? "damage" : "energy",
        onResolve: (value) => {
          if (value === "energy") {
            target.energy = Math.max(0, target.energy - 2);
            this.log("event", `${this.nameOf(target)}\u6D88\u80172\u70B9\u80FD\u91CF\u62B5\u6D88\u4E86\u3010\u80FD\u91CF\u5D29\u89E3\u3011`);
          } else this.dealDamage(sourceId, targetId, 1, "strategy");
        }
      });
    }
    offerCounter(sourceId, targetId, card, onResolve, { hidden = false, onCounter = null } = {}) {
      const target = this.player(targetId);
      const counter = target?.hand.find((item) => item.id === "counter");
      if (!counter || targetId === sourceId) {
        onResolve();
        return { ok: true };
      }
      if (target.human) {
        this.pendingResponse = { type: "counter", sourceId, targetId, cardName: hidden ? "\u672A\u77E5\u4F0F\u7B14" : card.name, required: 1, onDecline: onResolve, onCounter, hidden, strategyCard: card };
        return { ok: true, pending: true };
      }
      const shouldCounter = hidden ? this.random() < 0.42 : !this.isAlly(sourceId, targetId) && this.random() < 0.72;
      if (shouldCounter) {
        this.removeCard(targetId, counter.uid);
        if (card.strategyKind === "plot") this.discard.push(card._physicalCard || card);
        this.log("event", `${this.nameOf(target)}\u6253\u51FA\u3010\u53CD\u5236\u3011\uFF0C${hidden ? "\u4F0F\u7B14\u5E03\u7F6E" : "\u7B56\u7565\u724C"}\u65E0\u6548`);
        this.notifyCardCancelled(sourceId, "\u7B56\u7565\u724C\u88AB\u53CD\u5236");
        if (onCounter) onCounter();
        return { ok: true, countered: true };
      }
      onResolve();
      return { ok: true };
    }
    offerStrategyIntervention(sourceId, targetId, card, onTarget) {
      const source = this.player(sourceId);
      if (source?.turnFlags.copyNoIntervene) {
        source.turnFlags.copyNoIntervene = false;
        onTarget(targetId);
        return { ok: true, unredirectable: true };
      }
      if (!card.redirectable) {
        onTarget(targetId);
        return { ok: true };
      }
      const eligible = this.players.filter((player) => player.alive && player.id !== sourceId && player.id !== targetId && player.hand.some((item) => item.id === "intervene") && (card.id !== "mind_burn" || player.hand.length > 1));
      const candidate = eligible.find((player) => player.human) || eligible.find((player) => this.isAlly(player.id, targetId) && !this.isAlly(player.id, sourceId));
      if (!candidate) {
        onTarget(targetId);
        return { ok: true };
      }
      const decide = (use) => {
        if (!use) return onTarget(targetId);
        const responseCard = candidate.hand.find((item) => item.id === "intervene");
        if (responseCard) this.removeCard(candidate.id, responseCard.uid);
        this.log("event", `${this.nameOf(candidate)}\u4EE5\u3010\u5F3A\u5236\u4ECB\u5165\u3011\u63A5\u7BA1\u4E86\u3010${card.name}\u3011\u7684\u76EE\u6807`);
        onTarget(candidate.id);
        if (candidate.alive) this.draw(candidate.id, 1);
      };
      if (candidate.human) {
        this.pendingResponse = { type: "interveneStrategy", sourceId, targetId: candidate.id, originalTargetId: targetId, cardName: card.name, required: 1, onDecision: decide };
        return { ok: true, pending: true };
      }
      decide(true);
      return { ok: true };
    }
    triggerRhythmBreak(plot, playerId, cardUid, targetId) {
      if (this.consumeByakugo(playerId, "strategy", "\u89E3\u9664\u4E86\u3010\u8282\u594F\u65AD\u70B9\u3011")) {
        this.removePlot(plot);
        return this.playCard(playerId, cardUid, targetId, { skipRhythm: true });
      }
      this.removePlot(plot);
      const player = this.player(playerId);
      const payable = player.hand.filter((card) => card.uid !== cardUid);
      const finishPlay = () => this.playCard(playerId, cardUid, targetId, { skipRhythm: true });
      if (!payable.length) {
        this.log("event", `${this.nameOf(player)}\u88AB\u3010\u8282\u594F\u65AD\u70B9\u3011\u4E2D\u65AD\u4E86\u51FA\u724C\u9636\u6BB5`);
        this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u8282\u594F\u65AD\u70B9\u53D6\u6D88");
        return this.forceEndPlayPhase(playerId);
      }
      return this.requestChoice(playerId, {
        title: "\u8282\u594F\u65AD\u70B9\u89E6\u53D1",
        text: "\u5F03\u7F6E\u53E61\u5F20\u624B\u724C\u4EE4\u5F53\u524D\u724C\u7EE7\u7EED\uFF0C\u6216\u53D6\u6D88\u5F53\u524D\u724C\u5E76\u7ED3\u675F\u51FA\u724C\u9636\u6BB5\u3002",
        options: [{ value: "pay", label: "\u5F03\u724C\u7EE7\u7EED" }, { value: "stop", label: "\u505C\u6B62\u51FA\u724C" }],
        aiChoice: player.hand.length > 2 ? "pay" : "stop",
        onResolve: (value) => {
          if (value === "pay") this.requestDiscard(playerId, 1, { reason: "\u8282\u594F\u65AD\u70B9\uFF1A\u8BF7\u5F03\u7F6E\u5F53\u524D\u5F85\u4F7F\u7528\u724C\u4E4B\u5916\u76841\u5F20\u724C", allowedUids: payable.map((card) => card.uid), onComplete: finishPlay });
          else {
            this.notifyCardCancelled(playerId, "\u51FA\u724C\u88AB\u8282\u594F\u65AD\u70B9\u53D6\u6D88");
            this.forceEndPlayPhase(playerId);
          }
        }
      });
    }
    forceEndPlayPhase(playerId) {
      const player = this.player(playerId);
      if (!player?.alive) return { ok: true };
      player.turnFlags.forcedEnd = true;
      this.phase = "play";
      this.endTurn(playerId);
      return { ok: true, cancelled: true };
    }
    beginPlot(sourceId, targetId, card) {
      const owner = this.player(sourceId);
      if (owner.plots.some((plot) => plot.effect === card.effect)) {
        owner.hand.push(card);
        return { ok: false, reason: "\u5DF2\u6709\u540C\u540D\u4F0F\u7B14" };
      }
      const place = () => {
        owner.plots.push({ uid: `plot-${card.uid}`, card, ownerId: sourceId, targetId, effect: card.effect, setTurn: this.turnNumber, expiresTurn: this.turnNumber + Math.max(1, this.players.filter((player) => player.alive).length), damaged: false, armed: false });
        this.log("event", `${this.nameOf(owner)}\u5E03\u7F6E\u4E861\u5F20\u4F0F\u7B14\uFF0C\u76EE\u6807\u4E3A${this.nameOf(targetId)}`);
      };
      return this.ensurePlotSlot(sourceId, () => {
        if (targetId !== sourceId) return this.offerCounter(sourceId, targetId, card, place, { hidden: true });
        place();
        return { ok: true };
      });
    }
    beginFalsePlot(sourceId, targetId, cardUid) {
      const owner = this.player(sourceId);
      if (!owner) return { ok: false, reason: "\u89D2\u8272\u4E0D\u5B58\u5728" };
      const index = owner.hand.findIndex((card2) => card2.uid === cardUid && card2.strategyKind !== "plot");
      if (index < 0) return { ok: false, reason: "\u4F2A\u88C5\u724C\u65E0\u6548" };
      const [card] = owner.hand.splice(index, 1);
      const proxy = { ...card, name: "\u5E7B\u8C61", strategyKind: "plot", hidden: true, _physicalCard: card };
      const place = () => {
        owner.plots.push({ uid: `false-${card.uid}`, card, ownerId: sourceId, targetId, effect: "falsePlot", isFalse: true, setTurn: this.turnNumber, expiresTurn: this.turnNumber + Math.max(1, this.players.filter((player) => player.alive).length) });
        this.log("event", `${this.nameOf(owner)}\u5E03\u7F6E\u4E861\u5F20\u672A\u77E5\u4F0F\u7B14\uFF0C\u76EE\u6807\u4E3A${this.nameOf(targetId)}`);
      };
      return this.ensurePlotSlot(sourceId, () => this.offerCounter(sourceId, targetId, proxy, place, {
        hidden: true,
        onCounter: () => {
          this.gainEnergy(sourceId, 2);
          owner.turnFlags.nextAttackIgnoreArmor = true;
          owner.turnFlags.nextAttackBonus = true;
          this.log("event", `${this.nameOf(owner)}\u7684\u5E7B\u8C61\u9A97\u53D6\u53CD\u5236\uFF0C\u83B7\u5F972\u70B9\u80FD\u91CF\u5E76\u5F3A\u5316\u4E0B\u4E00\u6B21\u653B\u51FB`);
        }
      }));
    }
    ensurePlotSlot(ownerId, onReady) {
      const owner = this.player(ownerId);
      if (!owner?.alive) return { ok: false, reason: "\u89D2\u8272\u5DF2\u7ECF\u9000\u573A" };
      if (owner.plots.length < 2) return onReady();
      return this.requestChoice(ownerId, {
        title: "\u4F0F\u7B14\u533A\u5DF2\u6EE1\uFF1A\u9009\u62E9\u66FF\u6362",
        text: "\u88AB\u66FF\u6362\u7684\u4F0F\u7B14\u4F1A\u516C\u5F00\u5E76\u8FDB\u5165\u5F03\u724C\u5806\uFF1B\u65B0\u4F0F\u7B14\u968F\u540E\u7167\u5E38\u63A5\u53D7\u53CD\u5236\u3002",
        options: owner.plots.map((plot) => ({
          value: plot.uid,
          label: `\u66FF\u6362\u3010${plot.isFalse ? "\u5E7B\u8C61\xB7" : ""}${plot.card.name}\u3011`,
          description: `\u5F53\u524D\u76EE\u6807\uFF1A${this.nameOf(plot.targetId)}`
        })),
        aiChoice: owner.plots[0]?.uid,
        onResolve: (plotUid) => {
          const replaced = owner.plots.find((plot) => plot.uid === plotUid);
          if (!replaced) return;
          this.removePlot(replaced);
          this.log("event", `${this.nameOf(owner)}\u66FF\u6362\u4E86\u4E00\u4E2A\u4F0F\u7B14\u69FD\u4F4D`);
          onReady();
        }
      });
    }
    expirePlotsAtTurnStart(playerId, resume = null) {
      const owner = this.player(playerId);
      if (!owner) return false;
      const expiring = owner.plots.filter((plot) => plot.setTurn < this.turnNumber + 1);
      const delayed = expiring.find((plot) => plot.effect === "delayedCast");
      for (const plot of expiring.filter((item) => !item.isFalse && item.effect !== "delayedCast" && item.effect !== "echoScript")) {
        this.removePlot(plot);
        if (plot.effect === "causalMark" && this.player(plot.targetId)?.alive) {
          this.draw(plot.targetId, 1);
          this.log("event", `\u3010\u56E0\u679C\u6807\u8BB0\u3011\u672A\u89E6\u53D1\uFF0C${this.nameOf(plot.targetId)}\u64781\u5F20\u724C`);
        }
      }
      const echo = owner.plots.find((plot) => plot.effect === "echoScript");
      if (echo && echo.setTurn < this.turnNumber + 1) echo.armed = true;
      if (!delayed) return false;
      this.removePlot(delayed);
      const resolveDelayed = (choice) => {
        if (!delayed.damaged || choice === "draw") this.draw(playerId, 2);
        if (!delayed.damaged || choice === "energy") this.gainEnergy(playerId, 2);
      };
      if (!delayed.damaged) {
        resolveDelayed("both");
        return false;
      }
      this.requestChoice(playerId, {
        title: "\u5EF6\u8FDF\u548F\u5531",
        text: "\u4F60\u5728\u4F0F\u7B14\u671F\u95F4\u53D7\u8FC7\u4F24\uFF0C\u8BF7\u9009\u62E9\u4E00\u9879\u6548\u679C\u3002",
        options: [{ value: "draw", label: "\u64782\u5F20\u724C" }, { value: "energy", label: "\u83B72\u70B9\u80FD\u91CF" }],
        aiChoice: owner.energy <= 2 ? "energy" : "draw",
        onResolve: (choice) => {
          resolveDelayed(choice);
          if (owner.human && resume) resume();
        }
      });
      return Boolean(this.pendingChoice);
    }
    expireEchoAtTurnEnd(playerId) {
      const owner = this.player(playerId);
      const echo = owner?.plots.find((plot) => plot.effect === "echoScript" && plot.armed);
      if (echo) this.removePlot(echo);
    }
    chooseHandCard(playerId, { title, excludeUid = null, onResolve }) {
      const player = this.player(playerId);
      const cards = player.hand.filter((card) => card.uid !== excludeUid);
      return this.requestChoice(playerId, {
        title,
        text: "\u5BF9\u65B9\u5728\u4F60\u786E\u8BA4\u524D\u4E0D\u4F1A\u770B\u5230\u8FD9\u5F20\u724C\u3002",
        options: cards.map((card) => ({ value: card.uid, label: `\u3010${card.name}\u3011`, description: card.description })),
        aiChoice: cards[0]?.uid,
        onResolve
      });
    }
    resolveMemoryExchange(sourceId, targetId) {
      let sourceUid = null;
      return this.chooseHandCard(sourceId, {
        title: "\u8BB0\u5FC6\u4EA4\u6362\uFF1A\u9009\u62E9\u4F60\u7684\u724C",
        onResolve: (uid) => {
          sourceUid = uid;
          this.chooseHandCard(targetId, {
            title: "\u8BB0\u5FC6\u4EA4\u6362\uFF1A\u9009\u62E9\u4F60\u7684\u724C",
            onResolve: (targetUid) => {
              const source = this.player(sourceId), target = this.player(targetId);
              const si = source.hand.findIndex((card) => card.uid === sourceUid), ti = target.hand.findIndex((card) => card.uid === targetUid);
              if (si < 0 || ti < 0) return;
              const [a] = source.hand.splice(si, 1), [b] = target.hand.splice(ti, 1);
              source.hand.push(b);
              target.hand.push(a);
              this.log("event", `${this.nameOf(source)}\u4E0E${this.nameOf(target)}\u5B8C\u6210\u4E86\u8BB0\u5FC6\u4EA4\u6362`);
            }
          });
        }
      });
    }
    resolveEquipmentShiftSetup(sourceId, firstId, card) {
      const first = this.player(firstId);
      const candidates = this.players.filter((player) => player.alive && player.id !== firstId && ["weapon", "armor", "charm"].some((slot) => first.equipment[slot] || player.equipment[slot]));
      return this.requestChoice(sourceId, {
        title: "\u88C5\u5907\u8F6C\u79FB\uFF1A\u9009\u62E9\u7B2C\u4E8C\u540D\u89D2\u8272",
        options: candidates.map((player) => ({ value: player.id, label: this.nameOf(player) })),
        aiChoice: candidates[0]?.id,
        onResolve: (secondId) => {
          const second = this.player(secondId);
          const slots = ["weapon", "armor", "charm"].filter((slot) => first.equipment[slot] || second.equipment[slot]);
          this.requestChoice(sourceId, {
            title: "\u88C5\u5907\u8F6C\u79FB\uFF1A\u9009\u62E9\u69FD\u4F4D",
            options: slots.map((slot) => ({ value: slot, label: { weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot] })),
            aiChoice: slots[0],
            onResolve: (slot) => this.offerCountersSequential(sourceId, [firstId, secondId], card, () => {
              const protectedId = [firstId, secondId].find((id) => this.player(id)?.equipment[slot] && this.consumeByakugo(id, "equipment", `\u963B\u6B62\u4E86${{ weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot]}\u8F6C\u79FB`));
              if (protectedId) return;
              const firstEquip = first.equipment[slot], secondEquip = second.equipment[slot];
              this.moveEquipment(first.id, slot, secondEquip, sourceId);
              this.moveEquipment(second.id, slot, firstEquip, sourceId);
              this.log("event", `${this.nameOf(first)}\u4E0E${this.nameOf(second)}\u4EA4\u6362\u4E86${{ weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot]}`);
            })
          });
        }
      });
    }
    offerCountersSequential(sourceId, targetIds, card, onResolve, index = 0) {
      const ids = [...new Set(targetIds)].filter((id) => id !== sourceId);
      if (index >= ids.length) {
        onResolve();
        return { ok: true };
      }
      return this.offerCounter(sourceId, ids[index], card, () => this.offerCountersSequential(sourceId, ids, card, onResolve, index + 1));
    }
    resolveTacticalRelay(sourceId, targetId) {
      const basics = this.player(sourceId).hand.filter((card) => card.type === "basic");
      return this.requestChoice(sourceId, {
        title: "\u6218\u672F\u63A5\u529B\uFF1A\u9009\u62E9\u4EA4\u4ED8\u7684\u57FA\u7840\u724C",
        options: basics.map((card) => ({ value: card.uid, label: `\u3010${card.name}\u3011`, description: card.description })),
        aiChoice: basics[0]?.uid,
        onResolve: (uid) => {
          const source = this.player(sourceId), target = this.player(targetId);
          const index = source.hand.findIndex((card) => card.uid === uid);
          if (index < 0) return;
          const [given] = source.hand.splice(index, 1);
          target.hand.push(given);
          const uses = this.relayUseOptions(targetId, given);
          this.requestChoice(targetId, {
            title: "\u6218\u672F\u63A5\u529B",
            text: `\u4F60\u83B7\u5F97\u4E86\u3010${given.name}\u3011\uFF0C\u53EF\u7ACB\u5373\u4F7F\u7528\u6216\u4FDD\u7559\u3002`,
            options: [{ value: "keep", label: "\u4FDD\u7559\u624B\u724C" }, ...uses],
            aiChoice: uses[0]?.value || "keep",
            onResolve: (value) => {
              if (value === "keep") return;
              const [, selectedTarget] = value.split(":");
              const result = this.playCard(targetId, given.uid, selectedTarget, { freeUse: true, skipRhythm: true });
              if (result.ok !== false) {
                this.gainEnergy(sourceId, 1);
                this.gainEnergy(targetId, 1);
              }
            }
          });
        }
      });
    }
    relayUseOptions(playerId, card) {
      if (card.responseOnly) return [];
      const targets = this.getCardTargets(playerId, card);
      return targets.map((targetId) => ({ value: `use:${targetId}`, label: `\u7ACB\u5373\u4F7F\u7528 \u2192 ${this.nameOf(targetId)}` }));
    }
    resolveEnergyAuction(sourceId) {
      const alive = this.players.filter((player) => player.alive);
      const bids = /* @__PURE__ */ new Map();
      for (const player of alive.filter((item) => !item.human)) bids.set(player.id, Math.min(player.energy, player.energy >= 4 ? 2 : player.energy >= 2 ? 1 : 0));
      const human = alive.find((player) => player.human);
      const finish = () => {
        for (const player of alive) {
          const bid = bids.get(player.id) || 0;
          player.energy -= bid;
          this.log("event", `${this.nameOf(player)}\u5728\u80FD\u91CF\u7ADE\u9010\u4E2D\u6295\u5165${bid}\u70B9\u80FD\u91CF`);
        }
        const highest = Math.max(...bids.values(), 0);
        if (highest === 0) return void this.draw(sourceId, 1);
        const winners = alive.filter((player) => bids.get(player.id) === highest);
        if (winners.length === 1) this.draw(winners[0].id, 3);
        else for (const winner of winners) this.draw(winner.id, 1);
        if (winners.length === 1) this.requestDiscard(winners[0].id, 1, { reason: "\u80FD\u91CF\u7ADE\u9010\u80DC\u8005\uFF1A\u64783\u5F20\u540E\u8BF7\u5F03\u7F6E1\u5F20" });
      };
      if (!human) {
        finish();
        return { ok: true };
      }
      const options = [0, 1, 2].filter((value) => value <= human.energy).map((value) => ({ value: String(value), label: `\u6295\u5165 ${value} \u70B9\u80FD\u91CF` }));
      return this.requestChoice(human.id, { title: "\u80FD\u91CF\u7ADE\u9010", text: "\u5176\u4ED6\u89D2\u8272\u5DF2\u79D8\u5BC6\u51B3\u5B9A\u6295\u5165\uFF0C\u786E\u8BA4\u540E\u540C\u65F6\u516C\u5F00\u3002", options, onResolve: (value) => {
        bids.set(human.id, Number(value));
        finish();
      } });
    }
    resolveInitiativeSwapSetup(sourceId, firstId, card) {
      const candidates = this.turnQueue.filter((id) => id !== firstId && this.player(id)?.alive);
      return this.requestChoice(sourceId, {
        title: "\u65F6\u5E8F\u6539\u5199\uFF1A\u9009\u62E9\u7B2C\u4E8C\u540D\u89D2\u8272",
        options: candidates.map((id) => ({ value: id, label: this.nameOf(id) })),
        aiChoice: candidates.at(-1),
        onResolve: (secondId) => this.offerCountersSequential(sourceId, [firstId, secondId], card, () => {
          const a = this.turnQueue.indexOf(firstId), b = this.turnQueue.indexOf(secondId);
          if (a >= 0 && b >= 0) [this.turnQueue[a], this.turnQueue[b]] = [this.turnQueue[b], this.turnQueue[a]];
          this.log("event", `${this.nameOf(firstId)}\u4E0E${this.nameOf(secondId)}\u7684\u884C\u52A8\u65F6\u5E8F\u88AB\u6539\u5199`);
        })
      });
    }
    resolveLimitContract(sourceId, targetId) {
      const target = this.player(targetId);
      return this.requestChoice(targetId, {
        title: "\u6781\u9650\u5951\u7EA6",
        text: `${this.nameOf(sourceId)}\u5411\u4F60\u63D0\u4F9B\u4E24\u79CD\u5951\u7EA6\u3002`,
        options: [
          { value: "burst", label: "\u7206\u53D1\uFF1A\u83B72\u80FD\u91CF", description: "\u5951\u7EA6\u8005\u64781\uFF1B\u4F60\u4E0B\u56DE\u5408\u7ED3\u675F\u59311\u4F53\u529B" },
          { value: "seal", label: "\u5C01\u5B58\uFF1A\u64782\u5F20\u724C", description: "\u5951\u7EA6\u8005\u83B71\u80FD\u91CF\uFF1B\u4F60\u7684\u62DB\u724C\u6280\u9501\u5B9A\u81F3\u4E0B\u56DE\u5408\u7ED3\u675F" }
        ],
        aiChoice: target.energy <= 1 ? "burst" : "seal",
        onResolve: (value) => {
          if (value === "burst") {
            this.gainEnergy(targetId, 2);
            this.draw(sourceId, 1);
            target.contractHpLoss += 1;
          } else {
            this.draw(targetId, 2);
            this.gainEnergy(sourceId, 1);
            target.signatureLocked = Math.max(target.signatureLocked, 1);
          }
        }
      });
    }
    beginAttack({ sourceId, targetId, damage = 1, requiredGuards = 1, origin = "attack", alwaysPoison = false, onComplete = null, skipIntervene = false, skipRaven = false, freeUse = false }) {
      const source = this.player(sourceId), target = this.player(targetId);
      if (!source?.alive || !target?.alive) return { ok: false, reason: "\u76EE\u6807\u5DF2\u7ECF\u9000\u573A" };
      if (target.characterId === "luffy" && !target.roundFlags.observation) {
        target.roundFlags.observation = true;
        const omen = this.takeTop();
        if (omen) {
          if (omen.type === "basic") this.discard.push(omen);
          else this.deck.push(omen);
          this.log("event", `${this.nameOf(target)}\u53D1\u52A8\u201C\u89C1\u95FB\u8272\u201D\uFF0C${omen.type === "basic" ? "\u5C06\u724C\u5806\u9876\u57FA\u7840\u724C\u89C6\u4E3A\u9632\u5FA1\u5F03\u7F6E" : `\u5C06\u3010${omen.name}\u3011\u7F6E\u4E8E\u724C\u5806\u5E95`}`);
        }
      }
      if (!skipRaven) {
        const raven = this.offerRavenSubstitution({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete, skipIntervene, freeUse });
        if (raven) return raven;
      }
      if (!skipIntervene) {
        const intervention = this.offerAttackIntervention({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete, freeUse });
        if (intervention) return intervention;
      }
      if (source.characterId === "itachi" && origin === "attack" && source.plots.some((plot) => plot.isFalse && plot.targetId === targetId)) {
        requiredGuards += 1;
        this.log("event", `${this.nameOf(source)}\u4EE5\u201C\u6708\u8BFB\u524D\u5146\u201D\u538B\u8FEB\u5E7B\u8C61\u76EE\u6807\uFF0C\u6B64\u6B21\u653B\u51FB\u989D\u5916\u9700\u89811\u5F20\u9632\u5FA1`);
      }
      if (source.characterId === "shikamaru" && origin === "attack" && source.turnFlags.shadowNeckTarget === targetId) {
        source.turnFlags.shadowNeckTarget = null;
        damage += 1;
        this.log("event", `${this.nameOf(source)}\u6293\u4F4F\u201C\u6218\u672F\u9884\u8BFB\u201D\u7684\u7834\u7EFD\uFF0C\u6B64\u6B21\u653B\u51FB\u4F24\u5BB3+1`);
      }
      if (source.characterId === "gaara" && origin === "attack" && target.sandMarkedBy === sourceId) {
        target.sandMarkedBy = null;
        target.sandMarkSetTurn = 0;
        damage += 1;
        this.log("event", `${this.nameOf(source)}\u53D1\u52A8\u201C\u7802\u7011\u8FFD\u846C\u201D\uFF0C\u6B64\u6B21\u653B\u51FB\u4F24\u5BB3+1`);
      }
      if (source.characterId === "jiraiya" && origin === "attack" && source.sageResonance) {
        source.sageResonance = false;
        source.turnFlags.ignoreArmorTarget = targetId;
        damage += 1;
        const priorComplete = onComplete;
        onComplete = () => {
          source.sageMarks = 0;
          if (priorComplete) priorComplete();
        };
        this.log("event", `${this.nameOf(source)}\u6D88\u8017\u201C\u4ED9\u672F\u5171\u9E23\u201D\uFF0C\u6B64\u6B21\u653B\u51FB\u4F24\u5BB3+1\u5E76\u5FFD\u7565\u9632\u62A4\u88C5\u7532`);
      }
      if (source.characterId === "sasuke" && origin === "attack" && source.swapMarkedId === targetId) {
        source.swapMarkedId = null;
        source.turnFlags.ignoreArmorTarget = targetId;
        source.turnFlags.pursuitTarget = targetId;
        requiredGuards += 1;
        this.log("event", `${this.nameOf(source)}\u53D1\u52A8\u201C\u5199\u8F6E\u773C\u8FFD\u730E\u201D\uFF0C\u7A81\u51FB\u9700\u8981\u989D\u5916\u9632\u5FA1\u5E76\u5FFD\u7565\u9632\u62A4\u88C5\u7532`);
      }
      if (source.turnFlags.nextAttackRequiredGuard) {
        requiredGuards += source.turnFlags.nextAttackRequiredGuard;
        source.turnFlags.nextAttackRequiredGuard = 0;
      }
      if (source.turnFlags.nextAttackIgnoreArmor) {
        source.turnFlags.nextAttackIgnoreArmor = false;
        source.turnFlags.ignoreArmorTarget = targetId;
        this.log("event", `${this.nameOf(source)}\u7684\u84C4\u52BF\u4EE4\u4E0B\u4E00\u6B21\u653B\u51FB\u5FFD\u7565\u9632\u62A4\u88C5\u7532`);
      }
      if (source.turnFlags.nextAttackBonus) {
        damage += 1;
        source.turnFlags.nextAttackBonus = false;
      }
      if (source.turnFlags.nextAttackPoison) {
        alwaysPoison = true;
        source.turnFlags.nextAttackPoison = false;
      }
      const returnPlot = origin === "attack" ? this.plotsTargeting(targetId, "returnRoute")[0] : null;
      if (returnPlot) {
        this.removePlot(returnPlot);
        const prior = onComplete;
        onComplete = () => {
          if (prior) prior();
          this.resolveReturnRoute(targetId, sourceId);
        };
      }
      if (target.characterId === "gojo" && !target.roundFlags.infinity) {
        target.roundFlags.infinity = true;
        if (source.hand.length) {
          return this.requestDiscard(sourceId, 1, {
            reason: "\u7A81\u7834\u65E0\u4E0B\u9650\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u989D\u5916\u5F03\u7F6E",
            onComplete: () => {
              this.log("event", `${this.nameOf(source)}\u989D\u5916\u5F031\u5F20\u724C\u7A81\u7834\u201C\u65E0\u4E0B\u9650\u201D`);
              this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete });
            }
          });
        } else {
          this.log("event", `${this.nameOf(target)}\u7684\u201C\u65E0\u4E0B\u9650\u201D\u4EE4\u653B\u51FB\u65E0\u6548`);
          return this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
        }
      }
      return this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete });
    }
    offerRavenSubstitution(payload) {
      const { sourceId, targetId, origin } = payload;
      const target = this.player(targetId);
      if (origin !== "attack" || target?.characterId !== "itachi" || target.roundFlags.raven) return null;
      const illusion = target.plots.find((plot) => plot.isFalse && plot.targetId === sourceId) || target.plots.find((plot) => plot.isFalse);
      if (!illusion) return null;
      const candidates = this.players.filter((player) => player.alive && player.id !== sourceId && player.id !== targetId && this.distance(sourceId, player.id) <= this.attackRange(sourceId));
      const perform = (selectedId) => {
        if (!selectedId || selectedId === "pass") return this.beginAttack({ ...payload, skipRaven: true });
        target.roundFlags.raven = true;
        this.removePlot(illusion);
        this.draw(targetId, 1);
        if (selectedId === "cancel") {
          this.log("event", `${this.nameOf(target)}\u53D1\u52A8\u201C\u4E4C\u9E26\u66FF\u8EAB\u201D\uFF0C\u5316\u4F5C\u4E4C\u9E26\u907F\u5F00\u4E86\u6B64\u6B21\u7A81\u51FB`);
          return this.afterDefended(sourceId, targetId, origin, payload.alwaysPoison, payload.onComplete);
        }
        this.log("event", `${this.nameOf(target)}\u53D1\u52A8\u201C\u4E4C\u9E26\u66FF\u8EAB\u201D\uFF0C\u5C06\u7A81\u51FB\u8F6C\u79FB\u7ED9${this.nameOf(selectedId)}`);
        return this.beginAttack({ ...payload, targetId: selectedId, skipRaven: true });
      };
      if (target.human) {
        const ravenOptions = candidates.length ? candidates.map((player) => ({ value: player.id, label: `\u8F6C\u79FB\u7ED9${this.nameOf(player)}` })) : [{ value: "cancel", label: "\u5316\u9E26\u907F\u5F00\u653B\u51FB" }];
        return this.requestChoice(targetId, {
          title: "\u4E4C\u9E26\u66FF\u8EAB",
          text: "\u53EF\u6D88\u8017\u4EFB\u4E00\u865A\u5047\u4F0F\u7B14\u8F6C\u79FB\u6B64\u6B21\u7A81\u51FB\uFF1B\u6CA1\u6709\u5408\u6CD5\u8F6C\u79FB\u76EE\u6807\u65F6\u76F4\u63A5\u907F\u5F00\u653B\u51FB\u3002",
          options: [{ value: "pass", label: "\u4FDD\u7559\u5E7B\u8C61" }, ...ravenOptions],
          aiChoice: "pass",
          onResolve: perform
        });
      }
      const enemy = candidates.find((player) => !this.isAlly(targetId, player.id));
      perform((enemy || candidates[0])?.id || "cancel");
      return { ok: true, pending: Boolean(this.pendingChoice || this.pendingResponse || this.pendingDiscard) };
    }
    continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete = null, skipAbsoluteDefense = false }) {
      const source = this.player(sourceId), target = this.player(targetId);
      if (!source?.alive || !target?.alive) return { ok: false, reason: "\u76EE\u6807\u5DF2\u7ECF\u9000\u573A" };
      if (target.characterId === "gaara" && origin === "attack" && !skipAbsoluteDefense && !target.roundFlags.sandShield && target.hand.length) {
        const useShield = () => this.requestDiscard(targetId, 1, {
          reason: "\u7EDD\u5BF9\u9632\u5FA1\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E\u4EE5\u53D6\u6D88\u653B\u51FB",
          onComplete: () => {
            target.roundFlags.sandShield = true;
            this.log("event", `${this.nameOf(target)}\u53D1\u52A8\u201C\u7EDD\u5BF9\u9632\u5FA1\u201D\u53D6\u6D88\u653B\u51FB`);
            this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
          }
        });
        if (target.human) {
          return this.requestChoice(targetId, {
            title: "\u7EDD\u5BF9\u9632\u5FA1",
            text: `\u662F\u5426\u5F03\u7F6E1\u5F20\u624B\u724C\u53D6\u6D88${this.nameOf(source)}\u7684\u6B64\u6B21\u653B\u51FB\uFF1F`,
            options: [{ value: "use", label: "\u53D1\u52A8\u7EDD\u5BF9\u9632\u5FA1" }, { value: "pass", label: "\u4FDD\u7559\u624B\u724C\uFF0C\u6B63\u5E38\u54CD\u5E94" }],
            aiChoice: "use",
            onResolve: (value) => value === "use" ? useShield() : this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete, skipAbsoluteDefense: true })
          });
        }
        return useShield();
      }
      const resources = this.guardResources(targetId);
      if (resources >= requiredGuards) {
        if (target.human) {
          this.pendingResponse = { type: "guard", sourceId, targetId, damage, required: requiredGuards, origin, alwaysPoison, onComplete };
          return { ok: true, pending: true };
        }
        this.spendGuards(targetId, requiredGuards);
        this.log("event", `${this.nameOf(target)}\u6253\u51FA${requiredGuards}\u5F20\u3010\u9632\u5FA1\u3011`);
        return this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
      }
      this.resolveAttackHit(sourceId, targetId, damage, origin, alwaysPoison, onComplete);
      return { ok: true };
    }
    offerAttackIntervention(payload) {
      const { sourceId, targetId, origin } = payload;
      if (!["attack", "signature", "goemon", "asura", "diableJambe", "impactWolf", "vagabondDrill", "arrowNotch", "blackFlash", "active"].includes(origin)) return null;
      const eligible = this.players.filter((player) => player.alive && player.id !== sourceId && player.id !== targetId && player.hand.some((card) => card.id === "intervene"));
      if (!eligible.length) return null;
      const candidate = eligible.find((player) => player.human) || eligible.find((player) => this.isAlly(player.id, targetId) && !this.isAlly(player.id, sourceId));
      if (!candidate) return null;
      const perform = (use) => {
        if (!use) return this.beginAttack({ ...payload, skipIntervene: true });
        const card = candidate.hand.find((item) => item.id === "intervene");
        if (card) this.removeCard(candidate.id, card.uid);
        this.log("event", `${this.nameOf(candidate)}\u6253\u51FA\u3010\u5F3A\u5236\u4ECB\u5165\u3011\uFF0C\u4EE3\u66FF${this.nameOf(targetId)}\u6210\u4E3A\u76EE\u6807`);
        const prior = payload.onComplete;
        this.beginAttack({ ...payload, targetId: candidate.id, skipIntervene: true, onComplete: () => {
          if (prior) prior();
          if (candidate.alive) this.draw(candidate.id, 1);
        } });
      };
      if (candidate.human) {
        this.pendingResponse = { type: "intervene", sourceId, targetId: candidate.id, originalTargetId: targetId, cardName: "\u5F3A\u5236\u4ECB\u5165", required: 1, onDecision: perform };
        return { ok: true, pending: true };
      }
      perform(true);
      return { ok: true, pending: Boolean(this.pendingResponse || this.pendingDiscard || this.pendingChoice) };
    }
    resolveReturnRoute(targetId, attackerId) {
      const target = this.player(targetId), attacker = this.player(attackerId);
      if (!target?.alive || !attacker?.alive) return;
      const attacks = target.hand.filter((card) => card.id === "attack" || card.id === "adapt");
      if (!attacks.length) return;
      this.requestChoice(targetId, {
        title: "\u56DE\u51FB\u8F68\u8FF9",
        text: `\u662F\u5426\u5BF9${this.nameOf(attacker)}\u7ACB\u5373\u53CD\u51FB\uFF1F`,
        options: [{ value: "pass", label: "\u653E\u5F03\u53CD\u51FB" }, ...attacks.map((card) => ({ value: card.uid, label: `\u6253\u51FA\u3010${card.name}\u3011` }))],
        aiChoice: attacks[0].uid,
        onResolve: (uid) => {
          if (uid === "pass") return;
          const card = target.hand.find((item) => item.uid === uid);
          if (!card) return;
          this.playCard(targetId, uid, attackerId, { freeUse: true, skipRhythm: true });
        }
      });
    }
    guardResources(playerId) {
      const player = this.player(playerId);
      const guards = player.hand.filter((card) => card.id === "guard" || card.id === "adapt").length;
      const armorSubstitute = player.equipment.armor?.id === "adaptive_armor" && !player.roundFlags.adaptiveGuard && player.hand.some((card) => card.type === "basic" && !["guard", "adapt"].includes(card.id));
      const canSubstitute = player.characterId === "mikasa" && !player.roundFlags.substitute && player.hand.some((card) => card.id !== "guard");
      const clone = player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length ? 1 : 0;
      return guards + (armorSubstitute ? 1 : 0) + (canSubstitute ? 1 : 0) + clone;
    }
    spendGuards(playerId, count) {
      const player = this.player(playerId);
      let left = count;
      while (left > 0) {
        const guard = player.hand.find((card) => card.id === "guard");
        if (guard) {
          this.removeCard(playerId, guard.uid);
          left -= 1;
          continue;
        }
        const adapt = player.hand.find((card) => card.id === "adapt");
        if (adapt) {
          this.removeCard(playerId, adapt.uid);
          left -= 1;
          continue;
        }
        if (player.equipment.armor?.id === "adaptive_armor" && !player.roundFlags.adaptiveGuard) {
          const substitute = player.hand.find((card) => card.type === "basic" && !["guard", "adapt"].includes(card.id));
          if (substitute) {
            this.removeCard(playerId, substitute.uid);
            player.roundFlags.adaptiveGuard = true;
            left -= 1;
            continue;
          }
        }
        if (player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length) {
          const stored = this.consumeSpecialCard(playerId, "clone");
          if (stored) {
            this.gainEnergy(playerId, 1);
            player.turnFlags.nextAttackBonus = true;
            this.log("event", `${this.nameOf(player)}\u6D88\u8017\u5F71\u5206\u8EAB\uFF0C\u5C06\u3010${stored.card.name}\u3011\u89C6\u4E3A\u9632\u5FA1`);
            left -= 1;
            continue;
          }
        }
        if (player.characterId === "mikasa" && !player.roundFlags.substitute) {
          const substitute = player.hand.find((card) => card.id !== "guard");
          if (substitute) {
            this.removeCard(playerId, substitute.uid);
            player.roundFlags.substitute = true;
            left -= 1;
            continue;
          }
        }
        break;
      }
    }
    respond(useCard) {
      const response = this.pendingResponse;
      if (!response) return false;
      this.pendingResponse = null;
      if (response.type === "guard") {
        if (useCard && this.guardResources(response.targetId) >= response.required) {
          this.spendGuards(response.targetId, response.required);
          this.log("event", `${this.nameOf(response.targetId)}\u6210\u529F\u9632\u5FA1`);
          this.afterDefended(response.sourceId, response.targetId, response.origin, response.alwaysPoison, response.onComplete);
        } else this.resolveAttackHit(response.sourceId, response.targetId, response.damage, response.origin, response.alwaysPoison, response.onComplete);
      } else if (response.type === "counter") {
        if (useCard) {
          const card = this.player(response.targetId).hand.find((item) => item.id === "counter");
          if (card) this.removeCard(response.targetId, card.uid);
          if (response.hidden && response.strategyCard) this.discard.push(response.strategyCard._physicalCard || response.strategyCard);
          this.log("event", `${this.nameOf(response.targetId)}\u6253\u51FA\u3010\u53CD\u5236\u3011\uFF0C\u7B56\u7565\u724C\u65E0\u6548`);
          this.notifyCardCancelled(response.sourceId, "\u7B56\u7565\u724C\u88AB\u53CD\u5236");
          if (response.onCounter) response.onCounter();
        } else if (response.onDecline) response.onDecline();
      } else if (["intervene", "interveneStrategy"].includes(response.type)) {
        if (response.onDecision) response.onDecision(useCard);
      }
      return true;
    }
    afterDefended(sourceId, targetId, origin, alwaysPoison = false, onComplete = null) {
      const source = this.player(sourceId);
      if (source?.turnFlags.ignoreArmorTarget === targetId) source.turnFlags.ignoreArmorTarget = null;
      if (source?.turnFlags.goemonIgnoreArmorTarget === targetId) source.turnFlags.goemonIgnoreArmorTarget = null;
      if (source?.characterId === "ichigo" && !source.turnFlags.resolve) {
        source.turnFlags.resolve = true;
        this.draw(sourceId, 1);
      }
      if (source?.characterId === "sasuke" && source.turnFlags.pursuitTarget === targetId) {
        source.turnFlags.pursuitTarget = null;
        this.draw(sourceId, 1);
        this.log("event", `${this.nameOf(source)}\u7684\u201C\u5343\u9E1F\u8D2F\u7A7F\u201D\u5373\u4F7F\u88AB\u9632\u5FA1\u4ECD\u8FFD\u56DE1\u5F20\u724C`);
      }
      if (source?.characterId === "zoro" && origin === "attack" && !source.roundFlags.zoroResolve) {
        source.roundFlags.zoroResolve = true;
        this.draw(sourceId, 1);
        this.log("event", `${this.nameOf(source)}\u7684\u5251\u58EB\u672C\u80FD\u5728\u653B\u51FB\u88AB\u5B8C\u5168\u9632\u5FA1\u540E\u64781\u5F20\u724C`);
      }
      const shikamaru = this.findChessOwner(sourceId);
      if (shikamaru) this.triggerTacticalForesight(shikamaru.id, sourceId, "\u68CB\u5B50\u653B\u51FB\u88AB\u9632\u5FA1");
      const finish = () => {
        if (origin === "blackFlash" && source) this.gainEnergy(sourceId, 2);
        if (alwaysPoison) this.applyPoison(targetId, origin === "venomStrike" ? 2 : 1);
        const target = this.player(targetId);
        const scoutedByHinata = this.players.some((owner) => owner.alive && owner.characterId === "hinata" && owner.scoutedTargetId === targetId);
        if (target?.equipment.armor?.id === "reflector" && !target.roundFlags.reflector && !scoutedByHinata) {
          target.roundFlags.reflector = true;
          this.draw(targetId, 1);
        }
        if (onComplete) onComplete();
      };
      if (source?.characterId === "tanjiro" && !source.turnFlags.water) {
        source.turnFlags.water = true;
        if (source.hand.length) return this.requestDiscard(sourceId, 1, { reason: "\u6C34\u4E4B\u547C\u5438\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E\u540E\u518D\u64781\u5F20\u724C", shouldLog: false, onComplete: () => {
          this.draw(sourceId, 1);
          finish();
        } });
        this.draw(sourceId, 1);
        finish();
        return { ok: true, defended: true };
      }
      finish();
      return { ok: true, defended: true };
    }
    resolveAttackHit(sourceId, targetId, damage, origin, alwaysPoison = false, onComplete = null) {
      const target = this.player(targetId);
      const source = this.player(sourceId);
      if (source?.turnFlags.pursuitTarget === targetId) source.turnFlags.pursuitTarget = null;
      const markedPierce = source?.turnFlags.ignoreArmorTarget === targetId;
      if (markedPierce) source.turnFlags.ignoreArmorTarget = null;
      const goemonPierce = source?.turnFlags.goemonIgnoreArmorTarget === targetId;
      if (goemonPierce) source.turnFlags.goemonIgnoreArmorTarget = null;
      const ignoresArmor = source?.equipment.weapon?.id === "piercer" && origin === "attack" || markedPierce || goemonPierce || source?.characterId === "hinata" && source.scoutedTargetId === targetId;
      if (!ignoresArmor && target.equipment.armor?.id === "armor" && target.armorReady) {
        target.armorReady = false;
        damage = Math.max(0, damage - 1);
        this.log("event", `${this.nameOf(target)}\u7684\u9632\u62A4\u88C5\u7532\u4EE4\u4F24\u5BB3-1`);
      }
      const damageResult = this.dealDamage(sourceId, targetId, damage, origin, onComplete);
      if (damageResult?.pending) return damageResult;
      if (alwaysPoison && target.alive) this.applyPoison(targetId, origin === "venomStrike" ? 1 : 1);
    }
    addSageMark(playerId, kind) {
      const player = this.player(playerId);
      if (!player?.alive || player.characterId !== "jiraiya") return;
      player.sageMarkRoundFlags ||= { dealt: false, taken: false };
      if (player.sageMarkRoundFlags[kind]) return;
      player.sageMarkRoundFlags[kind] = true;
      if (player.sageMarks >= 2) return;
      player.sageMarks += 1;
      this.log("event", `${this.nameOf(player)}\u83B7\u5F971\u679A\u201C\u4ED9\u672F\u5370\u201D\uFF08${player.sageMarks}/2\uFF09`);
      if (player.sageMarks >= 2 && !player.sageResonance) {
        player.sageResonance = true;
        this.log("event", `${this.nameOf(player)}\u8FDB\u5165\u201C\u4ED9\u672F\u5171\u9E23\u201D\uFF0C\u4E0B\u4E00\u6B21\u653B\u51FB\u5C06\u88AB\u5F3A\u5316`);
      }
    }
    dealDamage(sourceId, targetId, amount, origin = "damage", onComplete = null, options = {}) {
      const source = this.player(sourceId), target = this.player(targetId);
      if (!target?.alive || amount <= 0) {
        if (onComplete) onComplete();
        return;
      }
      const beforeEvent = { type: "beforeDamage", sourceId, targetId, amount, origin };
      this.emitOnePieceEvent(beforeEvent);
      amount = beforeEvent.amount;
      if (beforeEvent.optionalProtector && !options.skipOptionalDefense) {
        const protector = this.player(beforeEvent.optionalProtector);
        return this.requestChoice(protector.id, {
          title: "\u4FA0\u4E49",
          text: `\u662F\u5426\u5F03\u7F6E1\u5F20\u57FA\u7840\u724C\uFF0C\u4EE4${this.nameOf(target)}\u53D7\u5230\u7684\u4F24\u5BB3-1\uFF1F`,
          options: [{ value: "use", label: "\u53D1\u52A8\u4FA0\u4E49" }, { value: "pass", label: "\u6682\u4E0D\u53D1\u52A8" }],
          aiChoice: "pass",
          onResolve: (value) => {
            if (value === "use") {
              const basic = protector.hand.find((card) => card.type === "basic");
              if (basic) {
                this.removeCard(protector.id, basic.uid);
                protector.roundFlags.jinbeGuard = true;
                amount = Math.max(0, amount - 1);
                this.log("event", `${this.nameOf(protector)}\u53D1\u52A8\u201C\u4FA0\u4E49\u201D\u4FDD\u62A4${this.nameOf(target)}`);
              }
            }
            this.dealDamage(sourceId, targetId, amount, origin, onComplete, { skipOptionalDefense: true });
          }
        });
      }
      if (amount <= 0) {
        if (onComplete) onComplete();
        return;
      }
      if (target.equipment.armor?.id === "limit_shield" && amount >= 2) {
        amount = 1;
        this.discard.push(target.equipment.armor);
        target.equipment.armor = null;
        this.log("event", `${this.nameOf(target)}\u7684\u3010\u9650\u754C\u62A4\u76FE\u3011\u5C06\u4F24\u5BB3\u6539\u4E3A1\u70B9`);
      }
      const oaths = this.plotsTargeting(targetId, "guardianOath");
      for (const oath of oaths) {
        this.removePlot(oath);
        amount = Math.max(0, amount - 1);
      }
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, amount);
        target.shield -= absorbed;
        amount -= absorbed;
        this.log("event", `${this.nameOf(target)}\u7684\u62A4\u76FE\u62B5\u6D88\u4E86${absorbed}\u70B9\u4F24\u5BB3`);
      }
      if (amount > 0 && this.consumeByakugo(targetId, "basic", `\u4EE4${this.nameOf(target)}\u53D7\u5230\u7684\u4F24\u5BB3-1`)) amount = Math.max(0, amount - 1);
      if (amount > 0 && target.characterId === "orochimaru" && !target.roundFlags.shed) {
        const spoil = target.hand.find((card) => card._curseSpoil === targetId);
        if (spoil) {
          target.roundFlags.shed = true;
          target.curseResearchType = spoil.type;
          const index = target.hand.findIndex((card) => card.uid === spoil.uid);
          target.hand.splice(index, 1);
          delete spoil._curseSpoil;
          this.discard.push(spoil);
          amount = Math.max(0, amount - 1);
          this.log("event", `${this.nameOf(target)}\u6D88\u8017\u5B9E\u9A8C\u724C\u3010${spoil.name}\u3011\u5B8C\u6210\u86C7\u8715\uFF0C\u4F24\u5BB3-1`);
        }
      }
      if (amount <= 0) {
        if (onComplete) onComplete();
        return;
      }
      target.hp -= amount;
      this.telemetry.damage += amount;
      this.pushDamageFeedback(targetId, amount);
      for (const plot of target.plots.filter((item) => item.effect === "delayedCast")) plot.damaged = true;
      if (source && !source.roundFlags.damageEnergy) {
        source.roundFlags.damageEnergy = true;
        this.gainEnergy(sourceId, 1);
      }
      if (!target.roundFlags.hurtEnergy) {
        target.roundFlags.hurtEnergy = true;
        this.gainEnergy(targetId, 1);
      }
      this.addSageMark(sourceId, "dealt");
      this.addSageMark(targetId, "taken");
      this.log("damage", `${this.nameOf(sourceId)}\u5BF9${this.nameOf(target)}\u9020\u6210${amount}\u70B9\u4F24\u5BB3`);
      this.emitOnePieceEvent({ type: "afterDamage", sourceId, targetId, amount, origin });
      const causalPlots = source ? this.plotsTargeting(sourceId, "causalMark") : [];
      for (const causal of causalPlots) {
        this.removePlot(causal);
        this.draw(causal.ownerId, 2);
        this.gainEnergy(causal.ownerId, 1);
      }
      if (source?.characterId === "rukia" && origin === "attack") target.frozenDraw = 1;
      if (source?.characterId === "shinobu" && origin === "attack") this.applyPoison(targetId, 1);
      if (source?.characterId === "yuji" && origin === "attack" && !source.turnFlags.divergent) {
        source.turnFlags.divergent = true;
        if (target.hp > 0 && target.hand.length) return this.requestDiscard(targetId, 1, { reason: "\u53D7\u5230\u5F84\u5EAD\u62F3\u547D\u4E2D\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", shouldLog: false, onComplete: () => this.finishDamageResolution(sourceId, targetId, onComplete, origin) });
      }
      this.finishDamageResolution(sourceId, targetId, onComplete, origin);
    }
    finishDamageResolution(sourceId, targetId, onComplete = null, origin = "damage") {
      const source = this.player(sourceId), target = this.player(targetId);
      if (!target?.alive) return;
      if (target.characterId === "yuji" && target.hp <= 2 && !target.roundFlags.resolve) {
        target.roundFlags.resolve = true;
        this.draw(targetId, 2);
      }
      if (source) {
        const armin = this.players.find((p) => p.alive && p.characterId === "armin" && this.isAlly(p.id, targetId) && p.id !== targetId && !p.roundFlags.cover);
        if (armin) {
          armin.roundFlags.cover = true;
          this.draw(targetId, 1);
          this.log("event", `${this.nameOf(armin)}\u53D1\u52A8\u201C\u6218\u672F\u63A9\u62A4\u201D`);
        }
      }
      if (origin === "attack" && source?.equipment.weapon?.id === "impact_hammer" && !source.turnFlags.impact && target.hand.length) {
        source.turnFlags.impact = true;
        return this.requestDiscard(targetId, 1, { reason: "\u9707\u8361\u91CD\u9524\uFF1A\u8BF7\u5F03\u7F6E1\u5F20\u624B\u724C", onComplete: () => this.finishDamageResolution(sourceId, targetId, onComplete, origin) });
      }
      if (target.hp <= 0) return this.startDying(targetId, sourceId, onComplete, origin);
      if (onComplete) onComplete();
    }
    loseHp(targetId, amount, sourceId = null, origin = "loss", onComplete = null) {
      const target = this.player(targetId);
      if (!target?.alive) return;
      target.hp -= amount;
      this.pushDamageFeedback(targetId, amount);
      if (amount > 0) this.emitOnePieceEvent({ type: "afterHpLoss", sourceId: sourceId || targetId, targetId, amount, origin });
      if (target.hp <= 0) return this.startDying(targetId, sourceId, onComplete, origin);
      if (onComplete) onComplete();
    }
    startDying(targetId, sourceId = null, onComplete = null, origin = "damage") {
      const target = this.player(targetId);
      if (!target?.alive || target.dying) return;
      target.dying = true;
      this.log("event", `${this.nameOf(target)}\u8FDB\u5165\u91CD\u4F24\uFF0C\u7B49\u5F85\u6551\u63F4`);
      const rescue = this.emitOnePieceEvent({ type: "beforeDying", sourceId, targetId, origin });
      if (rescue?.rescued) {
        if (onComplete) onComplete();
        return rescue;
      }
      if (target.equipment.charm?.id === "life_pendant") {
        this.discard.push(target.equipment.charm);
        target.equipment.charm = null;
        this.refreshEnergyCap(target);
        target.hp = 1;
        target.dying = false;
        this.log("heal", `${this.nameOf(target)}\u7684\u3010\u751F\u547D\u540A\u5760\u3011\u5C06\u5176\u6551\u56DE\u81F31\u70B9\u4F53\u529B`);
        if (onComplete) onComplete();
        return { ok: true, rescued: true };
      }
      const alive = this.players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat);
      const start = alive.findIndex((player) => player.id === targetId);
      const order = [...alive.slice(start), ...alive.slice(0, start)].map((player) => player.id);
      return this.continueRescue({ targetId, sourceId, onComplete, order, index: 0 });
    }
    continueRescue(state) {
      const target = this.player(state.targetId);
      if (!target?.alive) return;
      if (target.hp > 0) {
        target.dying = false;
        this.log("heal", `${this.nameOf(target)}\u8131\u79BB\u91CD\u4F24`);
        if (state.onComplete) state.onComplete();
        return { ok: true, rescued: true };
      }
      if (state.index >= state.order.length) {
        target.dying = false;
        this.eliminate(state.targetId, state.sourceId);
        if (state.onComplete && !this.winner) state.onComplete();
        return { ok: true, eliminated: true };
      }
      const rescuerId = state.order[state.index], rescuer = this.player(rescuerId);
      if (!rescuer?.alive) return this.continueRescue({ ...state, index: state.index + 1 });
      const valid = rescuer.hand.filter((card) => card.id === "heal" || card.id === "adapt" || rescuerId === state.targetId && card.id === "overdrive");
      if (!valid.length || !rescuer.human && rescuerId !== state.targetId && !this.isAlly(rescuerId, state.targetId)) return this.continueRescue({ ...state, index: state.index + 1 });
      return this.requestChoice(rescuerId, {
        title: `\u6551\u63F4${this.nameOf(target)}`,
        text: `${this.nameOf(target)}\u5F53\u524D\u4F53\u529B\u4E3A${target.hp}\uFF0C\u987B\u56DE\u590D\u81F3\u81F3\u5C111\u70B9\u3002`,
        options: [{ value: "pass", label: "\u653E\u5F03\u6551\u63F4" }, ...valid.map((card) => ({ value: card.uid, label: `\u6253\u51FA\u3010${card.name}\u3011` }))],
        aiChoice: valid[0]?.uid || "pass",
        onResolve: (value) => {
          if (value === "pass") return this.continueRescue({ ...state, index: state.index + 1 });
          const card = rescuer.hand.find((item) => item.uid === value);
          if (!card) return this.continueRescue({ ...state, index: state.index + 1 });
          this.removeCard(rescuerId, card.uid);
          target.hp += 1;
          this.log("heal", `${this.nameOf(rescuer)}\u4EE5\u3010${card.name}\u3011\u4EE4${this.nameOf(target)}\u56DE\u590D1\u70B9\u4F53\u529B`);
          this.continueRescue(state);
        }
      });
    }
    applyPoison(targetId, amount) {
      const target = this.player(targetId);
      target.poison = clamp(target.poison + amount, 0, 2);
      this.log("event", `${this.nameOf(target)}\u83B7\u5F97${amount}\u5C42\u6BD2\u7D20`);
    }
    eliminate(targetId, sourceId = null) {
      const target = this.player(targetId);
      if (!target?.alive) return;
      if (target.characterId === "itachi") this.returnSealedCards(targetId);
      target.alive = false;
      target.hp = 0;
      target.revealed = true;
      for (const plot of [...target.plots]) this.removePlot(plot);
      for (const owner of this.players) for (const plot of [...owner.plots]) if (plot.targetId === targetId) this.removePlot(plot);
      for (const card of target.hand.splice(0)) this.discard.push(card);
      for (const stored of target.specialCards.splice(0)) this.discard.push(stored.card);
      for (const sealed of target.sealedCards.splice(0)) this.discard.push(sealed.card);
      for (const owner of this.players) if (owner.chessTargetId === targetId) owner.chessTargetId = null;
      for (const marked of this.players) if (marked.sandMarkedBy === targetId) {
        marked.sandMarkedBy = null;
        marked.sandMarkSetTurn = 0;
      }
      for (const slot of Object.keys(target.equipment)) if (target.equipment[slot]) {
        this.discard.push(target.equipment[slot]);
        target.equipment[slot] = null;
      }
      this.log("eliminate", `${this.nameOf(target)}\u9000\u573A\uFF0C\u8EAB\u4EFD\u4E3A${this.roleOf(target).name}`);
      if (this.mode.id === "classic8" && sourceId) {
        const source = this.player(sourceId);
        if (target.roleId === "rebel" && source?.alive) this.draw(sourceId, 2);
        if (source?.roleId === "lord" && target.roleId === "loyal") {
          for (const card of source.hand.splice(0)) this.discard.push(card);
          for (const slot of Object.keys(source.equipment)) if (source.equipment[slot]) {
            this.discard.push(source.equipment[slot]);
            source.equipment[slot] = null;
          }
          this.log("event", `${this.nameOf(source)}\u8BEF\u4F24\u5B88\u62A4\u8005\uFF0C\u5931\u53BB\u4E86\u6240\u6709\u724C`);
        }
      }
      this.checkWinner();
    }
    checkWinner() {
      if (this.winner) return this.winner;
      const alive = this.players.filter((player) => player.alive);
      if (this.mode.id === "ranked2v2") {
        const azure = alive.some((player) => player.roleId === "azure"), crimson = alive.some((player) => player.roleId === "crimson");
        if (!azure) this.winner = { camp: "crimson", label: "\u7EEF\u961F\u83B7\u80DC" };
        if (!crimson) this.winner = { camp: "azure", label: "\u82CD\u961F\u83B7\u80DC" };
      } else {
        const lord = this.players.find((player) => player.roleId === "lord");
        if (!lord.alive) {
          if (alive.length === 1 && alive[0].roleId === "lone") this.winner = { camp: "lone", label: "\u72EC\u884C\u8005\u83B7\u80DC" };
          else this.winner = { camp: "chaos", label: "\u7834\u754C\u8005\u83B7\u80DC" };
        } else if (!alive.some((player) => player.roleId === "rebel" || player.roleId === "lone")) this.winner = { camp: "order", label: "\u754C\u4E3B\u9635\u8425\u83B7\u80DC" };
      }
      if (this.winner) {
        this.phase = "ended";
        this.log("victory", this.winner.label);
      }
      return this.winner;
    }
    revealRole(playerId) {
      const player = this.player(playerId);
      if (!this.canAct(playerId) || player.revealed || player.roleId === "lord" || this.mode.id === "ranked2v2") return { ok: false, reason: "\u65E0\u6CD5\u663E\u9732\u8EAB\u4EFD" };
      player.revealed = true;
      this.log("event", `${this.nameOf(player)}\u4E3B\u52A8\u663E\u9732\u8EAB\u4EFD\uFF1A${this.roleOf(player).name}`);
      if (player.roleId === "loyal") {
        this.draw(playerId, 2);
        const lord = this.players.find((p) => p.alive && p.roleId === "lord");
        if (lord) this.gainShield(lord.id, 1, playerId);
      } else if (player.roleId === "rebel") {
        this.draw(playerId, 1);
        this.gainEnergy(playerId, 2);
        player.rangeInfinite = true;
      } else if (player.roleId === "lone") {
        this.draw(playerId, 2);
        this.gainShield(playerId, 1);
      }
      return { ok: true };
    }
    signatureCost(playerId) {
      const player = this.player(playerId), signature = this.characterOf(player)?.signature;
      if (!signature) return Infinity;
      return isOnePieceCharacter(player) ? signatureCost(this, playerId) : signature.cost;
    }
    useSignature(playerId, targetId) {
      const player = this.player(playerId), character = this.characterOf(player), sig = character?.signature;
      if (!this.canAct(playerId)) return { ok: false, reason: "\u73B0\u5728\u4E0D\u80FD\u53D1\u52A8\u6280\u80FD" };
      const cost = this.signatureCost(playerId);
      if (!sig || player.energy < cost) return { ok: false, reason: "\u80FD\u91CF\u4E0D\u8DB3" };
      if (player.signatureLocked > 0) return { ok: false, reason: "\u62DB\u724C\u6280\u6B63\u5728\u5C01\u5B58\u4E2D" };
      if (!this.getSignatureTargets(playerId).includes(targetId)) return { ok: false, reason: "\u76EE\u6807\u4E0D\u5408\u6CD5" };
      player.energy -= cost;
      this.log("signature", `${this.nameOf(player)}\u91CA\u653E\u62DB\u724C\u6280\u300C${sig.name}\u300D\uFF01`);
      if (isOnePieceCharacter(player)) return useOnePieceSignature(this, playerId, targetId, sig);
      switch (sig.effect) {
        case "doubleGuard":
          return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "signature" });
        case "rasenshuriken": {
          const clone = this.consumeSpecialCard(playerId, "clone");
          if (clone) this.log("event", `${this.nameOf(player)}\u6D88\u8017\u5F71\u5206\u8EAB\uFF0C\u4F7F\u87BA\u65CB\u624B\u91CC\u5251\u4F24\u5BB3+1\u4E14\u65E0\u6CD5\u88AB\u5F3A\u5236\u4ECB\u5165`);
          return this.beginAttack({ sourceId: playerId, targetId, damage: 2 + (clone ? 1 : 0), requiredGuards: 2, origin: "signature", skipIntervene: Boolean(clone) });
        }
        case "hundredHealings":
          player.byakugoMode = true;
          player.byakugoActivatedTurn = this.turnNumber;
          player.roundFlags.byakugoReturnedTypes = [];
          player.turnFlags.nextAttackBonus = true;
          return { ok: true };
        case "checkmate": {
          const plot = player.plots.find((item) => item.targetId === targetId && !item.isFalse);
          if (!plot) return this.requestDiscard(targetId, 2, { reason: "\u5C06\u519B\uFF1A\u8BF7\u9009\u62E92\u5F20\u624B\u724C\u5F03\u7F6E", onComplete: () => {
            player.chessTargetId = null;
          } });
          plot.effect = "checkmateTrap";
          plot.revealed = true;
          player.chessTargetId = null;
          this.log("event", `${this.nameOf(player)}\u5C06\u4F0F\u7B14\u3010${plot.card.name}\u3011\u6539\u5199\u4E3A\u516C\u5F00\u7684\u201C\u5C06\u519B\u201D\u9677\u9631`);
          return { ok: true };
        }
        case "tsukuyomi":
          return this.resolveTsukuyomi(playerId, targetId);
        case "kirin": {
          player.swapMarkedId = null;
          player.turnFlags.ignoreArmorTarget = targetId;
          const hpBefore = this.player(targetId).hp;
          return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "kirin", onComplete: () => {
            const target = this.player(targetId);
            if (target?.alive && target.hp < hpBefore && target.hand.length) this.requestDiscard(targetId, 1, { reason: "\u9E92\u9E9F\u547D\u4E2D\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E" });
          } });
        }
        case "kamuiRaikiri":
          return this.resolveKamuiRaikiri(playerId, targetId);
        case "sixtyFourPalms": {
          const target = this.player(targetId);
          target.energy = 0;
          target.energyLocked = true;
          target.signatureLocked = Math.max(target.signatureLocked, 1);
          this.log("event", `${this.nameOf(player)}\u5C01\u9501\u4E86${this.nameOf(target)}\u7684\u80FD\u91CF\u7ECF\u7EDC\u4E0E\u62DB\u724C\u6280`);
          this.dealDamage(playerId, targetId, 1, "signature");
          return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard) };
        }
        case "goemon":
          return this.resolveGoemon(playerId, targetId);
        case "immortality":
          return this.resolveImmortality(playerId);
        case "discardOrDamage":
          return this.forceDiscardOrDamage(playerId, targetId, 2, 2);
        case "gearFive":
          player.hp = clamp(player.hp + 1, 0, player.maxHp);
          this.draw(playerId, 2);
          player.attackLimit += 1;
          return { ok: true };
        case "miracleCure": {
          const target = this.player(targetId);
          target.hp = clamp(target.hp + 1, 0, target.maxHp);
          this.draw(targetId, 2);
          return { ok: true };
        }
        case "bankai":
          player.rangeInfinite = true;
          player.attackLimit += 1;
          this.drawSpecific(playerId, "attack");
          return { ok: true };
        case "freeze":
          this.player(targetId).skipOffense = true;
          return { ok: true };
        case "powerAttack":
          return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 1, origin: "signature" });
        case "venomStrike":
          return this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "venomStrike", alwaysPoison: true });
        case "hollowPurple": {
          const target = this.player(targetId);
          if (target.hand.length >= 2) return this.requestDiscard(targetId, 2, { reason: "\u865A\u5F0F\xB7\u8308\uFF1A\u8BF7\u9009\u62E92\u5F20\u624B\u724C\u5F03\u7F6E" });
          else {
            this.dealDamage(playerId, targetId, 1, "signature");
            for (const slot of Object.keys(target.equipment)) if (target.equipment[slot]) {
              this.discard.push(target.equipment[slot]);
              target.equipment[slot] = null;
            }
            this.refreshEnergyCap(target);
          }
          return { ok: true };
        }
        case "blackFlash":
          return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 1, origin: "blackFlash" });
        case "thunderSpear": {
          const target = this.player(targetId);
          const slots = Object.keys(target.equipment).filter((slot) => target.equipment[slot]);
          if (slots.length) {
            for (const slot of slots) {
              this.discard.push(target.equipment[slot]);
              target.equipment[slot] = null;
            }
            this.refreshEnergyCap(target);
          } else this.dealDamage(playerId, targetId, 2, "signature");
          return { ok: true };
        }
        case "colossal": {
          this.loseHp(playerId, 1, null);
          if (!player.alive) return { ok: true };
          this.resolveColossal(playerId, this.players.filter((p) => p.alive && p.id !== playerId).map((p) => p.id));
          return { ok: true, pending: Boolean(this.pendingDiscard) };
        }
        default:
          return { ok: true };
      }
    }
    resolveTsukuyomi(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      const illusion = source?.plots.find((plot) => plot.isFalse && plot.targetId === targetId);
      const cards = target?.hand.filter((card) => !card.responseOnly) || [];
      if (!illusion || !cards.length) return { ok: false, reason: "\u6CA1\u6709\u53EF\u7528\u4E8E\u6708\u8BFB\u7684\u5E7B\u8C61\u6216\u624B\u724C" };
      this.removePlot(illusion);
      const seal = (uid) => {
        const index = target.hand.findIndex((card2) => card2.uid === uid && !card2.responseOnly);
        if (index < 0) return;
        const [card] = target.hand.splice(index, 1);
        target.sealedCards.push({ uid: `sealed-${card.uid}`, card, sealedBy: sourceId, returnAtPlayerId: targetId, setTurn: this.turnNumber });
        this.log("event", `${this.nameOf(source)}\u4EE5\u201C\u6708\u8BFB\u201D\u5C01\u5B58\u4E86${this.nameOf(target)}\u7684\u3010${card.name}\u3011`);
        this.dealDamage(sourceId, targetId, 1, "tsukuyomi");
      };
      if (!source.human) {
        seal(cards[0].uid);
        return { ok: true };
      }
      return this.requestChoice(sourceId, {
        title: "\u6708\u8BFB\uFF1A\u9009\u62E9\u5C01\u5B58\u624B\u724C",
        text: `${this.nameOf(target)}\u5C55\u793A\u4E86\u53EF\u88AB\u5C01\u5B58\u7684\u975E\u54CD\u5E94\u624B\u724C\u3002`,
        options: cards.map((card) => ({ value: card.uid, label: `\u5C01\u5B58\u3010${card.name}\u3011`, description: card.description })),
        aiChoice: cards[0].uid,
        onResolve: seal
      });
    }
    resolveGoemon(sourceId, firstTargetId) {
      const source = this.player(sourceId);
      const candidates = this.getSignatureTargets(sourceId).filter((id) => id !== firstTargetId);
      const chooseTargets = (secondTargetId) => {
        const targetIds = [firstTargetId, secondTargetId].filter(Boolean);
        const enhanced = source.sageResonance ? source.human ? null : targetIds[0] : null;
        const begin = (enhancedId) => {
          if (source.sageResonance) {
            source.sageResonance = false;
          }
          return this.resolveGoemonTargets(sourceId, targetIds, 0, enhancedId);
        };
        if (!source.sageResonance) return begin(null);
        if (!source.human) return begin(enhanced || targetIds[0]);
        return this.requestChoice(sourceId, {
          title: "\u4E94\u53F3\u536B\u95E8\uFF1A\u4ED9\u672F\u5171\u9E23",
          text: "\u9009\u62E9\u4E00\u540D\u76EE\u6807\u627F\u53D7\u4ED9\u672F\u5F3A\u5316\uFF1A\u4F24\u5BB3+1\u5E76\u5FFD\u7565\u9632\u62A4\u88C5\u7532\u3002",
          options: targetIds.map((id) => ({ value: id, label: `\u5F3A\u5316${this.nameOf(id)}` })),
          aiChoice: targetIds[0],
          onResolve: begin
        });
      };
      if (!candidates.length) return chooseTargets(null);
      if (!source.human) return chooseTargets(candidates.sort((a, b) => this.player(a).hp - this.player(b).hp)[0]);
      return this.requestChoice(sourceId, {
        title: "\u4ED9\u6CD5\xB7\u4E94\u53F3\u536B\u95E8\uFF1A\u9009\u62E9\u7B2C\u4E8C\u76EE\u6807",
        text: "\u6700\u591A\u9009\u62E9\u4E24\u540D\u8DDD\u79BB2\u4EE5\u5185\u7684\u654C\u4EBA\uFF1B\u4E5F\u53EF\u4EE5\u53EA\u653B\u51FB\u5F53\u524D\u76EE\u6807\u3002",
        options: [{ value: "none", label: "\u53EA\u653B\u51FB\u5F53\u524D\u76EE\u6807" }, ...candidates.map((id) => ({ value: id, label: `\u8FFD\u52A0${this.nameOf(id)}` }))],
        aiChoice: "none",
        onResolve: (value) => chooseTargets(value === "none" ? null : value)
      });
    }
    resolveGoemonTargets(sourceId, targetIds, index = 0, enhancedId = null) {
      if (index >= targetIds.length || this.winner) {
        const source2 = this.player(sourceId);
        if (source2 && enhancedId) source2.sageMarks = 0;
        return { ok: true };
      }
      const source = this.player(sourceId);
      const targetId = targetIds[index];
      const target = this.player(targetId);
      if (!source?.alive || !target?.alive) return this.resolveGoemonTargets(sourceId, targetIds, index + 1, enhancedId);
      const bound = source.toadBindTargetId === targetId;
      const baseDamage = index === 0 ? 2 : 1;
      const baseGuards = index === 0 ? 2 : 1;
      const damage = baseDamage + (enhancedId === targetId ? 1 : 0);
      const requiredGuards = baseGuards + (bound ? 1 : 0);
      if (enhancedId === targetId) source.turnFlags.goemonIgnoreArmorTarget = targetId;
      return this.beginAttack({
        sourceId,
        targetId,
        damage,
        requiredGuards,
        origin: "goemon",
        skipIntervene: false,
        onComplete: () => {
          if (source.toadBindTargetId === targetId) {
            source.toadBindTargetId = null;
            source.toadBindExpiresTurn = 0;
            this.log("event", `${this.nameOf(target)}\u7684\u201C\u86E4\u87C6\u53E3\u675F\u7F1A\u201D\u5728\u4E94\u53F3\u536B\u95E8\u540E\u89E3\u9664`);
          }
          this.resolveGoemonTargets(sourceId, targetIds, index + 1, enhancedId);
        }
      });
    }
    resolveKamuiRaikiri(sourceId, targetId) {
      const source = this.player(sourceId), target = this.player(targetId);
      const copies = source.hand.filter((card) => card._copiedBy === sourceId);
      return this.requestChoice(sourceId, {
        title: "\u795E\u5A01\u96F7\u5207\uFF1A\u9009\u62E9\u62F7\u8D1D\u6838\u5FC3",
        text: "\u57FA\u7840\u724C\u5316\u4E3A\u53CC\u9632\u5F3A\u88AD\uFF1B\u7B56\u7565\u724C\u62B9\u9664\u76EE\u6807\u573A\u4E0A\u7684\u4E00\u5F20\u724C\u5E76\u5EF6\u540E\u884C\u52A8\u3002",
        options: copies.map((card) => ({ value: card.uid, label: `\u6D88\u8017\u3010${card.name}\u3011`, description: card.type === "basic" ? "\u9020\u62102\u70B9\u4F24\u5BB3\uFF0C\u9700\u89812\u5F20\u9632\u5FA1" : "\u62B9\u96641\u5F20\u4F0F\u7B14\u6216\u88C5\u5907\uFF0C\u5E76\u5C06\u76EE\u6807\u884C\u52A8\u540E\u79FB" })),
        aiChoice: copies.find((card) => card.type === "basic")?.uid || copies[0]?.uid,
        onResolve: (uid) => {
          const index = source.hand.findIndex((card) => card.uid === uid && card._copiedBy === sourceId);
          if (index < 0) return;
          const [copy] = source.hand.splice(index, 1);
          if (copy.type === "basic") {
            this.beginAttack({ sourceId, targetId, damage: 2, requiredGuards: 2, origin: "signature" });
            return;
          }
          const options = [
            ...target.plots.map((plot) => ({ value: `plot:${plot.uid}`, label: `\u62B9\u9664\u4F0F\u7B14\u3010${plot.card.name}\u3011` })),
            ...["weapon", "armor", "charm"].filter((slot) => target.equipment[slot]).map((slot) => ({ value: `equip:${slot}`, label: `\u62B9\u9664${{ weapon: "\u6B66\u5668", armor: "\u9632\u5177", charm: "\u9970\u54C1" }[slot]}\u3010${target.equipment[slot].name}\u3011` }))
          ];
          const finish = (value) => {
            if (value?.startsWith("plot:")) this.removePlot(target.plots.find((plot) => plot.uid === value.slice(5)));
            else if (value?.startsWith("equip:")) {
              const slot = value.slice(6);
              const equipment = target.equipment[slot];
              if (equipment) {
                this.discard.push(equipment);
                target.equipment[slot] = null;
                this.refreshEnergyCap(target);
              }
            }
            const queueIndex = this.turnQueue.indexOf(targetId);
            if (queueIndex >= 0 && queueIndex < this.turnQueue.length - 1) this.turnQueue.push(this.turnQueue.splice(queueIndex, 1)[0]);
            this.log("event", `${this.nameOf(source)}\u4EE5\u201C\u795E\u5A01\u96F7\u5207\u201D\u626D\u66F2\u4E86${this.nameOf(target)}\u7684\u573A\u57DF\u4E0E\u884C\u52A8\u65F6\u5E8F`);
          };
          if (!options.length) {
            finish(null);
            return;
          }
          this.requestChoice(sourceId, { title: "\u795E\u5A01\uFF1A\u9009\u62E9\u62B9\u9664\u76EE\u6807", options, aiChoice: options[0].value, onResolve: finish });
        }
      });
    }
    resolveImmortality(playerId) {
      const player = this.player(playerId);
      const spoils = player.hand.filter((card) => card._curseSpoil === playerId);
      return this.requestChoice(playerId, {
        title: "\u4E0D\u5C38\u8F6C\u751F\uFF1A\u9009\u62E9\u5B9E\u9A8C\u724C",
        text: "\u57FA\u7840\u724C\u8F6C\u5316\u4E3A\u751F\u547D\u4E0E\u62A4\u76FE\uFF1B\u7B56\u7565\u724C\u51C0\u5316\u4F0F\u7B14\u4E0E\u5C01\u9501\uFF1B\u88C5\u5907\u724C\u76F4\u63A5\u88C5\u5165\u5BF9\u5E94\u69FD\u4F4D\u3002",
        options: spoils.map((card) => ({ value: card.uid, label: `\u8F6C\u5316\u3010${card.name}\u3011`, description: { basic: "\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u83B7\u5F971\u70B9\u62A4\u76FE", strategy: "\u79FB\u9664\u6307\u5411\u4F60\u7684\u4F0F\u7B14\u5E76\u89E3\u9664\u5F02\u5E38\u5C01\u9501", equipment: "\u76F4\u63A5\u88C5\u5907\u5E76\u83B7\u5F971\u70B9\u62A4\u76FE" }[card.type] })),
        aiChoice: spoils[0]?.uid,
        onResolve: (uid) => {
          const index = player.hand.findIndex((card2) => card2.uid === uid && card2._curseSpoil === playerId);
          if (index < 0) return;
          const [card] = player.hand.splice(index, 1);
          delete card._curseSpoil;
          if (card.type === "basic") {
            player.hp = clamp(player.hp + 1, 0, player.maxHp);
            this.gainShield(playerId, 1);
            this.discard.push(card);
          } else if (card.type === "strategy") {
            for (const plot of [...this.plotsTargeting(playerId)]) this.removePlot(plot);
            player.poison = 0;
            player.frozenDraw = 0;
            player.energyLocked = false;
            player.signatureLocked = 0;
            this.discard.push(card);
          } else {
            if (player.equipment[card.slot]) this.discard.push(player.equipment[card.slot]);
            player.equipment[card.slot] = card;
            this.gainShield(playerId, 1);
            this.refreshEnergyCap(player);
          }
          this.log("event", `${this.nameOf(player)}\u4EE5\u3010${card.name}\u3011\u5B8C\u6210\u201C\u4E0D\u5C38\u8F6C\u751F\u201D`);
        }
      });
    }
    forceDiscardOrDamage(sourceId, targetId, discardCount, damage) {
      const target = this.player(targetId);
      if (target.hand.length >= discardCount) return this.requestDiscard(targetId, discardCount, { reason: `\u7802\u7011\u5927\u846C\uFF1A\u8BF7\u9009\u62E9${discardCount}\u5F20\u624B\u724C\u5F03\u7F6E`, onComplete: () => {
        target.frozenDraw = Math.max(1, target.frozenDraw);
      } });
      else {
        target.frozenDraw = Math.max(1, target.frozenDraw);
        this.dealDamage(sourceId, targetId, damage, "signature");
      }
      return { ok: true };
    }
    resolveColossal(sourceId, targetIds, index = 0) {
      if (index >= targetIds.length || this.winner) return;
      const targetId = targetIds[index], target = this.player(targetId);
      const next = () => this.resolveColossal(sourceId, targetIds, index + 1);
      if (!target?.alive) return next();
      if (this.isAlly(sourceId, targetId)) {
        this.draw(targetId, 1);
        return next();
      }
      if (target.hand.length) return this.requestDiscard(targetId, 1, { reason: "\u8D85\u5927\u578B\u5DE8\u4EBA\u51B2\u51FB\uFF1A\u8BF7\u9009\u62E91\u5F20\u624B\u724C\u5F03\u7F6E", shouldLog: false, onComplete: next });
      return next();
    }
    drawSpecific(playerId, cardId) {
      let index = this.deck.findIndex((card) => card.id === cardId);
      if (index < 0) index = this.discard.findIndex((card) => card.id === cardId);
      if (index >= 0) {
        const source = this.deck.findIndex((card) => card.id === cardId) >= 0 ? this.deck : this.discard;
        this.player(playerId).hand.push(source.splice(index, 1)[0]);
      } else this.draw(playerId, 1);
    }
    canAct(playerId) {
      return !this.winner && !this.pendingResponse && !this.pendingDiscard && !this.pendingChoice && this.phase === "play" && this.currentPlayerId === playerId && this.player(playerId)?.alive && !this.player(playerId)?.turnFlags.forcedEnd;
    }
    removeCard(playerId, uid) {
      const player = this.player(playerId), index = player.hand.findIndex((card2) => card2.uid === uid);
      if (index < 0) return null;
      const [card] = player.hand.splice(index, 1);
      this.discard.push(card);
      return card;
    }
    requestDiscard(playerId, count = 1, { reason = "\u8BF7\u9009\u62E9\u8981\u5F03\u7F6E\u7684\u624B\u724C", allowedUids = null, shouldLog = true, onComplete = null } = {}) {
      const player = this.player(playerId);
      if (!player?.alive) {
        if (onComplete) onComplete([]);
        return { ok: true, pending: false, removed: [] };
      }
      const allowed = allowedUids ? new Set(allowedUids) : null;
      const eligible = player.hand.filter((card) => !allowed || allowed.has(card.uid));
      const required = Math.min(Math.max(0, count), eligible.length);
      if (!required) {
        if (onComplete) onComplete([]);
        return { ok: true, pending: false, removed: [] };
      }
      if (player.human) {
        this.pendingDiscard = {
          id: ++this.discardPromptId,
          playerId,
          count: required,
          reason,
          allowedUids: eligible.map((card) => card.uid),
          shouldLog
        };
        this.pendingDiscardResolver = onComplete;
        return { ok: true, pending: true };
      }
      const removed = this.discardRandom(playerId, required, shouldLog, eligible.map((card) => card.uid));
      if (onComplete) onComplete(removed);
      return { ok: true, pending: false, removed };
    }
    confirmDiscard(playerId, cardUids) {
      const pending = this.pendingDiscard;
      if (!pending || pending.playerId !== playerId) return { ok: false, reason: "\u5F53\u524D\u6CA1\u6709\u9700\u8981\u786E\u8BA4\u7684\u5F03\u724C" };
      const unique = [...new Set(cardUids || [])];
      if (unique.length !== pending.count) return { ok: false, reason: `\u9700\u8981\u9009\u62E9${pending.count}\u5F20\u724C` };
      const allowed = new Set(pending.allowedUids);
      const player = this.player(playerId);
      if (!player || unique.some((uid) => !allowed.has(uid) || !player.hand.some((card) => card.uid === uid))) return { ok: false, reason: "\u9009\u62E9\u4E2D\u5305\u542B\u65E0\u6548\u624B\u724C" };
      const removed = unique.map((uid) => this.removeCard(playerId, uid)).filter(Boolean);
      if (pending.shouldLog && removed.length) this.log("system", `${this.nameOf(player)}\u5F03\u7F6E\u4E86${removed.length}\u5F20\u624B\u724C`);
      const resolver = this.pendingDiscardResolver;
      this.pendingDiscard = null;
      this.pendingDiscardResolver = null;
      if (resolver) resolver(removed);
      return { ok: true, removed };
    }
    discardRandom(playerId, count = 1, shouldLog = true, allowedUids = null) {
      const player = this.player(playerId);
      if (!player) return [];
      const allowed = allowedUids ? new Set(allowedUids) : null;
      const removed = [];
      for (let i = 0; i < count; i += 1) {
        const candidates = player.hand.map((card2, index2) => ({ card: card2, index: index2 })).filter((item) => !allowed || allowed.has(item.card.uid));
        if (!candidates.length) break;
        const index = candidates[Math.floor(this.random() * candidates.length)].index;
        const [card] = player.hand.splice(index, 1);
        this.discard.push(card);
        removed.push(card);
      }
      if (shouldLog && removed.length) this.log("system", `${this.nameOf(player)}\u5F03\u7F6E\u4E86${removed.length}\u5F20\u624B\u724C`);
      return removed;
    }
    getAITargets(playerId, candidates) {
      const actor = this.player(playerId);
      const enemies2 = candidates.filter((id) => !this.aiIsAlly(playerId, id));
      if (this.mode.id === "classic8" && actor?.roleId === "lone") {
        const lord = enemies2.find((id) => this.player(id)?.roleId === "lord");
        const rebelsAlive = this.players.some((player) => player.alive && player.roleId === "rebel");
        if (lord && rebelsAlive) return enemies2.filter((id) => id !== lord);
      }
      return enemies2.sort((a, b) => this.player(a).hp - this.player(b).hp);
    }
    aiIsAlly(aId, bId) {
      if (this.mode.id !== "classic8") return this.isAlly(aId, bId);
      const a = this.player(aId), b = this.player(bId);
      return Boolean(a?.revealed && b?.revealed && this.isAlly(aId, bId));
    }
    aiStep(playerId = this.currentPlayerId) {
      const player = this.player(playerId);
      if (player && !player.alive && playerId === this.currentPlayerId) {
        this.advancePastEliminatedCurrent();
        return { acted: true };
      }
      if (!this.canAct(playerId) || player.human) return { acted: false };
      if (!player.revealed && this.mode.id === "classic8" && this.round >= 2 && this.random() < 0.35) {
        this.revealRole(playerId);
        return { acted: true };
      }
      if (player.characterId === "jiraiya" && player.energy >= 4 && player.sageResonance) {
        const targets = this.getAITargets(playerId, this.getSignatureTargets(playerId));
        if (targets.length) {
          const result = this.useSignature(playerId, targets[0]);
          if (result.ok !== false) return { acted: true };
        }
      }
      const activeTargets = this.getActiveSkillTargets(playerId);
      if (activeTargets.length && !player.turnFlags.activeUsed && this.random() < 0.55) {
        const skill = activeSkills[player.characterId];
        let choices = skill.target === "enemy" ? this.getAITargets(playerId, activeTargets) : skill.target === "ally" ? activeTargets.filter((id) => this.aiIsAlly(playerId, id)) : activeTargets;
        if (player.characterId === "jinbe") {
          const allies = activeTargets.filter((id) => this.aiIsAlly(playerId, id));
          if (allies.length) choices = allies;
        }
        if (choices.length) {
          this.useActiveSkill(playerId, choices[0]);
          return { acted: true };
        }
      }
      const sig = this.characterOf(player).signature;
      if (player.energy >= this.signatureCost(playerId) && player.signatureLocked <= 0) {
        const targets = this.getSignatureTargets(playerId);
        const choices = sig.target === "enemy" ? this.getAITargets(playerId, targets) : sig.target === "ally" ? targets.filter((id) => this.aiIsAlly(playerId, id)) : targets;
        if (choices.length) {
          const result = this.useSignature(playerId, choices[0]);
          if (result.ok !== false) return { acted: true };
        }
      }
      const heal = player.hand.find((card) => card.id === "heal");
      if (heal && player.hp < player.maxHp) {
        this.playCard(playerId, heal.uid, playerId);
        return { acted: true };
      }
      const equipment = player.hand.find((card) => card.type === "equipment" && (!player.equipment[card.slot] || this.random() < 0.18));
      if (equipment) {
        this.playCard(playerId, equipment.uid, playerId);
        return { acted: true };
      }
      const focus = player.hand.find((card) => card.id === "focus" && player.energy < player.maxEnergy);
      if (focus) {
        this.playCard(playerId, focus.uid, playerId);
        return { acted: true };
      }
      if (player.skipOffense) return { acted: false };
      const massDamage = player.hand.find((card) => ["dimensional_barrage", "rift_invasion"].includes(card.id));
      if (massDamage && !player.skipOffense) {
        const others = this.players.filter((target) => target.alive && target.id !== playerId);
        const enemies2 = others.filter((target) => !this.aiIsAlly(playerId, target.id));
        const allies = others.length - enemies2.length;
        if (enemies2.length > allies) {
          this.playCard(playerId, massDamage.uid, playerId);
          return { acted: true };
        }
      }
      const duel = player.hand.find((card) => card.id === "will_duel");
      if (duel && !player.skipOffense) {
        const ownResponses = player.hand.filter((card) => card.id === "attack" || card.id === "adapt").length;
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, duel)).sort((a, b) => this.player(a).hand.length - this.player(b).hand.length || this.player(a).hp - this.player(b).hp);
        if (targets.length && (ownResponses > 0 || this.player(targets[0]).hand.length === 0)) {
          this.playCard(playerId, duel.uid, targets[0]);
          return { acted: true };
        }
      }
      const mindBurn = player.hand.find((card) => card.id === "mind_burn");
      if (mindBurn && !player.skipOffense) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, mindBurn));
        if (targets.length && player.hand.some((card) => card.uid !== mindBurn.uid)) {
          this.playCard(playerId, mindBurn.uid, targets[0]);
          return { acted: true };
        }
      }
      const collapse = player.hand.find((card) => card.id === "energy_collapse");
      if (collapse && !player.skipOffense) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, collapse)).sort((a, b) => this.player(a).energy - this.player(b).energy || this.player(a).hp - this.player(b).hp);
        if (targets.length) {
          this.playCard(playerId, collapse.uid, targets[0]);
          return { acted: true };
        }
      }
      const contract = player.hand.find((card) => card.id === "limit_contract");
      if (contract) {
        const allies = this.getCardTargets(playerId, contract).filter((id) => this.aiIsAlly(playerId, id));
        if (allies.length) {
          this.playCard(playerId, contract.uid, allies[0]);
          return { acted: true };
        }
      }
      const relay = player.hand.find((card) => card.id === "tactical_relay" && player.hand.some((item) => item.type === "basic"));
      if (relay) {
        const allies = this.getCardTargets(playerId, relay).filter((id) => this.aiIsAlly(playerId, id));
        if (allies.length) {
          this.playCard(playerId, relay.uid, allies[0]);
          return { acted: true };
        }
      }
      const selfStrategy = player.hand.find((card) => ["energy_auction", "delayed_cast", "echo_script"].includes(card.id) && !player.plots.some((plot) => plot.effect === card.effect) && this.getCardTargets(playerId, card).length);
      if (selfStrategy && this.random() < 0.65) {
        this.playCard(playerId, selfStrategy.uid, playerId);
        return { acted: true };
      }
      const enemyPlot = player.hand.find((card) => ["causal_mark", "rhythm_break"].includes(card.id) && !player.plots.some((plot) => plot.effect === card.effect) && this.getCardTargets(playerId, card).length);
      if (enemyPlot && player.plots.length < 2) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, enemyPlot));
        if (targets.length) {
          this.playCard(playerId, enemyPlot.uid, targets[0]);
          return { acted: true };
        }
      }
      const allyPlot = player.hand.find((card) => ["guardian_oath", "return_route"].includes(card.id) && !player.plots.some((plot) => plot.effect === card.effect) && this.getCardTargets(playerId, card).length);
      if (allyPlot && player.plots.length < 2) {
        const allies = this.getCardTargets(playerId, allyPlot).filter((id) => this.aiIsAlly(playerId, id));
        if (allies.length) {
          this.playCard(playerId, allyPlot.uid, allies[0]);
          return { acted: true };
        }
      }
      const exchange = player.hand.find((card) => card.id === "memory_exchange");
      if (exchange) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, exchange));
        if (targets.length && this.random() < 0.35) {
          this.playCard(playerId, exchange.uid, targets[0]);
          return { acted: true };
        }
      }
      const initiative = player.hand.find((card) => card.id === "initiative_swap" && this.getCardTargets(playerId, card).length >= 2);
      if (initiative && this.random() < 0.35) {
        this.playCard(playerId, initiative.uid, this.getCardTargets(playerId, initiative)[0]);
        return { acted: true };
      }
      if (!player.skipOffense) {
        const overdrive = player.hand.find((card) => card.id === "overdrive" && !player.turnFlags.overdriveUsed && player.hand.some((item) => item.id === "attack"));
        if (overdrive) {
          this.playCard(playerId, overdrive.uid, playerId);
          return { acted: true };
        }
        const attack = player.hand.find((card) => card.id === "attack");
        if (attack && player.attacksUsed < player.attackLimit) {
          const targets = this.getAITargets(playerId, this.getCardTargets(playerId, attack));
          if (targets.length) {
            this.playCard(playerId, attack.uid, targets[0]);
            return { acted: true };
          }
        }
        const adapt = player.hand.find((card) => card.id === "adapt");
        if (adapt && player.attacksUsed < player.attackLimit) {
          const targets = this.getAITargets(playerId, this.getCardTargets(playerId, adapt).filter((id) => id !== playerId));
          if (targets.length) {
            this.playCard(playerId, adapt.uid, targets[0]);
            return { acted: true };
          }
        }
      }
      return { acted: false };
    }
    log(type, message) {
      this.logs.push({ id: `${Date.now()}-${this.logs.length}`, round: this.round, type, message });
      if (this.logs.length > 120) this.logs.shift();
    }
    humanWon() {
      if (!this.winner) return false;
      const human = this.players.find((player) => player.human);
      return this.winner.camp === this.roleOf(human).camp;
    }
  };

  // runtime/persistence.js
  var SAVE_KEY = "anime-kill.saved-match.v2";
  var SAVE_SCHEMA_VERSION = 2;
  var APP_VERSION = "0.2.0";
  function createSeededRandom(seed) {
    let value = Number(seed) >>> 0;
    return () => {
      value = value * 1664525 + 1013904223 >>> 0;
      return value / 4294967296;
    };
  }
  function createRandomSeed() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const value = new Uint32Array(1);
      crypto.getRandomValues(value);
      return value[0] || 1;
    }
    return (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0 || 1;
  }
  function defaultSaveStorage() {
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null;
    }
  }
  function cloneSerializable(value) {
    const seen = /* @__PURE__ */ new WeakSet();
    return JSON.parse(JSON.stringify(value, (key, item) => {
      if (typeof item === "function" || key === "random" || key.endsWith("Resolver")) return void 0;
      if (item && typeof item === "object") {
        if (seen.has(item)) return void 0;
        seen.add(item);
      }
      return item;
    }));
  }
  function pendingKind(engine2) {
    if (engine2.pendingChoice) return "choice";
    if (engine2.pendingDiscard) return "discard";
    if (engine2.pendingResponse) return "response";
    return null;
  }
  function stateDigest(engine2) {
    return {
      round: engine2.round,
      turnNumber: engine2.turnNumber,
      phase: engine2.phase,
      currentPlayerId: engine2.currentPlayerId,
      pendingKind: pendingKind(engine2),
      winner: engine2.winner?.camp || null,
      deckCount: engine2.deck.length,
      discardCount: engine2.discard.length,
      playerState: engine2.players.map((player) => ({
        id: player.id,
        alive: player.alive,
        hp: player.hp,
        energy: player.energy,
        handCount: player.hand.length,
        plotCount: player.plots.length
      }))
    };
  }
  function commandChangedState(method, result) {
    if (result && typeof result === "object" && result.ok === false) return false;
    if (["endTurn", "advancePastEliminatedCurrent", "respond"].includes(method)) return result !== false;
    if (method === "aiStep") return Boolean(result?.acted);
    return true;
  }
  var GameSession = class {
    constructor({ config, seed = createRandomSeed(), storage = defaultSaveStorage(), commands = [], ui = {} } = {}) {
      if (!config?.modeId || !config?.humanCharacterId) throw new Error("\u7F3A\u5C11\u5BF9\u5C40\u914D\u7F6E");
      this.config = { modeId: config.modeId, humanCharacterId: config.humanCharacterId, ...config.fixedAnchorSeat === void 0 ? {} : { fixedAnchorSeat: config.fixedAnchorSeat } };
      this.seed = Number(seed) >>> 0 || 1;
      this.storage = storage;
      this.commands = [];
      this.ui = { identityPredictions: [], ...ui };
      this.engine = new GameEngine({ ...this.config, random: createSeededRandom(this.seed) }).setup();
      this.replaying = false;
      if (commands.length) this.replay(commands);
    }
    execute(method, ...args) {
      if (!this.engine || typeof this.engine[method] !== "function") throw new Error(`\u672A\u77E5\u6E38\u620F\u64CD\u4F5C\uFF1A${method}`);
      const safeArgs = cloneSerializable(args);
      const result = this.engine[method](...args);
      if (commandChangedState(method, result)) {
        this.commands.push({ method, args: safeArgs });
        if (!this.replaying) this.saveNow();
      }
      return result;
    }
    replay(commands) {
      this.replaying = true;
      try {
        for (const command of commands) {
          if (!command || typeof command.method !== "string" || !Array.isArray(command.args)) throw new Error("\u5B58\u6863\u547D\u4EE4\u683C\u5F0F\u65E0\u6548");
          const result = this.execute(command.method, ...command.args);
          if (!commandChangedState(command.method, result)) throw new Error(`\u65E0\u6CD5\u91CD\u653E\u64CD\u4F5C\uFF1A${command.method}`);
        }
      } finally {
        this.replaying = false;
      }
      this.engine.visualEvents = [];
    }
    updateUi(ui) {
      this.ui = { ...this.ui, ...cloneSerializable(ui) };
      return this.saveNow();
    }
    createSave() {
      return {
        schemaVersion: SAVE_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        savedAt: (/* @__PURE__ */ new Date()).toISOString(),
        format: "deterministic-command-journal",
        config: this.config,
        seed: this.seed,
        commands: cloneSerializable(this.commands),
        ui: cloneSerializable(this.ui),
        stateDigest: stateDigest(this.engine),
        engineState: cloneSerializable(this.engine)
      };
    }
    saveNow() {
      if (!this.storage) return { ok: false, reason: "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u672C\u5730\u5B58\u6863" };
      if (this.engine.winner) {
        this.clear();
        return { ok: true, cleared: true };
      }
      try {
        const save = this.createSave();
        this.storage.setItem(SAVE_KEY, JSON.stringify(save));
        return { ok: true, save };
      } catch (error) {
        return { ok: false, reason: error?.message || "\u5199\u5165\u5B58\u6863\u5931\u8D25" };
      }
    }
    clear() {
      try {
        this.storage?.removeItem(SAVE_KEY);
      } catch {
      }
    }
  };
  function inspectSavedMatch(storage = defaultSaveStorage()) {
    if (!storage) return { exists: false, valid: false, reason: "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u672C\u5730\u5B58\u6863" };
    let raw;
    try {
      raw = storage.getItem(SAVE_KEY);
    } catch (error) {
      return { exists: false, valid: false, reason: error?.message || "\u65E0\u6CD5\u8BFB\u53D6\u5B58\u6863" };
    }
    if (!raw) return { exists: false, valid: false };
    try {
      const save = JSON.parse(raw);
      if (save.schemaVersion !== SAVE_SCHEMA_VERSION) throw new Error("\u5B58\u6863\u7248\u672C\u4E0E\u5F53\u524D\u5E94\u7528\u4E0D\u517C\u5BB9");
      if (!save.config?.modeId || !save.config?.humanCharacterId || !Number.isFinite(save.seed) || !Array.isArray(save.commands)) throw new Error("\u5B58\u6863\u5185\u5BB9\u4E0D\u5B8C\u6574");
      return { exists: true, valid: true, save };
    } catch (error) {
      return { exists: true, valid: false, reason: error?.message || "\u5B58\u6863\u5DF2\u635F\u574F" };
    }
  }
  function restoreSavedMatch(storage = defaultSaveStorage()) {
    const inspected = inspectSavedMatch(storage);
    if (!inspected.valid) throw new Error(inspected.reason || "\u6CA1\u6709\u53EF\u4EE5\u7EE7\u7EED\u7684\u5BF9\u5C40");
    const { save } = inspected;
    const session = new GameSession({ config: save.config, seed: save.seed, storage, commands: save.commands, ui: save.ui });
    if (save.stateDigest && JSON.stringify(save.stateDigest) !== JSON.stringify(stateDigest(session.engine))) throw new Error("\u5B58\u6863\u6821\u9A8C\u5931\u8D25\uFF0C\u64CD\u4F5C\u8BB0\u5F55\u4E0E\u72B6\u6001\u4E0D\u4E00\u81F4");
    return { session, save };
  }
  function discardSavedMatch(storage = defaultSaveStorage()) {
    try {
      storage?.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  // runtime/native-viewport.js
  function finitePositive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  function finiteOffset(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  function resolveNativeViewport(windowLike) {
    const visual = windowLike?.visualViewport;
    const width = finitePositive(visual?.width, finitePositive(windowLike?.innerWidth, 1));
    const height = finitePositive(visual?.height, finitePositive(windowLike?.innerHeight, 1));
    return {
      width,
      height,
      offsetLeft: finiteOffset(visual?.offsetLeft),
      offsetTop: finiteOffset(visual?.offsetTop),
      landscape: width >= height,
      short: height <= 460
    };
  }
  function installNativeViewport(windowLike, documentLike) {
    const root = documentLike.documentElement;
    const visual = windowLike.visualViewport;
    let animationFrame = 0;
    const apply = () => {
      animationFrame = 0;
      const viewport = resolveNativeViewport(windowLike);
      root.classList.add("native-android");
      root.classList.toggle("native-landscape", viewport.landscape);
      root.classList.toggle("native-portrait", !viewport.landscape);
      root.classList.toggle("native-short", viewport.short);
      root.style.setProperty("--native-viewport-width", `${viewport.width}px`);
      root.style.setProperty("--native-viewport-height", `${viewport.height}px`);
      root.style.setProperty("--native-viewport-left", `${viewport.offsetLeft}px`);
      root.style.setProperty("--native-viewport-top", `${viewport.offsetTop}px`);
    };
    const schedule = () => {
      if (animationFrame) windowLike.cancelAnimationFrame(animationFrame);
      animationFrame = windowLike.requestAnimationFrame(apply);
    };
    apply();
    visual?.addEventListener("resize", schedule);
    visual?.addEventListener("scroll", schedule);
    windowLike.addEventListener("resize", schedule);
    windowLike.addEventListener("orientationchange", schedule);
    return () => {
      if (animationFrame) windowLike.cancelAnimationFrame(animationFrame);
      visual?.removeEventListener("resize", schedule);
      visual?.removeEventListener("scroll", schedule);
      windowLike.removeEventListener("resize", schedule);
      windowLike.removeEventListener("orientationchange", schedule);
    };
  }

  // ../src/app.js
  if (Capacitor.isNativePlatform()) installNativeViewport(window, document);
  var $ = (selector) => document.querySelector(selector);
  var lobby = $("#lobby");
  var game = $("#game");
  var modeList = $("#modeList");
  var characterList = $("#characterList");
  var seriesFilters = $("#seriesFilters");
  var characterPreview = $("#characterPreview");
  var rulesDialog = $("#rulesDialog");
  var cardCodexDialog = $("#cardCodexDialog");
  var playerDetailDialog = $("#playerDetailDialog");
  var cardDetailDialog = $("#cardDetailDialog");
  var responseDialog = $("#responseDialog");
  var discardDialog = $("#discardDialog");
  var choiceDialog = $("#choiceDialog");
  var resultDialog = $("#resultDialog");
  var selectedMode = "classic8";
  var selectedCharacter = "naruto";
  var selectedSeries = "\u706B\u5F71\u5FCD\u8005";
  var engine = null;
  var gameSession = null;
  var selectedCard = null;
  var selectingSignature = false;
  var selectingActive = false;
  var aiTimer = null;
  var toastTimer = null;
  var lastMode = null;
  var codexFilter = "all";
  var selectedCodexCard = "attack";
  var discardSelection = /* @__PURE__ */ new Set();
  var activeDiscardPromptId = null;
  var inspectedPlayerId = null;
  var inspectedCardUid = null;
  var identityPredictions = /* @__PURE__ */ new Map();
  var previousHp = /* @__PURE__ */ new Map();
  var cardTypeLabels = { basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" };
  var cardColorMap = { red: "#ff667f", blue: "#6ecdf2", green: "#65dda3", gold: "#f5c66a", violet: "#9d7df2", cyan: "#6be1ea", orange: "#f29a5b" };
  var targetLabels = { self: "\u81EA\u8EAB", enemy: "\u654C\u65B9", ally: "\u53CB\u65B9", marked: "\u68CB\u5B50\u76EE\u6807", illusion: "\u5E7B\u8C61\u76EE\u6807", swapMarked: "\u5929\u624B\u529B\u6807\u8BB0", scouted: "\u767D\u773C\u9501\u5B9A" };
  var slotLabels = { weapon: "\u6B66\u5668\u69FD", armor: "\u9632\u5177\u69FD", charm: "\u9970\u54C1\u69FD" };
  var strategyKindLabels = { instant: "\u5373\u65F6\u7B56\u7565", plot: "\u6697\u7F6E\u4F0F\u7B14", response: "\u54CD\u5E94\u7B56\u7565" };
  var predictionRoleIds = ["loyal", "rebel", "lone"];
  function artMarkup(card, className, alt = "") {
    const path = cardArtPath(card.id);
    return path ? `<span class="${className}"><img src="${path}" alt="${alt}" draggable="false" decoding="async"></span>` : `<span class="${className} generated-art" aria-label="${alt}"><i>${card.icon}</i><b>${card.strategyKind === "plot" ? "PLOT" : card.type === "equipment" ? "GEAR" : card.type === "strategy" ? "TACTIC" : "BASIC"}</b></span>`;
  }
  function cardRuleText(card) {
    return card.fullDescription || card.description;
  }
  function hpPips(player, className = "") {
    const current = Math.max(0, player.hp);
    const hearts = Array.from({ length: player.maxHp }, (_, index) => `<i class="${index < current ? "full" : "empty"}" aria-hidden="true">${index < current ? "\u2665" : "\u2661"}</i>`).join("");
    return `<span class="hp-pips ${className}" role="img" aria-label="\u4F53\u529B ${current}/${player.maxHp}" title="\u4F53\u529B ${current}/${player.maxHp}">${hearts}</span>`;
  }
  function dreamBadge(player, character) {
    if (!character?.dream || !player?.dreamState) return "";
    const state = player.dreamState;
    return `<span class="dream-badge ${state.awakened ? "dream-awakened" : ""}" title="\u68A6\u60F3\uFF1A${character.dream.name}">${state.awakened ? "\u89C9\u9192" : `\u822A\u8FF9 ${state.progress}/3`}</span>`;
  }
  function cardTags(card) {
    const tags = [cardTypeLabels[card.type], `\u6807\u51C6 \xD7${deckProfiles.standard144[card.id]}`, `\u7CBE\u7B80 \xD7${deckProfiles.compact80[card.id]}`];
    if (card.strategyKind) tags.push(strategyKindLabels[card.strategyKind]);
    if (card.responseOnly) tags.push("\u4EC5\u54CD\u5E94\u7A97\u53E3\u4F7F\u7528");
    if (card.slot) tags.push(slotLabels[card.slot]);
    return tags;
  }
  function characterSkillEntries(character) {
    const active = activeSkills[character.id];
    return [
      { name: active.name, kind: "\u4E3B\u52A8\u6280", meta: `${active.costText} \xB7 ${targetLabels[active.target] || "\u6307\u5B9A\u76EE\u6807"}`, text: active.text, icon: "\u52A8", active: true },
      ...character.skills.map((skill) => ({ name: skill.name, kind: "\u89D2\u8272\u7279\u6027", meta: "\u6301\u7EED\u751F\u6548", text: skill.text, icon: "\u5E38" })),
      { name: character.signature.name, kind: "\u62DB\u724C\u6280", meta: `${character.signature.cost} \u80FD\u91CF \xB7 ${targetLabels[character.signature.target] || "\u6307\u5B9A\u76EE\u6807"}`, text: character.signature.text, icon: "\u5965", signature: true }
    ];
  }
  function renderLobby() {
    modeList.innerHTML = modes.map((mode) => `
    <article class="mode-card ${mode.id === selectedMode ? "selected" : ""}" data-mode="${mode.id}" style="--accent:var(--${mode.accent})">
      <span class="tag">${mode.badge}</span><h3>${mode.name}</h3><b>${mode.label}</b><p>${mode.description}</p>
    </article>`).join("");
    const series = [...new Set(characters.map((character) => character.series))];
    const seriesOptions = ["all", ...series];
    seriesFilters.innerHTML = seriesOptions.map((seriesId) => {
      const count = seriesId === "all" ? characters.length : characters.filter((character) => character.series === seriesId).length;
      const label = seriesId === "all" ? "\u5168\u90E8\u4F5C\u54C1" : seriesId;
      return `<button type="button" data-series="${seriesId}" class="${selectedSeries === seriesId ? "selected" : ""}" aria-pressed="${selectedSeries === seriesId}"><span>${label}</span><b>${count}</b></button>`;
    }).join("");
    const visibleCharacters = selectedSeries === "all" ? characters : characters.filter((character) => character.series === selectedSeries);
    characterList.innerHTML = visibleCharacters.map((character) => `
    <button class="character-choice ${character.id === selectedCharacter ? "selected" : ""}" data-character="${character.id}" style="--char:${character.color}" aria-pressed="${character.id === selectedCharacter}">
      <span class="role-chip">${character.role}</span>${character.pack ? `<span class="pack-chip">${character.pack}</span>` : ""}<span class="choice-avatar"><img src="${portraitPath(character.id)}" alt="${character.name}\u7ACB\u7ED8"></span>
      <h4>${character.name}</h4><p>${character.series}</p><small>\u4F53\u529B ${character.hp} \xB7 \u624B\u724C ${character.handLimit}</small>
    </button>`).join("");
    renderCharacterPreview(selectedCharacter);
    renderResumePanel();
  }
  function renderResumePanel() {
    const panel = $("#resumePanel"), copy = $("#resumeCopy"), continueButton = $("#continueGameButton");
    if (!panel || !copy || !continueButton) return;
    const inspected = inspectSavedMatch();
    panel.hidden = !inspected.exists;
    if (!inspected.exists) return;
    continueButton.disabled = !inspected.valid;
    if (!inspected.valid) {
      copy.textContent = `\u5B58\u6863\u65E0\u6CD5\u8BFB\u53D6\uFF1A${inspected.reason || "\u5185\u5BB9\u5DF2\u635F\u574F"}`;
      return;
    }
    const { save } = inspected;
    const mode = modes.find((item) => item.id === save.config.modeId);
    const character = getCharacter(save.config.humanCharacterId);
    const when = save.savedAt ? new Date(save.savedAt).toLocaleString("zh-CN", { hour12: false }) : "\u672A\u77E5\u65F6\u95F4";
    copy.textContent = `${mode?.name || save.config.modeId} \xB7 ${character?.name || save.config.humanCharacterId} \xB7 \u7B2C${save.stateDigest?.round || 1}\u8F6E \xB7 ${when}`;
  }
  seriesFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-series]");
    if (!button) return;
    selectedSeries = button.dataset.series;
    const current = getCharacter(selectedCharacter);
    if (selectedSeries !== "all" && current?.series !== selectedSeries) selectedCharacter = characters.find((character) => character.series === selectedSeries)?.id || selectedCharacter;
    renderLobby();
  });
  function renderCharacterPreview(characterId) {
    const character = getCharacter(characterId);
    if (!character) return;
    const skillCards = characterSkillEntries(character);
    characterPreview.style.setProperty("--char", character.color);
    characterPreview.innerHTML = `
    <div class="preview-portrait"><img src="${portraitPath(character.id)}" alt="${character.name}\u6280\u80FD\u9884\u89C8\u7ACB\u7ED8"></div>
    <div class="preview-content">
      <div class="preview-heading"><div><span>${character.series}${character.pack ? ` \xB7 \u6269\u5C55\u5305\u300C${character.pack}\u300D` : ""}</span><h3>${character.name}</h3></div><div class="preview-stats"><b>${character.role}</b><span>\u4F53\u529B ${character.hp}</span><span>\u624B\u724C\u4E0A\u9650 ${character.handLimit}</span></div></div>
      <div class="preview-skills">${skillCards.map((skill) => `<article><i>${skill.icon}</i><div><small>${skill.kind} \xB7 ${skill.meta}</small><h4>${skill.name}</h4><p>${skill.text}</p></div></article>`).join("")}</div>
    </div>`;
  }
  function renderCardCodex() {
    const standard = deckProfiles.standard144, compact = deckProfiles.compact80;
    const filters = [
      ["all", "\u5168\u90E8", Object.keys(cardDefinitions).length],
      ["basic", "\u57FA\u7840\u724C", Object.values(cardDefinitions).filter((card) => card.type === "basic").length],
      ["strategy", "\u7B56\u7565\u724C", Object.values(cardDefinitions).filter((card) => card.type === "strategy").length],
      ["equipment", "\u88C5\u5907\u724C", Object.values(cardDefinitions).filter((card) => card.type === "equipment").length]
    ];
    $("#codexFilters").innerHTML = filters.map(([id, label, count]) => `<button data-codex-filter="${id}" class="${codexFilter === id ? "selected" : ""}" aria-pressed="${codexFilter === id}">${label}<span>${count}</span></button>`).join("");
    const cards = Object.values(cardDefinitions).filter((card) => codexFilter === "all" || card.type === codexFilter);
    if (!cards.some((card) => card.id === selectedCodexCard)) selectedCodexCard = cards[0]?.id;
    $("#codexGrid").innerHTML = cards.map((card) => `<button class="codex-card ${selectedCodexCard === card.id ? "selected" : ""}" data-codex-card="${card.id}" style="--card:${cardColorMap[card.color] || "#aaa"}" aria-pressed="${selectedCodexCard === card.id}">
    ${artMarkup(card, "codex-art", `${card.name}\u5361\u9762`)}
    <span class="codex-card-copy"><small>${cardTypeLabels[card.type]}</small><b>${card.name}</b><em>${standard[card.id]}/${compact[card.id]}</em></span>
  </button>`).join("");
    renderCodexDetail(selectedCodexCard);
  }
  function renderCodexDetail(cardId) {
    const card = cardDefinitions[cardId];
    if (!card) return;
    const tags = cardTags(card);
    $("#codexDetail").style.setProperty("--card", cardColorMap[card.color] || "#aaa");
    $("#codexDetail").innerHTML = `${artMarkup(card, "codex-detail-art", `${card.name}\u5361\u9762`)}
    <div class="codex-detail-copy"><span class="codex-glyph">${card.icon}</span><p class="eyebrow">${cardTypeLabels[card.type]}</p><h3>${card.name}</h3><div class="codex-tags">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div><p>${cardRuleText(card)}</p></div>`;
  }
  modeList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-mode]");
    if (!card) return;
    selectedMode = card.dataset.mode;
    renderLobby();
  });
  characterList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-character]");
    if (!card) return;
    selectedCharacter = card.dataset.character;
    renderLobby();
  });
  characterList.addEventListener("mouseover", (event) => {
    const card = event.target.closest("[data-character]");
    if (card) renderCharacterPreview(card.dataset.character);
  });
  characterList.addEventListener("focusin", (event) => {
    const card = event.target.closest("[data-character]");
    if (card) renderCharacterPreview(card.dataset.character);
  });
  characterList.addEventListener("mouseleave", () => renderCharacterPreview(selectedCharacter));
  $("#startButton").addEventListener("click", () => startGame());
  $("#backButton").addEventListener("click", returnLobby);
  $("#continueGameButton").addEventListener("click", continueSavedGame);
  $("#discardSaveButton").addEventListener("click", () => {
    if (!window.confirm("\u786E\u5B9A\u653E\u5F03\u8FD9\u573A\u672A\u7ED3\u675F\u7684\u5BF9\u5C40\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002")) return;
    discardSavedMatch();
    renderResumePanel();
  });
  $("#rulesButton").addEventListener("click", () => rulesDialog.showModal());
  $("#cardCodexButton").onclick = () => {
    try {
      cardCodexDialog.showModal();
    } catch {
      cardCodexDialog.setAttribute("open", "");
    }
  };
  $("#gameRulesButton").addEventListener("click", () => rulesDialog.showModal());
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
  $("#codexFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-codex-filter]");
    if (!button) return;
    codexFilter = button.dataset.codexFilter;
    renderCardCodex();
  });
  $("#codexGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-codex-card]");
    if (!button) return;
    selectedCodexCard = button.dataset.codexCard;
    renderCardCodex();
  });
  function startGame(force = false) {
    if (!force && inspectSavedMatch().exists && !window.confirm("\u5F00\u59CB\u65B0\u5BF9\u5C40\u4F1A\u8986\u76D6\u73B0\u6709\u5B58\u6863\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F")) return;
    clearTimeout(aiTimer);
    discardSavedMatch();
    lastMode = { modeId: selectedMode, humanCharacterId: selectedCharacter };
    gameSession = new GameSession({ config: lastMode });
    engine = gameSession.engine;
    gameSession.saveNow();
    previousHp = new Map(engine.players.map((player) => [player.id, player.hp]));
    selectedCard = null;
    selectingSignature = false;
    selectingActive = false;
    discardSelection = /* @__PURE__ */ new Set();
    activeDiscardPromptId = null;
    inspectedPlayerId = null;
    inspectedCardUid = null;
    identityPredictions = /* @__PURE__ */ new Map();
    if (discardDialog.open) discardDialog.close();
    if (choiceDialog.open) choiceDialog.close();
    if (playerDetailDialog.open) playerDetailDialog.close();
    if (cardDetailDialog.open) cardDetailDialog.close();
    toggleIntel(false);
    lobby.classList.add("hidden");
    game.classList.remove("hidden");
    renderGame();
    continueFlow();
  }
  function continueSavedGame() {
    clearTimeout(aiTimer);
    try {
      const restored = restoreSavedMatch();
      gameSession = restored.session;
      engine = gameSession.engine;
      lastMode = { ...restored.save.config };
      selectedMode = lastMode.modeId;
      selectedCharacter = lastMode.humanCharacterId;
      identityPredictions = new Map(restored.save.ui?.identityPredictions || []);
      previousHp = new Map(engine.players.map((player) => [player.id, player.hp]));
      selectedCard = null;
      selectingSignature = false;
      selectingActive = false;
      discardSelection = /* @__PURE__ */ new Set();
      activeDiscardPromptId = null;
      lobby.classList.add("hidden");
      game.classList.remove("hidden");
      renderGame();
      continueFlow(320);
    } catch (error) {
      window.alert(`\u65E0\u6CD5\u6062\u590D\u5BF9\u5C40\uFF1A${error?.message || "\u672A\u77E5\u9519\u8BEF"}`);
      renderResumePanel();
    }
  }
  function returnLobby() {
    clearTimeout(aiTimer);
    if (resultDialog.open) resultDialog.close();
    if (responseDialog.open) responseDialog.close();
    if (discardDialog.open) discardDialog.close();
    if (choiceDialog.open) choiceDialog.close();
    inspectedPlayerId = null;
    if (playerDetailDialog.open) playerDetailDialog.close();
    inspectedCardUid = null;
    if (cardDetailDialog.open) cardDetailDialog.close();
    engine = null;
    gameSession = null;
    previousHp = /* @__PURE__ */ new Map();
    discardSelection = /* @__PURE__ */ new Set();
    activeDiscardPromptId = null;
    inspectedPlayerId = null;
    identityPredictions = /* @__PURE__ */ new Map();
    toggleIntel(false);
    game.classList.add("hidden");
    lobby.classList.remove("hidden");
    renderLobby();
  }
  function runGameCommand(method, ...args) {
    if (!gameSession) return engine?.[method]?.(...args);
    const result = gameSession.execute(method, ...args);
    if (gameSession.engine.winner) gameSession.clear();
    return result;
  }
  function saveUiState() {
    gameSession?.updateUi({ identityPredictions: [...identityPredictions.entries()] });
  }
  function continueFlow(delay = 520) {
    clearTimeout(aiTimer);
    if (!engine || engine.winner) return showResult();
    if (playerDetailDialog.open || cardDetailDialog.open) return;
    if (engine.pendingChoice) return showChoice();
    if (engine.pendingDiscard) return showDiscard();
    if (engine.pendingResponse) return showResponse();
    if (runGameCommand("advancePastEliminatedCurrent")) {
      renderGame();
      return continueFlow(delay);
    }
    const current = engine.player(engine.currentPlayerId);
    if (!current?.human) aiTimer = setTimeout(runAI, delay);
  }
  function runAI() {
    if (!engine || engine.winner || engine.pendingResponse || engine.pendingDiscard || engine.pendingChoice) return continueFlow();
    const current = engine.player(engine.currentPlayerId);
    if (!current || current.human) return;
    const result = runGameCommand("aiStep", current.id);
    renderGame();
    if (engine.pendingResponse || engine.pendingDiscard || engine.pendingChoice || engine.winner) return continueFlow();
    if (result.acted) continueFlow(430);
    else {
      runGameCommand("endTurn", current.id);
      renderGame();
      continueFlow(620);
    }
  }
  function renderGame() {
    if (!engine) return;
    const inferredDamage = engine.players.map((player) => ({
      playerId: player.id,
      amount: Math.max(0, (previousHp.get(player.id) ?? player.hp) - player.hp)
    })).filter((event) => event.amount > 0);
    const queuedDamage = (engine.consumeVisualEvents?.() || []).filter((event) => event.type === "damage");
    const damageByPlayer = /* @__PURE__ */ new Map();
    for (const event of queuedDamage) damageByPlayer.set(event.playerId, (damageByPlayer.get(event.playerId) || 0) + event.amount);
    for (const event of inferredDamage) if (!damageByPlayer.has(event.playerId)) damageByPlayer.set(event.playerId, event.amount);
    const damageEvents = [...damageByPlayer].map(([playerId, amount]) => ({ playerId, amount }));
    const human = engine.players.find((player) => player.human);
    const current = engine.player(engine.currentPlayerId);
    $("#modeName").textContent = `${engine.mode.name} \xB7 ${engine.mode.label}`;
    $("#roundTitle").textContent = `\u7B2C ${engine.round} \u8F6E`;
    $("#phaseText").textContent = engine.winner ? "\u5BF9\u5C40\u7ED3\u675F" : engine.pendingStrategySequence ? `${engine.pendingStrategySequence.cardName}\u7ED3\u7B97\u4E2D` : engine.pendingChoice ? "\u7B49\u5F85\u6218\u672F\u51B3\u7B56" : engine.pendingDiscard ? "\u4F60\u7684\u5F03\u724C\u9636\u6BB5" : current?.human ? "\u4F60\u7684\u51FA\u724C\u9636\u6BB5" : `${engine.nameOf(current)}\u6B63\u5728\u884C\u52A8`;
    $("#turnOwner").textContent = current ? `${engine.nameOf(current)}\u7684\u56DE\u5408` : "\u7B49\u5F85\u5BF9\u5C40";
    $("#turnHint").textContent = getTurnHint(current, human);
    $("#turnMark").textContent = engine.characterOf(current)?.glyph || "\u754C";
    $("#deckCount").textContent = engine.deck.length;
    $("#discardCount").textContent = engine.discard.length;
    for (const player of engine.players) if (player.revealed || !player.alive) identityPredictions.delete(player.id);
    const targetIds = getActiveTargets();
    $("#opponents").dataset.players = engine.mode.playerCount;
    $("#opponents").innerHTML = engine.players.filter((player) => !player.human).map((player) => playerCardTemplate(player, targetIds.includes(player.id))).join("");
    $("#playerArea").innerHTML = playerAreaTemplate(human);
    renderIntel(human);
    renderLog();
    bindDynamicEvents();
    if (playerDetailDialog.open && inspectedPlayerId) renderPlayerDetail(inspectedPlayerId);
    previousHp = new Map(engine.players.map((player) => [player.id, player.hp]));
    playDamageEffects(damageEvents);
  }
  function playDamageEffects(events) {
    for (const { playerId, amount } of events) {
      const card = document.querySelector(`[data-player="${playerId}"]`);
      if (!card) continue;
      card.classList.remove("taking-damage");
      void card.offsetWidth;
      card.classList.add("taking-damage");
      const number = document.createElement("span");
      number.className = "damage-number";
      number.textContent = `-${amount}`;
      number.setAttribute("aria-label", `\u53D7\u5230${amount}\u70B9\u4F24\u5BB3`);
      card.append(number);
      window.setTimeout(() => {
        card.classList.remove("taking-damage");
        number.remove();
      }, 900);
    }
  }
  function getTurnHint(current, human) {
    if (engine.pendingStrategySequence) {
      const sequence = engine.pendingStrategySequence;
      if (sequence.kind === "mass") return `${sequence.cardName} \xB7 ${engine.nameOf(sequence.currentTargetId)}\u54CD\u5E94 \xB7 \u5269\u4F59${sequence.remaining}\u540D`;
      return `${sequence.cardName} \xB7 ${engine.nameOf(sequence.currentTargetId)}\u8FDB\u884C\u7B2C${sequence.current}\u6B21\u4EA4\u950B`;
    }
    if (engine.pendingChoice) return engine.pendingChoice.title;
    if (engine.pendingDiscard) return `\u5F03\u724C\u9636\u6BB5 \xB7 \u8BF7\u9009\u62E9${engine.pendingDiscard.count}\u5F20\u624B\u724C`;
    if (!current?.human) return "\u6218\u672F AI \u6B63\u5728\u601D\u8003";
    if (selectingSignature) return "\u5DF2\u9009\u62E9\u62DB\u724C\u6280 \xB7 \u70B9\u51FB\u53D1\u5149\u76EE\u6807";
    if (selectingActive) return "\u5DF2\u9009\u62E9\u4E3B\u52A8\u6280 \xB7 \u70B9\u51FB\u53D1\u5149\u76EE\u6807";
    if (selectedCard) {
      const card = human.hand.find((item) => item.uid === selectedCard);
      return card ? `\u5DF2\u9009\u62E9\u3010${card.name}\u3011 \xB7 \u70B9\u51FB\u53D1\u5149\u76EE\u6807` : "\u70B9\u51FB\u624B\u724C\u9009\u62E9\u884C\u52A8";
    }
    return "\u70B9\u51FB\u624B\u724C\u9009\u62E9\u884C\u52A8";
  }
  function playerCardTemplate(player, targetable = false) {
    const character = engine.characterOf(player), role = engine.roleOf(player);
    const showRole = player.revealed || engine.mode.id === "ranked2v2" || !player.alive;
    const prediction = engine.mode.id === "classic8" && !showRole ? identityPredictions.get(player.id) : null;
    const shownRole = showRole ? role : prediction ? roles[prediction] : null;
    const identityLabel = showRole ? role.name : prediction ? `\u9884\u6D4B\xB7${roles[prediction].name}` : "\u8EAB\u4EFD?";
    const equipment = player.equipment;
    const plots = engine.getVisiblePlots(engine.players.find((item) => item.human)?.id, player.id);
    const chessMarks = engine.players.filter((owner) => owner.chessTargetId === player.id).length;
    const position = tableSeatPosition(engine.mode.playerCount, player.seat);
    return `<article class="player-card ${player.id === engine.currentPlayerId ? "current" : ""} ${targetable ? "targetable" : ""} ${engine.pendingStrategySequence?.currentTargetId === player.id ? "strategy-focus" : ""} ${!player.alive ? "dead" : ""}" data-player="${player.id}" style="--char:${character.color};--role-color:var(--${shownRole?.color || "muted"});--seat-x:${position.x}%;--seat-y:${position.y}%">
    <span class="portrait"><img src="${portraitPath(character.id)}" alt="${character.name}\u7ACB\u7ED8"></span><span class="seat">${player.seat + 1}</span><span class="identity-dot ${prediction ? "predicted" : ""}">${identityLabel}</span>${player.id === engine.currentPlayerId ? `<span class="turn-badge">\u884C\u52A8\u4E2D</span>` : ""}${targetable ? `<span class="target-badge">\u53EF\u9009\u62E9</span>` : ""}
    <h4>${character.name} ${dreamBadge(player, character)}</h4>
    <div class="stat-row"><span>\u2665 ${player.hp}/${player.maxHp}</span><span>\u724C ${player.hand.length}</span></div>
    ${hpPips(player, "seat-hp")}
    <div class="energy-bar" style="--value:${player.energy / player.maxEnergy * 100}%"><i></i></div>
    <div class="equipment-mini"><i class="${equipment.weapon ? "on" : ""}">\u5203</i><i class="${equipment.armor ? "on" : ""}">\u7532</i><i class="${equipment.charm ? "on" : ""}">\u6838</i>${player.poison ? `<i class="on">\u6BD2${player.poison}</i>` : ""}${plots.length ? `<i class="on plot-count">\u4F0F${plots.length}</i>` : ""}${player.specialCards.length ? `<i class="on special-count">\u672F${player.specialCards.length}</i>` : ""}${player.sealedCards.length ? `<i class="on sealed-count">\u5C01${player.sealedCards.length}</i>` : ""}${chessMarks ? `<i class="on chess-count">\u68CB</i>` : ""}</div>
    <button type="button" class="player-detail-button" data-inspect-player="${player.id}" aria-label="\u67E5\u770B${character.name}\u7684\u6280\u80FD\u4E0E\u72B6\u6001" title="\u67E5\u770B\u6280\u80FD\u4E0E\u72B6\u6001">\u8BE6\u60C5</button>
  </article>`;
  }
  function playerAreaTemplate(player) {
    const character = engine.characterOf(player);
    const isTurn = engine.currentPlayerId === player.id && !engine.winner;
    const canPlayHand = isTurn && !engine.pendingResponse && !engine.pendingDiscard && !engine.pendingChoice;
    const hand = player.hand.map((card) => {
      const selected = selectedCard === card.uid;
      return `<div class="hand-card-shell ${selected ? "selected" : ""} ${canPlayHand ? "playable" : ""}" style="--card:${cardColorMap[card.color] || "#aaa"}">
      <button type="button" class="hand-card ${selected ? "selected" : ""} ${card.responseOnly ? "response-only" : ""}" data-card="${card.uid}" ${!canPlayHand ? "disabled" : ""}>
        ${artMarkup(card, "hand-art")}
        <span class="hand-icon">${card.icon}</span><span class="card-type">${card.type === "basic" ? "\u57FA\u7840" : card.type === "strategy" ? "\u7B56\u7565" : "\u88C5\u5907"}</span>
        <span class="hand-copy"><h4>${card.name}</h4><p>${card.description}</p></span>
      </button>
      <button type="button" class="card-detail-trigger hand-detail-trigger" data-card-detail="${card.uid}" aria-label="\u653E\u5927\u67E5\u770B${card.name}" title="\u67E5\u770B\u5B8C\u6574\u89C4\u5219">\u2315</button>
    </div>`;
    }).join("");
    const slots = [
      ["weapon", "\u6B66\u5668", "\u5203", "\u653B\u51FB\u8DDD\u79BB +1"],
      ["armor", "\u9632\u5177", "\u7532", "\u6BCF\u8F6E\u9996\u6B21\u653B\u51FB\u4F24\u5BB3 -1"],
      ["charm", "\u9970\u54C1", "\u6838", "\u56DE\u5408\u989D\u5916\u83B7\u5F971\u80FD\u91CF"]
    ];
    const equipment = slots.map(([slot, label, icon, fallback]) => {
      const item = player.equipment[slot];
      return `<div class="self-equip-slot ${item ? "equipped" : ""}"><i>${icon}</i><span><small>${label}</small><b>${item?.name || "\u672A\u88C5\u5907"}</b><em>${item?.description || fallback}</em></span></div>`;
    }).join("");
    const plots = engine.getVisiblePlots(player.id, player.id);
    const plotTray = plots.length ? `<div class="self-plots">${plots.map((plot) => `<span title="${plot.card.name} \u2192 ${engine.nameOf(plot.targetId)}"><i>${plot.card.icon}</i><b>${plot.card.name}</b></span>`).join("")}</div>` : "";
    const specialTray = player.specialCards.length || player.sealedCards.length ? `<div class="self-specials">${player.specialCards.map((item) => item.kind === "lie" ? `<span class="lie" title="\u672A\u77E5\u8C0E\u8A00 \u2192 ${engine.nameOf(item.targetId)}"><i>\u8C0E</i><b>\u672A\u77E5\u8C0E\u8A00</b></span>` : `<span title="${item.kind === "clone" ? "\u5F71\u5206\u8EAB" : "\u767E\u8C6A\u724C"} \xB7 ${item.card.name}"><i>${item.kind === "clone" ? "\u5206" : "\u5370"}</i><b>${item.card.name}</b></span>`).join("")}${player.sealedCards.map((item) => `<span class="sealed" title="\u88AB\u6708\u8BFB\u5C01\u5B58\uFF1A${item.card.name}"><i>\u5C01</i><b>${item.card.name}</b></span>`).join("")}</div>` : "";
    return `<div class="self-summary ${engine.pendingStrategySequence?.currentTargetId === player.id ? "strategy-focus" : ""}" data-player="${player.id}" style="--char:${character.color}"><span class="mini-avatar"><img src="${portraitPath(character.id)}" alt="${character.name}\u7ACB\u7ED8"></span><div><h3>${character.name} ${dreamBadge(player, character)}</h3><p>${character.series} \xB7 ${character.role}</p><span class="stat-row"><b>\u2665 ${player.hp}/${player.maxHp}</b><b>\u25C6 ${player.energy}/${player.maxEnergy}</b><b>\u724C ${player.hand.length}/${engine.handLimit(player.id)}</b></span>${hpPips(player, "self-hp")}</div><button type="button" class="self-detail-button" data-inspect-player="${player.id}" aria-label="\u67E5\u770B\u81EA\u5DF1\u7684\u72B6\u6001\u4E0E\u6280\u80FD">\u72B6\u6001\u4E0E\u6280\u80FD</button></div><div class="self-equipment">${equipment}</div>${plotTray}${specialTray}<div class="hand">${hand || `<p style="color:var(--muted);font-size:11px">\u6682\u65E0\u624B\u724C</p>`}</div>`;
  }
  function playerStatusItems(player) {
    const items = [];
    const add = (label, text, tone = "") => items.push({ label, text, tone });
    if (!player.alive) add("\u5DF2\u9000\u573A", "\u8BE5\u89D2\u8272\u5DF2\u79BB\u5F00\u6218\u5C40", "danger");
    else if (player.id === engine.currentPlayerId) add("\u884C\u52A8\u4E2D", `\u672C\u56DE\u5408\u653B\u51FB ${player.attacksUsed}/${player.attackLimit}`, "active");
    else add("\u5B58\u6D3B", "\u7B49\u5F85\u81EA\u5DF1\u7684\u884C\u52A8\u56DE\u5408", "normal");
    if (player.shield > 0) add("\u62A4\u76FE", `\u53EF\u62B5\u6D88 ${player.shield} \u70B9\u4F24\u5BB3`, "buff");
    if (player.poison > 0) add("\u6BD2\u7D20", `${player.poison}\u5C42\uFF0C\u56DE\u5408\u7ED3\u675F\u5931\u53BB\u4F53\u529B`, "danger");
    if (player.frozenDraw > 0) add("\u51BB\u7ED3", `\u4E0B\u56DE\u5408\u5C11\u6478 ${player.frozenDraw} \u5F20\u724C`, "danger");
    if (player.skipOffense) add("\u767D\u971E\u7F5A", "\u672C\u56DE\u5408\u4E0D\u80FD\u4F7F\u7528\u653B\u51FB\u548C\u7B56\u7565\u724C", "danger");
    if (player.dying) add("\u91CD\u4F24", "\u6B63\u5728\u7B49\u5F85\u5176\u4ED6\u89D2\u8272\u6551\u63F4", "danger");
    if (player.signatureLocked > 0) add("\u62DB\u724C\u6280\u5C01\u5B58", "\u76F4\u5230\u4E0B\u4E2A\u56DE\u5408\u7ED3\u675F\u65E0\u6CD5\u91CA\u653E", "danger");
    if (player.contractHpLoss > 0) add("\u7206\u53D1\u5951\u7EA6", `\u4E0B\u56DE\u5408\u7ED3\u675F\u5931\u53BB ${player.contractHpLoss} \u4F53\u529B`, "danger");
    if (player.rangeInfinite) add("\u65E0\u9650\u8DDD\u79BB", "\u672C\u56DE\u5408\u653B\u51FB\u8DDD\u79BB\u65E0\u9650", "buff");
    if (player.turnFlags.rangeBonus) add("\u8DDD\u79BB\u5F3A\u5316", `\u672C\u56DE\u5408\u653B\u51FB\u8DDD\u79BB +${player.turnFlags.rangeBonus}`, "buff");
    if (player.turnFlags.nextAttackPoison) add("\u6BD2\u5203\u6D82\u5E03", "\u4E0B\u4E00\u6B21\u653B\u51FB\u9644\u52A0\u6BD2\u7D20", "buff");
    if (player.turnFlags.nextAttackBonus) {
      const attackBuffNames = { naruto: "\u5F71\u5206\u8EAB\u84C4\u52BF", sakura: "\u602A\u529B\u84C4\u52BF", itachi: "\u6708\u8BFB\u524D\u5146", kakashi: "\u590D\u5236\u5F3A\u5316", yuji: "\u5F84\u5EAD\u62F3\u84C4\u52BF" };
      add(attackBuffNames[player.characterId] || "\u653B\u51FB\u5F3A\u5316", "\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3 +1", "buff");
    }
    if (player.turnFlags.nextAttackIgnoreArmor) add("\u6708\u8BFB\u524D\u5146", "\u4E0B\u4E00\u6B21\u653B\u51FB\u5FFD\u7565\u9632\u62A4\u88C5\u7532", "buff");
    if (player.turnFlags.copyNoIntervene) add("\u6218\u672F\u5224\u65AD", "\u4E0B\u4E00\u6B21\u7B56\u7565\u724C\u7684\u76EE\u6807\u4E0D\u80FD\u88AB\u5F3A\u5236\u4ECB\u5165", "buff");
    if (player.turnFlags.activeUsed && player.id === engine.currentPlayerId) add("\u4E3B\u52A8\u6280", "\u672C\u56DE\u5408\u5DF2\u53D1\u52A8", "used");
    if (player.equipment.armor) add("\u9632\u5177", player.armorReady ? "\u672C\u8F6E\u51CF\u4F24\u5C1A\u672A\u89E6\u53D1" : "\u672C\u8F6E\u51CF\u4F24\u5DF2\u7ECF\u89E6\u53D1", player.armorReady ? "buff" : "used");
    if (player.roundFlags.sandShield) add("\u7802\u4E4B\u76FE", "\u672C\u8F6E\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.observation) add("\u89C1\u95FB\u8272", "\u672C\u8F6E\u5DF2\u7ECF\u68C0\u5B9A", "used");
    if (player.roundFlags.infinity) add("\u65E0\u4E0B\u9650", "\u672C\u8F6E\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.substitute) add("\u66FF\u4EE3\u9632\u5FA1", "\u672C\u8F6E\u5DF2\u7ECF\u4F7F\u7528", "used");
    if (player.roundFlags.diagnosis) add("\u8BCA\u65AD", "\u672C\u8F6E\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.resolve) add("\u4E0D\u5C48\u5BB9\u5668", "\u672C\u8F6E\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.cover) add("\u6218\u672F\u63A9\u62A4", "\u672C\u8F6E\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.damageEnergy) add("\u9020\u6210\u4F24\u5BB3\u80FD\u91CF", "\u672C\u8F6E\u5956\u52B1\u5DF2\u7ECF\u83B7\u5F97", "used");
    if (player.roundFlags.hurtEnergy) add("\u53D7\u5230\u4F24\u5BB3\u80FD\u91CF", "\u672C\u8F6E\u5956\u52B1\u5DF2\u7ECF\u83B7\u5F97", "used");
    if (player.roundFlags.foresight) add("\u6218\u672F\u9884\u8BFB", "\u672C\u8F6E\u884C\u52A8\u540E\u79FB\u6548\u679C\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.chessPressure) add("\u5F71\u7F1D\u538B\u529B", "\u672C\u8F6E\u7684\u5F03\u724C\u68C0\u5B9A\u5DF2\u7ECF\u89E6\u53D1", "used");
    if (player.roundFlags.copyRecovery) add("\u67E5\u514B\u62C9\u56DE\u6536", "\u672C\u8F6E\u5DF2\u7ECF\u4ECE\u62F7\u8D1D\u724C\u83B7\u5F97\u80FD\u91CF", "used");
    if (player.turnFlags.shadowNeckTarget) add("\u5F71\u9996\u7F1A\u9888", `\u4E0B\u4E00\u6B21\u5BF9${engine.nameOf(player.turnFlags.shadowNeckTarget)}\u7684\u653B\u51FB\u65E0\u89C6\u8DDD\u79BB\u4E14\u4F24\u5BB3+1`, "buff");
    if (player.turnFlags.activeUsed) add("\u4E3B\u52A8\u6280", "\u672C\u56DE\u5408\u5DF2\u7ECF\u53D1\u52A8", "used");
    else if (player.id === engine.currentPlayerId) add("\u4E3B\u52A8\u6280", "\u672C\u56DE\u5408\u5C1A\u672A\u53D1\u52A8", "buff");
    if (player.plots.length) add("\u4F0F\u7B14\u533A", `${player.plots.length}/2 \u5F20\u6697\u7F6E\u7B56\u7565`, "buff");
    const clone = player.specialCards.find((item) => item.kind === "clone");
    const seals = player.specialCards.filter((item) => item.kind === "byakugo");
    if (clone) add("\u5F71\u5206\u8EAB", `\u7531\u3010${clone.card.name}\u3011\u6784\u6210\uFF0C\u53EF\u4F5C\u4E3A\u5E94\u53D8\u9632\u5FA1`, "buff");
    if (seals.length) add("\u767E\u8C6A\u724C", `${seals.length}/2 \xB7 ${seals.map((item) => cardTypeLabels[item.card.type]).join("\u3001")}`, "buff");
    if (player.byakugoMode) add("\u767E\u8C6A\u4E4B\u672F", "\u4FDD\u62A4\u8303\u56F4\u4E3A\u5168\u573A\uFF0C\u5404\u7C7B\u522B\u9996\u6B21\u89E3\u653E\u540E\u8FD4\u56DE\u624B\u724C", "buff");
    if (player.chessTargetId) add("\u68CB\u5B50", `\u5F53\u524D\u6807\u8BB0\uFF1A${engine.nameOf(player.chessTargetId)}`, "buff");
    if (player.swapMarkedId) add("\u5929\u624B\u529B\u8FFD\u730E", `\u5DF2\u6807\u8BB0\uFF1A${engine.nameOf(player.swapMarkedId)}`, "buff");
    if (player.sandMarkedBy) add("\u7802\u7011\u8FFD\u846C", `\u88AB${engine.nameOf(player.sandMarkedBy)}\u6807\u8BB0\uFF1B\u5176\u4E0B\u4E00\u6B21\u653B\u51FB\u65E0\u89C6\u8DDD\u79BB\u4E14\u4F24\u5BB3+1`, "danger");
    if (player.scoutedTargetId) add("\u767D\u773C\u9501\u5B9A", `\u6B63\u5728\u6D1E\u5BDF\uFF1A${engine.nameOf(player.scoutedTargetId)}`, "buff");
    const scoutedBy = engine.players.find((owner) => owner.scoutedTargetId === player.id && owner.alive);
    if (scoutedBy) add("\u88AB\u767D\u773C\u9501\u5B9A", `${engine.nameOf(scoutedBy)}\u6B63\u5728\u6D1E\u5BDF\u4F60\u7684\u624B\u724C\u4E0E\u4F0F\u7B14`, "danger");
    if (player.toadBindTargetId) add("\u86E4\u87C6\u53E3\u675F\u7F1A", `\u5DF2\u675F\u7F1A\uFF1A${engine.nameOf(player.toadBindTargetId)}\uFF0C\u5176\u9996\u6B21\u653B\u51FB\u6216\u7B56\u7565\u724C\u987B\u5F031\u5F20\u724C`, "danger");
    const toadBinder = engine.players.find((owner) => owner.alive && owner.characterId === "jiraiya" && owner.toadBindTargetId === player.id);
    if (toadBinder) add("\u88AB\u86E4\u87C6\u675F\u7F1A", `${engine.nameOf(toadBinder)}\u7684\u675F\u7F1A\u5C1A\u672A\u89E6\u53D1`, "danger");
    if (player.sageMarks) add("\u4ED9\u672F\u5370", `${player.sageMarks}/2 \xB7 \u653B\u51FB\u8DDD\u79BB+1${player.sageResonance ? " \xB7 \u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u4E14\u5FFD\u7565\u9632\u5177" : ""}`, "buff");
    if (player.sageResonance) add("\u4ED9\u672F\u5171\u9E23", "\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3+1\u5E76\u5FFD\u7565\u9632\u62A4\u88C5\u7532\uFF0C\u7ED3\u7B97\u540E\u6D88\u8017", "buff");
    if (player.curseSeal) add("\u5492\u5370\u5B9E\u9A8C", `\u4E0B\u4E00\u5F20${{ basic: "\u57FA\u7840", strategy: "\u7B56\u7565", equipment: "\u88C5\u5907" }[player.curseSeal.type]}\u724C\u53EF\u80FD\u88AB\u593A\u53D6`, "danger");
    if (player.curseResearchType) add("\u7981\u672F\u7814\u7A76", `\u7814\u7A76${{ basic: "\u57FA\u7840\u724C", strategy: "\u7B56\u7565\u724C", equipment: "\u88C5\u5907\u724C" }[player.curseResearchType]}\uFF1B\u4F7F\u7528\u540C\u7C7B\u724C\u65F6\u83B7\u5F971\u70B9\u80FD\u91CF`, "buff");
    const copies = player.hand.filter((card) => card._copiedBy === player.id).length;
    const spoils = player.hand.filter((card) => card._curseSpoil === player.id).length;
    if (copies) add("\u62F7\u8D1D\u724C", `${copies}\u5F20\uFF0C\u5C06\u5728\u672C\u56DE\u5408\u7ED3\u675F\u65F6\u6D88\u6563`, "buff");
    if (spoils) add("\u5B9E\u9A8C\u724C", `${spoils}\u5F20\uFF0C\u53EF\u4F9B\u86C7\u8715\u6216\u4E0D\u5C38\u8F6C\u751F\u4F7F\u7528`, "buff");
    const markedBy = engine.players.filter((owner) => owner.chessTargetId === player.id);
    if (markedBy.length) add("\u88AB\u843D\u5B50", `\u88AB${markedBy.map((owner) => engine.nameOf(owner)).join("\u3001")}\u6807\u8BB0`, "danger");
    if (player.sealedCards.length) add("\u6708\u8BFB\u5C01\u5B58", `${player.sealedCards.length}\u5F20\u624B\u724C\u6682\u65F6\u79BB\u5F00\u624B\u724C\u533A`, "danger");
    return items;
  }
  function plotTimingLabel(plot) {
    if (plot.effect === "checkmateTrap") return "\u516C\u5F00 \xB7 \u4E0B\u4E00\u5F20\u975E\u54CD\u5E94\u724C\u4F7F\u7528\u524D\u89E6\u53D1";
    if (plot.isFalse) return "\u865A\u5047\u4F0F\u7B14 \xB7 \u4F60\u7684\u4E0B\u56DE\u5408\u5F00\u59CB\u65F6\u8FD4\u56DE\u624B\u724C";
    if (plot.effect === "delayedCast") return "\u4F60\u7684\u4E0B\u56DE\u5408\u5F00\u59CB\u65F6\u89E6\u53D1";
    if (plot.effect === "echoScript") return plot.armed ? "\u672C\u56DE\u5408\u9996\u5F20\u57FA\u7840\u724C\u540E\u89E6\u53D1" : "\u4F60\u7684\u4E0B\u56DE\u5408\u751F\u6548\uFF0C\u56DE\u5408\u7ED3\u675F\u65F6\u5230\u671F";
    return "\u6301\u7EED\u81F3\u4F60\u7684\u4E0B\u56DE\u5408\u5F00\u59CB";
  }
  function plotRuleText(plot) {
    if (plot.effect === "checkmateTrap") return "\u76EE\u6807\u4E0B\u4E00\u6B21\u5C1D\u8BD5\u4F7F\u7528\u975E\u54CD\u5E94\u724C\u65F6\uFF0C\u53D6\u6D88\u8BE5\u724C\u5E76\u7ACB\u5373\u7ED3\u675F\u5176\u51FA\u724C\u9636\u6BB5\u3002";
    if (plot.isFalse) return "\u7531\u975E\u4F0F\u7B14\u724C\u4F2A\u88C5\u800C\u6210\uFF1B\u88AB\u53CD\u5236\u65F6\u9F2C\u83B7\u5F97\u80FD\u91CF\uFF0C\u672A\u88AB\u53CD\u5236\u5219\u5728\u9F2C\u4E0B\u56DE\u5408\u5F00\u59CB\u65F6\u8FD4\u56DE\u624B\u724C\u3002";
    return cardRuleText(plot.card);
  }
  function openPlayerDetail(playerId) {
    if (!engine?.player(playerId)) return;
    clearTimeout(aiTimer);
    inspectedPlayerId = playerId;
    renderPlayerDetail(playerId);
    if (!playerDetailDialog.open) playerDetailDialog.showModal();
  }
  function renderPlayerDetail(playerId) {
    const player = engine?.player(playerId);
    if (!player) return;
    const character = engine.characterOf(player), role = engine.roleOf(player);
    const human = engine.players.find((item) => item.human);
    const showRole = player.human || player.revealed || engine.mode.id === "ranked2v2" || !player.alive;
    const distance = player.alive && human?.alive ? engine.distance(human.id, player.id) : Infinity;
    const attackRange = player.alive ? engine.attackRange(player.id) : 0;
    const skills = characterSkillEntries(character);
    const statuses = playerStatusItems(player);
    const equipmentSlots = [
      ["weapon", "\u6B66\u5668", "\u5203", "\u653B\u51FB\u8DDD\u79BB +1"],
      ["armor", "\u9632\u5177", "\u7532", "\u6BCF\u8F6E\u9996\u6B21\u53D7\u5230\u7684\u653B\u51FB\u4F24\u5BB3 -1"],
      ["charm", "\u9970\u54C1", "\u6838", "\u56DE\u5408\u5F00\u59CB\u989D\u5916\u83B7\u5F971\u70B9\u80FD\u91CF"]
    ];
    const prediction = identityPredictions.get(player.id);
    const canPredict = engine.mode.id === "classic8" && !player.human && player.alive && !player.revealed;
    const predictionPanel = canPredict ? `<section class="detail-section prediction-panel">
    <div class="detail-section-heading"><div><p class="eyebrow">IDENTITY NOTE</p><h3>\u6211\u7684\u8EAB\u4EFD\u9884\u6D4B</h3></div><small>\u4EC5\u5728\u672C\u5C40\u672C\u5730\u8BB0\u5F55\uFF0C\u4E0D\u5F71\u54CDAI\u4E0E\u80DC\u8D1F</small></div>
    <div class="prediction-options">
      <button type="button" data-predict-role="unknown" class="${!prediction ? "selected" : ""}" aria-pressed="${!prediction}">\u672A\u5224\u65AD</button>
      ${predictionRoleIds.map((roleId) => `<button type="button" data-predict-role="${roleId}" class="${prediction === roleId ? "selected" : ""}" style="--prediction:var(--${roles[roleId].color})" aria-pressed="${prediction === roleId}">${roles[roleId].name}</button>`).join("")}
    </div>
    <p class="prediction-hint">\u7ECF\u5178\u519B\u516B\u8EAB\u4EFD\u6784\u6210\uFF1A1\u754C\u4E3B\u30012\u5B88\u62A4\u8005\u30014\u7834\u754C\u8005\u30011\u72EC\u884C\u8005\u3002\u754C\u4E3B\u59CB\u7EC8\u516C\u5F00\uFF0C\u56E0\u6B64\u4E0D\u5217\u5165\u9884\u6D4B\u3002</p>
  </section>` : "";
    const identityName = showRole ? role.name : "\u8EAB\u4EFD\u672A\u516C\u5F00";
    const identityCopy = showRole ? role.goal : "\u8EAB\u4EFD\u4ECD\u5904\u4E8E\u9690\u85CF\u72B6\u6001\uFF0C\u53EA\u80FD\u6839\u636E\u884C\u52A8\u548C\u5C40\u52BF\u81EA\u884C\u5224\u65AD\u3002";
    const viewerId = human?.id;
    const visiblePlots = engine.getVisiblePlots(viewerId, player.id);
    const plotSection = `<section class="detail-section"><div class="detail-section-heading"><div><p class="eyebrow">PLOT ZONE</p><h3>\u4F0F\u7B14\u533A ${visiblePlots.length}/2</h3></div><small>${viewerId === player.id ? "\u4F60\u53EF\u67E5\u770B\u81EA\u5DF1\u7684\u4F0F\u7B14" : "\u5BF9\u624B\u4F0F\u7B14\u4FDD\u6301\u6697\u7F6E"}</small></div><div class="detail-plot-list">${visiblePlots.length ? visiblePlots.map((plot) => `<article class="${plot.hidden ? "hidden-plot" : ""}"><i>${plot.hidden ? "?" : plot.card.icon}</i><div><b>${plot.hidden ? plot.name : plot.effect === "checkmateTrap" ? `\u5C06\u519B\xB7${plot.card.name}` : plot.isFalse ? `\u5E7B\u8C61\xB7${plot.card.name}` : plot.card.name}</b><span>\u76EE\u6807\uFF1A${engine.nameOf(plot.targetId)}${plot.hidden ? "" : ` \xB7 ${plotTimingLabel(plot)}`}</span><p>${plot.hidden ? "\u540D\u79F0\u3001\u6548\u679C\u4E0E\u6301\u7EED\u65F6\u95F4\u672A\u77E5" : plotRuleText(plot)}</p></div></article>`).join("") : `<p class="empty-plots">\u5F53\u524D\u6CA1\u6709\u4F0F\u7B14</p>`}</div></section>`;
    const specialCards = player.specialCards.map((item) => item.kind === "lie" && !player.human ? { icon: "\u8C0E", name: "\u672A\u77E5\u8C0E\u8A00", copy: `\u76EE\u6807\uFF1A${engine.nameOf(item.targetId)}\uFF1B\u724C\u9762\u4E0E\u89E6\u53D1\u6761\u4EF6\u4EC5\u8BBE\u7F6E\u8005\u53EF\u89C1\u3002` } : { icon: item.kind === "clone" ? "\u5206" : item.kind === "lie" ? "\u8C0E" : "\u5370", name: item.kind === "clone" ? `\u5F71\u5206\u8EAB\xB7${item.card.name}` : item.kind === "lie" ? `\u8C0E\u8A00\xB7${item.card.name}` : `\u767E\u8C6A\xB7${item.card.name}`, copy: item.kind === "clone" ? "\u53EF\u4F5C\u4E3A\u5E94\u53D8\u7528\u4E8E\u9632\u5FA1\uFF0C\u6D88\u8017\u540E\u83B7\u5F971\u70B9\u80FD\u91CF\u3002" : item.kind === "lie" ? `\u6307\u5B9A\u76EE\u6807\uFF1A${engine.nameOf(item.targetId)}\uFF1B\u5176\u4E0B\u4E00\u5F20\u975E\u54CD\u5E94\u724C\u4F1A\u89E6\u53D1\u68C0\u5B9A\u3002` : `${cardTypeLabels[item.card.type]}\uFF1A${item.card.description}` });
    const sealedCards = player.sealedCards.map((item) => ({ icon: "\u5C01", name: `\u6708\u8BFB\u5C01\u5B58\xB7${item.card.name}`, copy: `\u7531${engine.nameOf(item.sealedBy)}\u5C01\u5B58\uFF0C\u76F4\u5230\u5176\u4E0B\u56DE\u5408\u5F00\u59CB\u3002` }));
    const specialSection = specialCards.length || sealedCards.length ? `<section class="detail-section"><div class="detail-section-heading"><div><p class="eyebrow">SPECIAL ZONE</p><h3>\u7279\u6B8A\u724C\u533A</h3></div><small>\u5747\u4E0D\u8BA1\u5165\u624B\u724C\u4E0E\u624B\u724C\u4E0A\u9650</small></div><div class="detail-special-list">${[...specialCards, ...sealedCards].map((item) => `<article><i>${item.icon}</i><div><b>${item.name}</b><p>${item.copy}</p></div></article>`).join("")}</div></section>` : "";
    const canRecon = human?.characterId === "hinata" && human.scoutedTargetId === player.id && !player.human;
    const reconSection = canRecon ? `<section class="detail-section recon-section"><div class="detail-section-heading"><div><p class="eyebrow">BYAKUGAN INTEL</p><h3>\u767D\u773C\u4FA6\u5BDF\u60C5\u62A5</h3></div><small>\u9501\u5B9A\u7ED3\u675F\u540E\u91CD\u65B0\u9690\u85CF</small></div><div class="recon-hand">${player.hand.length ? player.hand.map((card) => `<span><i>${card.icon}</i><b>${card.name}</b><small>${cardTypeLabels[card.type]}</small></span>`).join("") : `<p class="empty-plots">\u76EE\u6807\u5F53\u524D\u6CA1\u6709\u624B\u724C</p>`}</div></section>` : "";
    const detail = $("#playerDetailContent");
    detail.style.setProperty("--char", character.color);
    detail.style.setProperty("--detail-role", showRole ? `var(--${role.color})` : "var(--muted)");
    detail.innerHTML = `<div class="player-detail-hero">
    <div class="player-detail-portrait"><img src="${portraitPath(character.id)}" alt="${character.name}\u7ACB\u7ED8"></div>
    <div class="player-detail-summary">
      <p class="eyebrow">SEAT ${player.seat + 1} \xB7 ${character.series}</p>
      <div class="player-detail-title"><div><h2>${character.name}</h2><span>${character.role}</span></div><strong class="detail-identity ${showRole ? "confirmed" : "hidden-role"}">${identityName}</strong></div>
      <p class="identity-copy">${identityCopy}</p>
      <div class="detail-stat-grid">
        <article><small>\u4F53\u529B</small><b>\u2665 ${player.hp}/${player.maxHp}</b></article>
        <article><small>\u80FD\u91CF</small><b>\u25C6 ${player.energy}/${player.maxEnergy}</b></article>
        <article><small>\u624B\u724C</small><b>${player.hand.length} \u5F20</b></article>
        <article title="\u56DE\u5408\u7ED3\u675F\u65F6\uFF0C\u8D85\u8FC7\u6B64\u6570\u91CF\u7684\u624B\u724C\u9700\u8981\u5F03\u7F6E"><small>\u624B\u724C\u4E0A\u9650</small><b>${engine.handLimit(player.id)} \u5F20</b></article>
        <article><small>\u4E0E\u4F60\u8DDD\u79BB</small><b>${player.id === human?.id ? "\u81EA\u8EAB" : Number.isFinite(distance) ? distance : "\u2014"}</b></article>
        <article><small>\u653B\u51FB\u8DDD\u79BB</small><b>${attackRange >= 99 ? "\u65E0\u9650" : attackRange || "\u2014"}</b></article>
      </div>
    </div>
  </div>
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">LIVE STATUS</p><h3>\u5F53\u524D\u72B6\u6001</h3></div><small>\u968F\u6218\u5C40\u5B9E\u65F6\u66F4\u65B0</small></div>
    <div class="detail-status-list">${statuses.map((status) => `<article class="${status.tone}"><b>${status.label}</b><span>${status.text}</span></article>`).join("")}</div>
  </section>
  ${character.dream ? `<section class="detail-section dream-section"><div class="detail-section-heading"><div><p class="eyebrow">DREAM TRAIL</p><h3>${character.dream.name} ${dreamBadge(player, character)}</h3></div><small>${player.dreamState?.awakened ? "\u5DF2\u89C9\u9192" : `\u8FDB\u5EA6 ${player.dreamState?.progress || 0}/3`}</small></div><p class="dream-condition">\u63A8\u8FDB\u6761\u4EF6\uFF1A${character.dream.conditionText}</p><p class="dream-awaken">\u89C9\u9192\u6548\u679C\uFF1A${character.dream.awakenText}</p></section>` : ""}
  ${plotSection}
  ${reconSection}
  ${specialSection}
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">EQUIPMENT</p><h3>\u88C5\u5907\u533A\u57DF</h3></div></div>
    <div class="detail-equipment-grid">${equipmentSlots.map(([slot, label, icon, fallback]) => {
      const card = player.equipment[slot];
      return `<article class="${card ? "equipped" : ""}"><i>${icon}</i><div><small>${label}</small><b>${card?.name || "\u672A\u88C5\u5907"}</b><p>${card?.description || fallback}</p></div></article>`;
    }).join("")}</div>
  </section>
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">ABILITY FILE</p><h3>\u89D2\u8272\u6280\u80FD</h3></div><small>\u4E3B\u52A8\u6280\u3001\u89D2\u8272\u7279\u6027\u4E0E\u62DB\u724C\u6280</small></div>
    <div class="detail-skill-grid">${skills.map((skill) => {
      const meta = skill.signature ? `${engine.signatureCost(player.id)} \u80FD\u91CF \xB7 ${targetLabels[character.signature.target] || "\u6307\u5B9A\u76EE\u6807"}` : skill.meta;
      return `<article class="${skill.active ? "active" : skill.signature ? "signature" : "passive"}"><i>${skill.icon}</i><div><small>${skill.kind} \xB7 ${meta}${skill.active && player.turnFlags.activeUsed ? " \xB7 \u672C\u56DE\u5408\u5DF2\u4F7F\u7528" : skill.signature && player.signatureLocked > 0 ? " \xB7 \u5F53\u524D\u5C01\u5B58" : ""}</small><b>${skill.name}</b><p>${skill.text}</p></div></article>`;
    }).join("")}</div>
  </section>
  ${predictionPanel}`;
  }
  function renderIntel(human) {
    const role = engine.roleOf(human), character = engine.characterOf(human), active = activeSkills[human.characterId];
    $("#identityCard").style.setProperty("--role-color", `var(--${role.color})`);
    $("#identityCard").innerHTML = `<small>\u4F60\u7684\u8EAB\u4EFD \xB7 ${human.revealed ? "\u5DF2\u516C\u5F00" : "\u672A\u516C\u5F00"}</small><h3>${role.name}</h3><p>${role.goal}</p>`;
    $("#skillPanel").innerHTML = characterSkillEntries(character).map((skill) => `<article class="skill-item ${skill.active ? "clickable" : ""}"><b>${skill.name}</b><span>${skill.kind} \xB7 ${skill.meta}</span><p>${skill.text}</p></article>`).join("");
    const canAct = engine.canAct(human.id);
    $("#activeSkillButton").disabled = !canAct || !engine.getActiveSkillTargets(human.id).length;
    $("#activeSkillButton").classList.toggle("armed", selectingActive);
    $("#activeSkillButton").childNodes[0].textContent = `\u53D1\u52A8\u300C${active.name}\u300D `;
    $("#activeSkillCost").textContent = active.costText;
    const signatureCost2 = engine.signatureCost(human.id);
    $("#signatureButton").disabled = !canAct || human.signatureLocked > 0 || human.energy < signatureCost2 || !engine.getSignatureTargets(human.id).length;
    $("#energyCost").textContent = `${signatureCost2} \u80FD\u91CF`;
    $("#revealButton").classList.toggle("hidden", engine.mode.id === "ranked2v2" || human.roleId === "lord" || human.revealed);
    $("#revealButton").disabled = !canAct;
    const endTurnDisabled = !canAct;
    $("#endTurnButton").disabled = endTurnDisabled;
    $("#compactEndTurnButton").disabled = endTurnDisabled;
  }
  function renderLog() {
    const logs = [...engine.logs].reverse().slice(0, 45);
    $("#gameLog").innerHTML = logs.map((log) => `<div class="log-item ${["damage", "event", "victory", "signature"].includes(log.type) ? log.type === "damage" ? "damage" : "event" : ""}"><time>R${log.round || 0}</time><p>${highlightNames(log.message)}</p></div>`).join("");
  }
  function highlightNames(text) {
    let html = text;
    for (const character of characters) html = html.replaceAll(character.name, `<strong>${character.name}</strong>`);
    return html;
  }
  function bindDynamicEvents() {
    document.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => chooseCard(button.dataset.card)));
    document.querySelectorAll("[data-inspect-player]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPlayerDetail(button.dataset.inspectPlayer);
    }));
    document.querySelectorAll("[data-player]").forEach((card) => card.addEventListener("click", () => chooseTarget(card.dataset.player)));
  }
  $("#playerDetailContent").addEventListener("click", (event) => {
    const button = event.target.closest("[data-predict-role]");
    const player = engine?.player(inspectedPlayerId);
    if (!button || !player || engine.mode.id !== "classic8" || player.revealed || !player.alive) return;
    const roleId = button.dataset.predictRole;
    if (roleId === "unknown") identityPredictions.delete(player.id);
    else if (predictionRoleIds.includes(roleId)) identityPredictions.set(player.id, roleId);
    saveUiState();
    const label = roleId === "unknown" ? "\u672A\u5224\u65AD" : roles[roleId].name;
    renderGame();
    showToast(`\u5DF2\u5C06${engine.nameOf(player)}\u6807\u8BB0\u4E3A\uFF1A${label}`);
  });
  playerDetailDialog.addEventListener("close", () => {
    const shouldResume = Boolean(inspectedPlayerId);
    inspectedPlayerId = null;
    if (shouldResume && engine && !engine.winner) continueFlow(320);
  });
  function findHandCard(cardUid) {
    if (!engine) return null;
    for (const player of engine.players) {
      const card = player.hand.find((item) => item.uid === cardUid);
      if (card) return card;
    }
    return null;
  }
  function openCardDetail(cardUid) {
    const card = findHandCard(cardUid);
    if (!card) return;
    clearTimeout(aiTimer);
    inspectedCardUid = cardUid;
    const tags = cardTags(card);
    const content = $("#cardDetailContent");
    content.style.setProperty("--card", cardColorMap[card.color] || "#aaa");
    content.innerHTML = `<div class="battle-card-detail-layout">
    ${artMarkup(card, "battle-card-detail-art", `${card.name}\u5361\u9762`)}
    <div class="battle-card-detail-copy"><span class="codex-glyph">${card.icon}</span><p class="eyebrow">${cardTypeLabels[card.type]}</p><h2>${card.name}</h2><div class="codex-tags">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div><h3>\u5B8C\u6574\u89C4\u5219</h3><p>${cardRuleText(card)}</p></div>
  </div>`;
    if (!cardDetailDialog.open) cardDetailDialog.showModal();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-card-detail]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openCardDetail(button.dataset.cardDetail);
  });
  cardDetailDialog.addEventListener("close", () => {
    const shouldResume = Boolean(inspectedCardUid);
    inspectedCardUid = null;
    if (shouldResume && engine && !engine.winner) continueFlow(320);
  });
  function chooseCard(uid) {
    const human = engine.players.find((player) => player.human);
    const card = human.hand.find((item) => item.uid === uid);
    if (!card || card.responseOnly) return showToast("\u8FD9\u5F20\u724C\u53EA\u80FD\u5728\u54CD\u5E94\u7A97\u53E3\u4F7F\u7528");
    selectedCard = selectedCard === uid ? null : uid;
    selectingSignature = false;
    selectingActive = false;
    if (selectedCard) {
      const targets = engine.getCardTargets(human.id, card);
      if (!targets.length) {
        selectedCard = null;
        showToast("\u5F53\u524D\u6CA1\u6709\u5408\u6CD5\u76EE\u6807");
      } else if (targets.length === 1 && targets[0] === human.id) return executeCard(human.id);
      else showToast(`\u5DF2\u9009\u62E9\u3010${card.name}\u3011\uFF0C\u8BF7\u70B9\u51FB\u53D1\u5149\u76EE\u6807`);
    }
    renderGame();
  }
  function getActiveTargets() {
    if (!engine) return [];
    const human = engine.players.find((player) => player.human);
    if (selectingSignature) return engine.getSignatureTargets(human.id);
    if (selectingActive) return engine.getActiveSkillTargets(human.id);
    if (!selectedCard) return [];
    const card = human.hand.find((item) => item.uid === selectedCard);
    return engine.getCardTargets(human.id, card).filter((id) => id !== human.id);
  }
  function chooseTarget(targetId) {
    if (!getActiveTargets().includes(targetId)) return;
    if (selectingSignature) executeSignature(targetId);
    else if (selectingActive) executeActiveSkill(targetId);
    else executeCard(targetId);
  }
  function executeCard(targetId) {
    const human = engine.players.find((player) => player.human);
    const result = runGameCommand("playCard", human.id, selectedCard, targetId);
    if (!result.ok) showToast(result.reason);
    selectedCard = null;
    renderGame();
    continueFlow();
  }
  $("#signatureButton").addEventListener("click", () => {
    const human = engine.players.find((player) => player.human);
    const targets = engine.getSignatureTargets(human.id);
    if (!targets.length) return showToast("\u5F53\u524D\u6CA1\u6709\u5408\u6CD5\u76EE\u6807");
    selectedCard = null;
    selectingActive = false;
    if (targets.length === 1 && targets[0] === human.id) executeSignature(human.id);
    else {
      selectingSignature = !selectingSignature;
      showToast(selectingSignature ? "\u8BF7\u9009\u62E9\u62DB\u724C\u6280\u76EE\u6807" : "\u5DF2\u53D6\u6D88\u9009\u62E9");
      renderGame();
    }
  });
  function executeSignature(targetId) {
    const human = engine.players.find((player) => player.human);
    const result = runGameCommand("useSignature", human.id, targetId);
    if (!result.ok) showToast(result.reason);
    selectingSignature = false;
    renderGame();
    continueFlow();
  }
  $("#activeSkillButton").addEventListener("click", () => {
    const human = engine.players.find((player) => player.human);
    const targets = engine.getActiveSkillTargets(human.id);
    if (!targets.length) return showToast("\u672C\u56DE\u5408\u5DF2\u4F7F\u7528\uFF0C\u6216\u6682\u4E0D\u6EE1\u8DB3\u53D1\u52A8\u6761\u4EF6");
    selectedCard = null;
    selectingSignature = false;
    if (targets.length === 1 && targets[0] === human.id) executeActiveSkill(human.id);
    else {
      selectingActive = !selectingActive;
      showToast(selectingActive ? "\u8BF7\u9009\u62E9\u4E3B\u52A8\u6280\u76EE\u6807" : "\u5DF2\u53D6\u6D88\u9009\u62E9");
      renderGame();
    }
  });
  function executeActiveSkill(targetId) {
    const human = engine.players.find((player) => player.human);
    const result = runGameCommand("useActiveSkill", human.id, targetId);
    if (!result.ok) showToast(result.reason);
    selectingActive = false;
    renderGame();
    continueFlow();
  }
  $("#revealButton").addEventListener("click", () => {
    const human = engine.players.find((player) => player.human);
    const result = runGameCommand("revealRole", human.id);
    if (!result.ok) showToast(result.reason);
    renderGame();
  });
  function endHumanTurn() {
    const human = engine.players.find((player) => player.human);
    selectedCard = null;
    selectingSignature = false;
    selectingActive = false;
    toggleIntel(false);
    if (runGameCommand("endTurn", human.id)) {
      renderGame();
      continueFlow(650);
    }
  }
  $("#endTurnButton").addEventListener("click", endHumanTurn);
  $("#compactEndTurnButton").addEventListener("click", endHumanTurn);
  function showDiscard() {
    const pending = engine?.pendingDiscard;
    if (!pending) return;
    const player = engine.player(pending.playerId);
    if (activeDiscardPromptId !== pending.id) {
      activeDiscardPromptId = pending.id;
      discardSelection = /* @__PURE__ */ new Set();
    }
    const allowed = new Set(pending.allowedUids);
    $("#discardReason").textContent = pending.reason;
    $("#discardCardList").innerHTML = player.hand.map((card) => {
      const selectable = allowed.has(card.uid);
      const selected = discardSelection.has(card.uid);
      const locked = !selected && discardSelection.size >= pending.count;
      return `<div class="discard-card-shell" style="--card:${cardColorMap[card.color] || "#aaa"}"><button class="discard-choice ${selected ? "selected" : ""}" data-discard-card="${card.uid}" ${!selectable || locked ? "disabled" : ""}>
      ${artMarkup(card, "discard-art", `${card.name}\u5361\u9762`)}
      <span class="discard-check">${selected ? "\u2713" : card.icon}</span><span class="discard-copy"><small>${cardTypeLabels[card.type]}</small><b>${card.name}</b><p>${card.description}</p></span>
    </button><button type="button" class="card-detail-trigger discard-detail-trigger" data-card-detail="${card.uid}" aria-label="\u653E\u5927\u67E5\u770B${card.name}" title="\u67E5\u770B\u5B8C\u6574\u89C4\u5219">\u2315</button></div>`;
    }).join("");
    $("#discardProgress").textContent = `\u5DF2\u9009 ${discardSelection.size}/${pending.count}`;
    $("#confirmDiscard").disabled = discardSelection.size !== pending.count;
    if (!discardDialog.open) discardDialog.showModal();
  }
  $("#discardCardList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-discard-card]");
    if (!button || button.disabled || !engine?.pendingDiscard) return;
    const uid = button.dataset.discardCard;
    if (discardSelection.has(uid)) discardSelection.delete(uid);
    else if (discardSelection.size < engine.pendingDiscard.count) discardSelection.add(uid);
    showDiscard();
  });
  $("#confirmDiscard").addEventListener("click", () => {
    const pending = engine?.pendingDiscard;
    if (!pending) return;
    const result = runGameCommand("confirmDiscard", pending.playerId, [...discardSelection]);
    if (!result.ok) return showToast(result.reason);
    discardDialog.close();
    discardSelection = /* @__PURE__ */ new Set();
    activeDiscardPromptId = null;
    renderGame();
    continueFlow(500);
  });
  discardDialog.addEventListener("cancel", (event) => event.preventDefault());
  function showChoice() {
    const pending = engine?.pendingChoice;
    if (!pending) return;
    $("#choiceTitle").textContent = pending.title;
    $("#choiceCopy").textContent = pending.text || "\u8BF7\u6839\u636E\u5F53\u524D\u6218\u5C40\u9009\u62E9\u4E00\u9879\u3002";
    $("#choiceOptions").innerHTML = pending.options.map((option) => `<button type="button" data-choice-value="${option.value}" class="choice-option"><b>${option.label}</b>${option.description ? `<span>${option.description}</span>` : ""}</button>`).join("");
    if (!choiceDialog.open) choiceDialog.showModal();
  }
  $("#choiceOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-choice-value]");
    const pending = engine?.pendingChoice;
    if (!button || !pending) return;
    const result = runGameCommand("resolveChoice", pending.playerId, button.dataset.choiceValue);
    if (!result.ok) return showToast(result.reason);
    choiceDialog.close();
    renderGame();
    continueFlow(420);
  });
  choiceDialog.addEventListener("cancel", (event) => event.preventDefault());
  function showResponse() {
    const response = engine.pendingResponse;
    if (!response) return;
    const isGuard = response.type === "guard", isIntervene = ["intervene", "interveneStrategy"].includes(response.type);
    $("#responseTitle").textContent = isGuard ? "\u653B\u51FB\u5373\u5C06\u547D\u4E2D" : isIntervene ? "\u662F\u5426\u5F3A\u5236\u4ECB\u5165\uFF1F" : "\u7B56\u7565\u724C\u5373\u5C06\u751F\u6548";
    $("#responseCopy").textContent = isGuard ? `${engine.nameOf(response.sourceId)}\u6B63\u5728\u653B\u51FB\u4F60\uFF0C\u9700\u8981${response.required}\u5F20\u9632\u5FA1\u724C\u3002` : isIntervene ? `${engine.nameOf(response.originalTargetId)}\u6B63\u5728\u6210\u4E3A${response.type === "interveneStrategy" ? `\u3010${response.cardName}\u3011` : "\u7A81\u51FB"}\u76EE\u6807\uFF0C\u4F60\u53EF\u4EE5\u4EE3\u66FF\u5176\u627F\u53D7\u8FD9\u6B21\u7ED3\u7B97\u3002` : `${engine.nameOf(response.sourceId)}\u5BF9\u4F60\u4F7F\u7528\u4E86\u3010${response.cardName}\u3011\uFF0C\u662F\u5426\u6253\u51FA\u53CD\u5236\uFF1F`;
    $("#acceptResponse").textContent = isGuard ? `\u6253\u51FA${response.required}\u5F20\u9632\u5FA1` : isIntervene ? "\u6253\u51FA\u5F3A\u5236\u4ECB\u5165" : "\u6253\u51FA\u53CD\u5236";
    $("#declineResponse").textContent = isGuard ? "\u627F\u53D7\u4F24\u5BB3" : isIntervene ? "\u4E0D\u4ECB\u5165" : "\u8BA9\u5176\u751F\u6548";
    if (!responseDialog.open) responseDialog.showModal();
  }
  $("#acceptResponse").addEventListener("click", () => resolveResponse(true));
  $("#declineResponse").addEventListener("click", () => resolveResponse(false));
  function resolveResponse(useCard) {
    responseDialog.close();
    runGameCommand("respond", useCard);
    renderGame();
    continueFlow(500);
  }
  function showResult() {
    if (!engine?.winner || resultDialog.open) return;
    if (playerDetailDialog.open) {
      inspectedPlayerId = null;
      playerDetailDialog.close();
    }
    if (cardDetailDialog.open) {
      inspectedCardUid = null;
      cardDetailDialog.close();
    }
    const won = engine.humanWon();
    $("#resultIcon").textContent = won ? "\u80DC" : "\u8D25";
    $("#resultTitle").textContent = won ? "\u4F60\u8D62\u5F97\u4E86\u8FD9\u573A\u6218\u6597" : "\u8FD9\u4E00\u6B21\uFF0C\u547D\u8FD0\u7AD9\u5728\u5BF9\u9762";
    $("#resultCopy").textContent = `${engine.winner.label} \xB7 \u5BF9\u5C40\u8FDB\u884C\u81F3\u7B2C ${engine.round} \u8F6E\u3002`;
    gameSession?.clear();
    resultDialog.showModal();
  }
  $("#resultLobby").addEventListener("click", returnLobby);
  $("#rematchButton").addEventListener("click", () => {
    resultDialog.close();
    selectedMode = lastMode.modeId;
    selectedCharacter = lastMode.humanCharacterId;
    startGame(true);
  });
  $("#soundButton").addEventListener("click", (event) => {
    event.currentTarget.classList.toggle("muted");
    showToast(event.currentTarget.classList.contains("muted") ? "\u97F3\u6548\u5DF2\u5173\u95ED" : "\u97F3\u6548\u5DF2\u5F00\u542F\uFF08\u6F14\u793A\uFF09");
  });
  $("#intelToggle").addEventListener("click", () => toggleIntel(!$(".intel-panel").classList.contains("open")));
  $("#intelClose").addEventListener("click", () => toggleIntel(false));
  $("#intelScrim").addEventListener("click", () => toggleIntel(false));
  function toggleIntel(open) {
    $(".intel-panel").classList.toggle("open", open);
    $("#intelScrim").classList.toggle("open", open);
    $("#intelToggle").setAttribute("aria-expanded", String(open));
  }
  function closeTopLayerOrNavigateBack() {
    const openDialog = [...document.querySelectorAll("dialog[open]")].pop();
    if (openDialog && ![responseDialog, discardDialog, choiceDialog].includes(openDialog)) {
      openDialog.close();
      return true;
    }
    if ($(".intel-panel")?.classList.contains("open")) {
      toggleIntel(false);
      return true;
    }
    if (!game.classList.contains("hidden")) {
      returnLobby();
      return true;
    }
    return false;
  }
  if (Capacitor.isNativePlatform()) {
    App.addListener("backButton", () => {
      if (!closeTopLayerOrNavigateBack()) App.exitApp();
    });
  }
  window.addEventListener("beforeunload", saveUiState);
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }
  renderCardCodex();
  renderLobby();
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
