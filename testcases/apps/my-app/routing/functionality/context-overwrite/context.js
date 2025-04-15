module.exports = {
    main: t => 'Context: ' + t.OverwriteOApp() + ' works, ' + t.ThemeOApp() + ' works, ' + t.OverwriteOTheme() + ' works and ' + t.OverwriteOThemeOApp() + ' works',
    OverwriteOApp: 'c-OverwriteOApp not',
    ThemeOApp: 'c-ThemeOApp not',
    OverwriteOThemeOApp: 'c-OverwriteOThemeOApp',
}
