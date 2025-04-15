/**
 * t-rex-fs
 * filesystem based routing engine
 *
 * @package t-rex4js-fs
 * @link https://github.com/Koudela/t-rex-fs/
 * @copyright Copyright (c) 2025 Thomas Koudela
 * @license http://opensource.org/licenses/MIT MIT License
 */

import test from 'ava'
import * as tRexFSImport from './index.js'
const tRexFS = tRexFSImport.tRexFS

import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testcasesDir = '/' + __dirname.split('/').filter(val => val).join('/') + '/testcases/'
const templateBaseDirs = [
    ['t-overwrites', testcasesDir + 'plugins/my-theme-adjustments/templates'],
    ['t-theme', testcasesDir + 'plugins/my-theme/templates'],
    ['t-app', testcasesDir + 'apps/my-app/routing'],
]
const contextBaseDirs = [
    ['c-overwrites', testcasesDir + 'plugins/my-theme-adjustments/context'],
    ['c-theme', testcasesDir + 'plugins/my-theme/context'],
    ['c-app', testcasesDir + 'apps/my-app/routing'],
]
const options = {
    templateBaseDirs,
    contextBaseDirs,
    entrypoint: 'main',
    debugMarks: false,
    hotUpdate: false,
    callContextFactory: null,
    renderingProperty: null,
    parentLayerProperty: null,
    resourcePathProperty: null,
}

const router = new tRexFS(options)
await router.init()

test('Usage', async t => {
    const page = await router.render('/some/url/or/resource/path', 'main', {})
    t.is(page, `<!DOCTYPE html>
<html lang="en">
<head>
    <title>Hello from root context!</title>
</head>
<body>
    <p>Sorry! We could not find a matching site</p>
</body>
</html>`)
})

test('mixin does not cross directory border and throws if not exists.', async t => {
    try {
        await router.render('mixins/not-found')
    } catch (e) {
        t.is(0, e.message.indexOf(`Mixin 'mixin-not-found' for provider 'mixins/not-found/t@t-app' in directory`))
        t.is(true, 0 < e.message.indexOf(`testcases/apps/my-app/routing' not found.`))
    }
})

test('mixin throws on duplicate property.', async t => {
    try {
        await router.render('mixins/duplicate-property')
    } catch (e) {
        t.is(0, e.message.indexOf(`Mixin property 'duplicatedProperty' from 'mixins/duplicate-property/provider-with-duplicated-property' in directory`))
        t.is(true, 0 < e.message.indexOf(`testcases/apps/my-app/routing' can not be inserted into 'mixins/duplicate-property/t@t-app'.`))
    }
})

test('mixin of mixin', async t => {
    const page = await router.render('mixins/mixin-of-mixin')
    t.is(page, `mixin of mixin works`)
})

test('multiple mixins', async t => {
    const page = await router.render('mixins/multiple-mixins')
    t.is(page, `multiple mixins works`)
})

test('Redirectional rendering', async t => {
    const page1 = await router.render('functionality/redirectional-rendering')
    t.is(page1, `redirectional rendering works`)
    const myRouter = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: 'myRenderFnc',
        parentLayerProperty: null,
        resourcePathProperty: null,
    })
    await myRouter.init()
    const page2 = await myRouter.render('functionality/redirectional-rendering')
    t.is(page2, `redirectional rendering with customized rendering property name works`)
})

test('template overwrite', async t => {
    const page = await router.render('functionality/template-overwrite')
    t.is(page, `OverwriteOApp works, ThemeOApp works, OverwriteOTheme works and OverwriteOThemeOApp works`)
})

test('context overwrite', async t => {
    const page = await router.render('functionality/context-overwrite')
    t.is(page, `Context: c-OverwriteOApp works, c-ThemeOApp works, c-OverwriteOTheme works and c-OverwriteOThemeOApp works`)
})

test('root context id naming', async t => {
    const page1 = await router.render('functionality/root-context-id')
    t.is(page1, `Root-Context-id: call/c, Root-Template-Context-id: main@functionality/root-context-id/t@t-app`)
    const page2 = await router.render('functionality/root-context-id', 'main', { id: 'my-root-context' })
    t.is(page2, `Root-Context-id: my-root-context, Root-Template-Context-id: main@functionality/root-context-id/t@t-app`)
})

test('parent targeting', async t => {
    try {
        await router.render('functionality/parent-with-circle')
    } catch(e) {
        t.is(e.message, `Circle with value 'functionality/parent-with-circle/circle' encountert while resolving the providers: {"functionality/parent-with-circle":0,"functionality/parent-with-circle/circle":1}`)
    }
    const page = await router.render('functionality/parent')
    t.is(page, `directParent: first parent, indirectParent: second parent`)
})

test('parent layer targeting', async t => {
    const page1 = await router.render('functionality/parent-layer')
    t.is(page1, `next layer`)
    const myRouter = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter.init()
    const page2 = await myRouter.render('functionality/parent-layer')
    t.is(page2, `next layer`)    
})

test('url property', async t => {
    const page1 = await router.render('functionality/url-property?param1=alpha&param2=42')
    t.is(page1, `functionality/url-property?param1=alpha&param2=42`)
    const myRouter = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: null,
        resourcePathProperty: 'myUrl',
    })
    await myRouter.init()
    const page2 = await myRouter.render('functionality/url-property')
    t.is(page2, `functionality/url-property`)    
})

test('context factory', async t => {
    const myRouter = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: () => ({ id: 'myContext', myProperty: t => t.mySecondProperty(), mySecondProperty: 'Hello from the context factory.' }),
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter.init()
    const page = await myRouter.render('', 'myProperty')
    t.is(page, `Hello from the context factory.`)
})

test('pass context via render method', async t => {
    const page = await router.render('', 'myProperty', { id: 'myContext', myProperty: t => t.mySecondProperty(), mySecondProperty: 'Hello from the passed context.' })
    t.is(page, `Hello from the passed context.`)
})

test('entrypoints', async t => {
    const myRouter1 = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter1.init()
    const page1 = await myRouter1.render('', 'myProperty', { myProperty: 'entrypoint via render works' })
    t.is(page1, `entrypoint via render works`)
    const myRouter2 = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter2.init()
    const page2 = await myRouter2.render('', null, { myMain: 'entrypoint via options works' })
    t.is(page2, `entrypoint via options works`)
    const myRouter3 = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: null,
        debugMarks: false,
        hotUpdate: false,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter3.init()
    const page3 = await myRouter3.render('', null, { main: 'default entrypoint works' })
    t.is(page3, `default entrypoint works`)
})

test('module syntax provider - .mjs', async t => {
    const myRouter1 = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: null,
        debugMarks: false,
        hotUpdate: true,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: null,
        resourcePathProperty: null,
    })
    await myRouter1.init()
    const page1 = await myRouter1.render('functionality/module-syntax-provider')
    t.is(page1, `calling a module syntax provider works`)
    const page2 = await router.render('functionality/module-syntax-provider')
    t.is(page2, `calling a module syntax provider works`)
})

test('Hot update', async t => {
    // TODO
    const myRouter = new tRexFS({
        templateBaseDirs,
        contextBaseDirs,
        entrypoint: 'myMain',
        debugMarks: false,
        hotUpdate: true,
        callContextFactory: null,
        renderingProperty: null,
        parentLayerProperty: 'myParentLayer',
        resourcePathProperty: null,
    })
    await myRouter.init()
    t.is(true, true)
})
