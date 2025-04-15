module.exports = {
    main: t => t.render('functionality/redirectional-rendering', 'mainRedirected', {
        mainRedirected: 'redirectional rendering works'
    }),
    myMain: t => t.myRenderFnc('functionality/redirectional-rendering', 'myMainRedirected', {
        myMainRedirected: 'redirectional rendering with customized rendering property name works'
    }),
}