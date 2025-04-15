module.exports = {
    main: t => t.OverwriteOApp() + ' works, ' + t.ThemeOApp() + ' works, ' + t.OverwriteOTheme() + ' works and ' + t.OverwriteOThemeOApp() + ' works',
    OverwriteOApp: 'OverwriteOApp not',
    ThemeOApp: 'ThemeOApp not',
    OverwriteOThemeOApp: 'OverwriteOThemeOApp',
}
