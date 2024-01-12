// Keyboard nav for TV devices
function enableKeyboardNav() {
    if (document.querySelectorAll === undefined) return
    window.addEventListener('keydown', function (e) {
        console.log('key down', e.code)
        if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
            keyTab(1)
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
            keyTab(-1)
        } else if (
            e.code === 'Enter' ||
            e.code === 'Return' ||
            e.code === 'Space'
        ) {
            if (document.activeElement) {
                document.getElementById('playButton').click();
            }
        }
    })
}

/**
 * Changes focused element index by delta. (+1 for next, -1 for previous)
 * @param {Number} delta
 */
function keyTab(delta) {
    var focusables = [
        ...document.querySelectorAll(
            'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
        )
    ].filter(function visibleFilter(e) {
        return getComputedStyle(e).display !== 'none'
    })

    if (focusables.length === 0) return
    var currentIndex = focusables.indexOf(document.activeElement)

    var next = currentIndex + delta
    if (next < 0) next = focusables.length - 1
    if (next >= focusables.length) next = 0
    focusables[next].focus()
}
enableKeyboardNav()
