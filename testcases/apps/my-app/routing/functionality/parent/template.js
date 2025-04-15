module.exports = {
    main: t => 'directParent: ' + t.parent() + ', indirectParent: ' + t.parent('functionality/parent/second-parent/t@t-app'),
    parent: `functionality/parent/first-parent`,
}
