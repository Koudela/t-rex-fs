module.exports = {
    main: t => `${t.firstMixin()} ${t.secondMixin()}`,
    mixin: ['mixins/multiple-mixins/first-mixin', 'mixins/multiple-mixins/second-mixin']
}