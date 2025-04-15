module.exports = {
    main: `The mixin points to a provider that has the same property. This should throw an error!`,
    mixin: [`mixins/duplicate-property/provider-with-duplicated-property`],
    duplicatedProperty: true,
}