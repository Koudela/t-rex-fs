module.exports = {
    main: t => 'Root-Context-id: ' + t.id() + ', Root-Template-Context-id: ' + t.debug().printStack()
}