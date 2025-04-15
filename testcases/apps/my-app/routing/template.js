module.exports = {
    main: async t => {
        return `<!DOCTYPE html>
<html lang="en">
<head>${ await t.head() }
</head>
<body>${ await t.body() }
</body>
</html>`
    },
    head: (t) =>`
    <title>${ t.titleMyApp() }</title>`,
    body: `
    <p>Sorry! We could not find a matching site</p>`,
    titleMyApp: 'My App',
}