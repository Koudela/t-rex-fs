module.exports = {
    main: t => t.parentLayer(t, 'functionality/parent-layer/next-layer/t'),
    myMain: t => t.myParentLayer(t, 'functionality/parent-layer/next-layer/t'),
    parent: 'functionality/parent-layer/next-layer',
}