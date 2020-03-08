const socket = require('./socket');
const uuidv1 = require('uuid/v1');

async function getRouter(route, recursive=true) {
  const apiSpec = await socket.sendRequest(trim(route + "/GetAPISpecification", "/"));
  return createObjectFromSpec(apiSpec, route, recursive)
}

function createObjectFromSpec(apiSpec, specRoute, recursive) {
  const obj = {}

  for (const method of apiSpec.Methods) {
    obj[pascalToCamel(method.Name)] = (...args) => socket.sendRequest(trim(specRoute + "/" + method.Name, "/"), ...args)
  }

  for (const event of apiSpec.Events) {
    obj[pascalToCamel(event.Name)] = {
      subscribe: (fn, key) => {
        key = key || uuidv1()
        socket.subscribe(trim(specRoute + "/" + event.Name, "/"), key, fn)
        return key
      },
      unsubscribe: (key) => {
        socket.unsubscribe(trim(specRoute + "/" + event.Name, "/"), key)
      }
    }
  }

  if (recursive) {
    for (const subroute of apiSpec.Subroutes) {
      obj[pascalToCamel(subroute.Name)] = createObjectFromSpec(subroute, trim(specRoute + "/" + subroute.Name, "/"), true)
    }
  }

  return obj
}

const pascalToCamel = (string) => string.substring(0, 1).toLowerCase() + string.substring(1)

const trimStart = (str, char) => ((str.length > 0) && (str.charAt(str.length - 1) == char)) ? str.substring(0, str.length - 1) : str

const trimEnd = (str, char) => ((str.length > 0) && (str.charAt(0) == char)) ? str.substring(1) : str

const trim = (str, char) => trimStart(trimEnd(str, char), char)

module.exports = {getRouter, init: socket.connect}