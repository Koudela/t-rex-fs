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
                if (await this.__fileExists(filepath + '.js')) return [await fetch(filepath + '.js'), path]
                if (await this.__fileExists(filepath + '.mjs')) return [(await fetch(filepath + '.mjs')).default, path]
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

        /** @return {Promise<[object, id]|null>} */
        async exactMatch(url) {
            const remainingUrlParts = this.__splitUrl(url)
            const path = remainingUrlParts.join('/')
            const filepath = this.baseDir + path + (remainingUrlParts.length === 0 ? '' : '/') + this.filename
            if (await this.__fileExists(filepath + '.js')) return [await fetch(filepath), path]
            if (await this.__fileExists(filepath + '.mjs')) return [(await fetch(filepath)).default, path]

            return null
        }

        /** @return {[object, int]|null} */
        exactMatchCache(url) {
            const remainingUrlParts = this.__splitUrl(url)
            const path = remainingUrlParts.join('/')

            if (path in this.cache) return [this.cache[path], path]

            return null
        }
        
        async __buildCache(startPath) {
            await Promise.all((await fsp.readdir(this.baseDir + startPath)).map(async (path) => {
                const relativePath = startPath + (startPath ? '/' : '') + path
                const fullPath = this.baseDir + relativePath

                if ((await fsp.stat(fullPath)).isDirectory()) await this.__buildCache(relativePath)
                else if (path === this.filename + '.js') this.cache[startPath] = await fetch(fullPath)   
                else if (path === this.filename + '.mjs') this.cache[startPath] = (await fetch(fullPath)).default
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

    const tRexFS = class {
        constructor(options = {
            templateBaseDirs: [],
            contextBaseDirs: [],
            entrypoint: null,
            debugMarks: false,
            hotUpdate: true,
            callContextFactory: null,
            renderingProperty: 'render',
            parentLayerProperty: 'parentLayer',
            resourcePathProperty: 'url',
        }) {
            this.options = options
            this.cache = {}
        }

        /** @return {Promise<tRexFS>} */
        async init() {
            await this.__buildCache()
            return this
        }

        /** @return {Promise<mixed>} */
        async render(url, entrypoint=null, callContext=null) {
            const { tRex, FinalNotFoundException } = await import('t-rex4js')
                        
            if (!entrypoint) entrypoint = this.options.entrypoint ?? 'main'
            if (!callContext) callContext = typeof this.options.callContextFactory === 'function' 
                ? this.options.callContextFactory(url, entrypoint) : {}

            if (typeof callContext.id !== 'string') callContext.id = 'call/c'

            const template = await this.__resolveTemplate(url)
            callContext.parent = await this.__resolveContext(url)

            callContext[this.options.resourcePathProperty ?? 'url'] = url
            callContext[this.options.renderingProperty ?? 'render'] = (t, url, entrypoint=null, callContext=null) => this.render(url, entrypoint, callContext)
            callContext[this.options.parentLayerProperty ?? 'parentLayer'] = (lambda, t, url) => {
                const baseDirs = url.slice(-2) === '/t' ? this.options.templateBaseDirs: this.options.contextBaseDirs
    
                return this.__searchParentLayer(t, url, baseDirs, 0, FinalNotFoundException)
            }

            return tRex(template, callContext, entrypoint, this.options.debugMarks)
        }

        __searchParentLayer(t, url, baseDirs, i, FinalNotFoundException) {
            try {
                const result = t.parent(url + '@' + baseDirs[i++][0])
                return !(result instanceof Promise) 
                    ? result
                    : result.catch(e => { 
                        if (!(e instanceof FinalNotFoundException) || i === baseDirs.length) throw e 
                        return this.__searchParentLayer(t, url, baseDirs, i, FinalNotFoundException)
                    })                
            } catch(e) {
                if (!(e instanceof FinalNotFoundException) || i === baseDirs.length) throw e
                return this.__searchParentLayer(t, url, baseDirs, i, FinalNotFoundException)                
            }
        }

        __resolveTemplate(url) {
            return this.__resolveProvider(url, this.options.templateBaseDirs, '/t', {}, 0)
        }

        __resolveContext(url) {
            return this.__resolveProvider(url, this.options.contextBaseDirs, '/c', {}, 0)
        }

        async __resolveProvider(url, baseDirs, postFix, visited, counter) {
            if (url in visited) throw Error(`Circle with value '${url}' encountert while resolving the providers: ` + JSON.stringify(visited)) 
            else visited[url] = counter++

            const matches = (await Promise.all(baseDirs.map(async ([id, baseDir]) => {
                const result = this.options.hotUpdate ? await this.cache[id].match(url) : this.cache[id].matchCache(url)
                if (result === null) return null
                result[0] = { ...result[0] }
                result[0].id = result[1] + postFix + '@' + id
                result.push(id, baseDir)
                return result
            }))).filter(val => val)

            if (matches.length === 0) return null

            const max = matches.reduce((agg, val) => Math.max(val[1].length, agg), 0)
            const maxMatches = matches.filter(val => val[1].length === max)
            await Promise.all(maxMatches.map(val => this.__addMixins(val[0], val[0].mixin ?? [], val[2], val[3])))
            const providers = maxMatches.map(val => {
                const obj = val[0]
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

            if (urlParent) lastProvider.parent = await this.__resolveProvider(urlParent, baseDirs, postFix, visited, counter)
            
            return provider
        }

        async __addMixins(obj, mixins, id, baseDir) {
            await Promise.all(mixins.map(url => this.__addMixin(obj, url, id, baseDir)))
        }

        async __addMixin(obj, url, id, baseDir) {
            const result = this.options.hotUpdate ? await this.cache[id].exactMatch(url) : this.cache[id].exactMatchCache(url)
            if (result === null) throw Error(`Mixin '${url}' for provider '${obj.id}' in directory '${baseDir}' not found.`)

            const resultObj = result[0]
            await Promise.all(Object.keys(resultObj).map(async key => {
                if (key === 'id' || key === 'parent' || key === 'mixin') return
                if (key in obj) throw Error(`Mixin property '${key}' from '${url}' in directory '${baseDir}' can not be inserted into '${obj.id}'.`)
                obj[key] = resultObj[key]
            }))
            this.__addMixins(obj, resultObj.mixin ?? [], id, baseDir)
        }

        async __buildCache() {
            await Promise.all(this.options.templateBaseDirs.map(async ([id, baseDir]) => {
                this.cache[id] = new fsCache(baseDir, 'template')
                if (!this.options.hotUpdate) await this.cache[id].buildCache()
            }))
            await Promise.all(this.options.contextBaseDirs.map(async ([id, baseDir]) => {
                this.cache[id] = new fsCache(baseDir, 'context')
                if (!this.options.hotUpdate) await this.cache[id].buildCache()
            }))
        }
    }

    exports.tRexFS = tRexFS
})(exports)
