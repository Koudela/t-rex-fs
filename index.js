/**
 * t-rex-fs
 * filesystem based routing engine
 *
 * @package t-rex4js-fs
 * @link https://github.com/Koudela/t-rex-fs/
 * @copyright Copyright (c) 2025 Thomas Koudela
 * @license http://opensource.org/licenses/MIT MIT License
 */
(function(exports) {
    'use strict'

    const fetch = repository => repository.endsWith('.mjs') ? import(repository) : require(repository)
        , fsp = fetch('fs').promises

    class fsCache {
        constructor(baseDir, filename) {
            this.baseDir = '/' + this.__splitUrl(baseDir).join('/') + '/'
            this.filename = filename
            this.cache = {}
        }

        /** @return {Promise<void>} */
        buildCache() {
            return this.__buildCache('')
        }

        /** @return {Promise<[object, id]|null>} */
        async match(url) {
            const remainingUrlParts = this.__splitUrl(url)
            do {
                const path = remainingUrlParts.join('/')
                const filepath = this.baseDir + path + (remainingUrlParts.length === 0 ? '' : '/') + this.filename
                if (await this.__fileExists(filepath)) return [await fetch(filepath), path]
            } while (remainingUrlParts.pop())

            return null
        }

        /** @return {[object, int]|null} */
        matchCache(url) {
            const remainingUrlParts = this.__splitUrl(url)
            do {
                const path = remainingUrlParts.join('/')
                if (path in this.cache) return [this.cache[path], path]
            } while (remainingUrlParts.pop())

            return null
        }

        async __buildCache(startPath) {
            await Promise.all((await fsp.readdir(this.baseDir + startPath)).map(async (path) => {
                const relativePath = startPath + '/' + path

                if ((await fsp.stat(fullPath)).isDirectory()) this.__buildCache(relativePath)
                else if (path === this.filename) this.cache[relativePath] = await fetch(fullPath)   
            }))
        }

        __fileExists(path) {
            return fsp.stat(path).then(() => true).catch(() => false)
        }

        __splitUrl(url) {
            const path = url.split('?', 2)[0]
            return path.split('/').filter(value => value !== '')
        }
    }

    exports.tRexFs = class {
        constructor(options = {
            templateBaseDirs: [],
            contextBaseDirs: [],
            entrypoint: 'main',
            debugMarks: false,
            hotUpdate: true,
            callContextFactory: null,
            renderingProperty: 'render',
            resourcePathProperty: 'url',
        }) {
            this.options = options
            this.cache = {}
        }

        /** @return {Promise<tRexFs>} */
        async init() {
            await this.__buildCache()
            return this
        }

        /** @return {Promise<mixed>} */
        async render(url, entrypoint=null, callContext=null) {
            if (!entrypoint) entrypoint = this.options.entrypoint
            if (!callContext) callContext = typeof this.options.callContextFactory === 'function' 
                ? this.options.callContextFactory(url, entrypoint) : {}

            if (typeof callContext.id !== 'string') callContext.id = 'call/c'

            const template = await this.__resolveTemplate(url)
            callContext.parent = await this.__resolveContext(url)

            callContext[this.options.resourcePathProperty ?? 'url'] = url
            callContext[this.options.renderingProperty ?? 'render'] = this.render
            
            return tRex(template, callContext, entrypoint, this.options.debugMarks)
        }

        __resolveTemplate(url) {
            return this.__resolveProvider(url, this.options.templateBaseDirs, '/t')
        }

        __resolveContext(url) {
            return this.__resolveProvider(url, this.options.contextBaseDirs, '/c')
        }

        async __resolveProvider(url, baseDirs, postFix) {
            const matches = await Promise.all(baseDirs.map(async ([id, baseDir]) => {
                const result = this.options.hotUpdate ? await this.cache[id].match(url) : this.cache[id].matchCache(url)
                if (result === null) return null
                this.__addMixins(result[0], id, baseDir)

                return [result, id]
            })).filter(val => val)

            if (matches.length === null) return {}
            
            const max = matches.reduce((agg, val) => Math.max(val[0][1].length, agg), 0)
            const maxMatches = matches.filter(val => val[0][1].length === max)
            const providers = maxMatches.map(val => {
                const obj = val[0][0]
                obj.id = val[0][1] + postFix + '@' + val[1]
                return obj
            })
            const urlParent = providers[0].parent ?? null
            if (providers.some(obj => (obj.parent ?? null) !== urlParent)) {
                const providerList = providers.map(obj => obj.id).join(', ')
                throw Error(`The providers for '${ url }' do not have the same parent. Provider list: ${ providerList }`)
            }
            const provider = providers[0]
            const lastProvider = providers.reduce((agg, obj) => {
                if (agg !== null) agg.parent = obj
                return obj
            }, null)
            if (urlParent) lastProvider.parent = await this.__resolveProvider(urlParent, baseDirs, postFix)
            
            return provider
        }

        async __addMixins(obj, id, baseDir) {
            await Promise.all((obj.mixin ?? []).map(url => this.__addMixin(obj, url, id, baseDir)))
        }

        async __addMixin(obj, url, id, baseDir) {
            const result = this.options.hotUpdate ? await this.cache[id].match(url) : this.cache[id].matchCache(url)

            if (result === null) throw Error(`Mixin '${url}' for provider '${obj.id}' in directory '${baseDir}' not found.`)

            await Promise.all(Object.keys(result).map(async key => {
                if (key === 'id' || key === 'parent' || key === 'mixin') return
                if (key in obj) throw Error(`Mixin property '${key}' from '${url}' in direcotry '${baseDir}' can not be inserted into '${obj.id}.'`)
                obj[key] = result[key]
            }))
            this.__addMixins(obj, id, baseDir)
        }

        async __buildCache() {
            await Promise.all(this.options.templateBaseDirs.map(async ([id, baseDir]) => {
                this.cache[id] = new fsCache(baseDir, 'template.js')
                if (!this.options.hotUpdate) this.cache[id].buildCache()
            }))
            await Promise.all(this.options.contextBaseDirs.map(async ([id, baseDir]) => {
                this.cache[id] = new fsCache(baseDir, 'context.js')
                if (!this.options.hotUpdate) this.cache[id].buildCache()
            }))
        }
    }
})(exports)
