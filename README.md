# t-rex4js-fs

Filesystem abstraction layer for [t-rex4js](https://github.com/Koudela/t-rex)

This repository is inspired by [parameterized-fs-routing](https://github.com/Koudela/parameterized-fs-routing).

## Purpose

This repository targets 5 main use cases:

1. Template resolver for t-rex
2. Context resolver for t-rex
3. Router for apps using t-rex
4. Distributed dependency injection layer
5. Lightweight app framework based on t-rex

## Installation

```bash
npm install t-rex4js-fs
```

## Usage

```js
const { tRexFS } import 't-rex4js-fs'

const options = {
    templateBaseDirs: [
        ['t-overwrites', '/home/plugins/my-theme-adjustments/templates'],
        ['t-theme', '/home/plugins/my-theme/templates'],
        ['t-app', '/home/apps/my-app/routing'],
    ],
    contextBaseDirs: [
        ['c-overwrites', '/home/plugins/my-theme-adjustments/context'],
        ['c-theme', '/home/plugins/my-theme/context'],
        ['c-app','/home/apps/my-app/routing'],
    ],
    entrypoint: null,
    debugMarks: false,
    hotUpdate: process.env.NODE_ENV !== 'production',
    callContextFactory: null,
    renderingProperty: null,
    parentLayerProperty: null,
    resourcePathProperty: 'url',
}
const router = new tRexFS(options)
await router.init()

const page = await router.render('/some/url/or/resource/path', 'main', {})
```

You can use module syntax in your providers.

```js
// some/template/path/template.mjs

export default {
    // t-rex template code goes here
}
```

```js
// some/context/path/context.mjs

export default {
    // t-rex context code goes here
}
```

Or to use commonJS syntax choose the `.js` file ending.

```js
// some/template/path/template.js

module.exports = {
    // t-rex template code goes here
}
```

```js
// some/context/path/context.js

module.exports {
    // t-rex context code goes here
}
```

Remarks: 

1. There is no explicit id. The relative path followed by `/t` or `/c` is the base id of the template/context, e.g `some/context/path/c`. The t-rex template/context id is the base id followed by `@` followed by the directory id, e.g.
`some/context/path/c@c-theme`.
2. The parent property has to hold the parents resource path (e.g. `some/template/path`) not the template/context object itself. 
3. All templates/context with the same base id have to use the same parent.
4. The order of the directories matters. Exists a template/context with the same path in multiple directories, the one residing in a directory with a lower index becomes the child, the other one the parent.
5. `t.parent(null, ...params)` targets the next parent provider. This is most of the time what you want, when overwriting a template. But `t.parent(providerId, ...params)` is not. If you want to target the base provider of the architectural layer, this id can change with a new plugin registered. For this use case `t.parentLayer(t, providerBaseId, ...params)` will be registered to the calling context. It takes the base id of the provider layer, where the property search should start. You can change the property name of the function by the `parentLayerProperty` option.
6. If you use an url mapping use a public and a private directory. Presumably not all templates/context will be used as entrypoint.
7. Templates/context ignore the javascript prototype chain. Only the first layer of properties is processed. 

## The calling context

To be able to pass call specific data or logic, every rendering call needs its own starting context.

You can provide a context factory for this or pass it as third argument to the rendering function. The one passed by the rendering call takes precedence before the one provided by the context factory. 

If no id is given it is set to `call/c`.

The first parameter of the render function is always stored within the calling context. The corresponding property name can be set via the `resourcePathProperty` option. If no name is given `url` is used.

## Hot update

If the `hotUpdate` option is set to `false` the directories are traversed on initialization of the object and all modules (templates/contexts) are imported. Code changes will not be recognised. 

If set to `true` initialisation is not necessary. On each `render` call a directory matching is done and the matched modules are (re)imported. Code changes immediately take place.


## Redirectional rendering

The calling context always mirrors the rendering method to `render` or the property set by the `renderingProperty` option. Thus rendering a subresource from within a provider function is always possible.

## Mixins

Mixins can be realized via the `mixin` property. The `mixin` property has to be an array of base ids. All properties from the targeted providers will be integrated into the template/context. Duplicated properties will throw an error. 

Mixins do not cross base directory borders. If a mixin is not available within the same base directory an error will be thrown.
