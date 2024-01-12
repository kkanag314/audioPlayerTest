// EME (Encrypted Media Extension) implementation for Widevine

/**
 * A generic error handler that logs and rethrows the caught error.
 * @param {string} message
 * @returns function
 */
function createErrorHandler(message) {
    return function (reason) {
        console.error('drm: ' + message + ', reason:', reason)
        throw reason
    }
}

/**
 * A promise that resolves when the media keys have been set.
 * Waiting for this promise ensures that there isn't a race condition between the 'encrypted'
 * event and the media keys initializing.
 *
 * @type {Promise<MediaKeys>}
 */
var mediaKeysPromise = navigator
    .requestMediaKeySystemAccess('com.widevine.alpha', [
        {
            initDataTypes: ['cenc'],
            sessionTypes: ['temporary'],
            audioCapabilities: [
                {
                    contentType: mimeCodec,
                    robustness: 'SW_SECURE_CRYPTO'
                }
            ]
        }
    ])
    .then(function (/** @type MediaKeySystemAccess */ access) {
        console.log('drm: media key system access provided')
        return access
            .createMediaKeys()
            .then(function (/** @type MediaKeys */ mediaKeys) {
                console.log('drm: media keys created', mediaKeys)
                // Only available in secure contexts (see window.isSecureContext)
                // must be localhost or https
                return audio
                    .setMediaKeys(mediaKeys)
                    .then(function () {
                        return mediaKeys
                    })
                    .catch(createErrorHandler('Could not set media keys'))
            })
            .catch(createErrorHandler('Could not create media keys'))
    })
    .catch(createErrorHandler('Could not obtain media key system access'))

// The encrypted event is fired after the initialization segment with a moov->pssh box is added
// to the source buffer
// The MP4 PSSH box will have a SystemID such as:
// Widevine: EDEF8BA979D64ACEA3C827DCD51D21ED
// Playready: 9A04F07998404286AB92E65BE0885F95
// Common key: 1077EFECC0B24D02ACE33C1E52E2FB4B

audio.addEventListener(
    'encrypted',
    function (/** @type MediaEncryptedEvent */ encryptedEvent) {
        mediaKeysPromise.then(function (/** @type MediaKeys */ mediaKeys) {
            var session = mediaKeys.createSession('temporary')

            // Generates a media request based on initialization data.
            // After a successful generate request, the session's message event is expected to fire.
            session
                .generateRequest('cenc', encryptedEvent.initData)
                .then(function () {
                    console.log('drm: session generated request')
                })
                .catch(
                    createErrorHandler('Could not generate a session request')
                )

            // The content decryption module fires a 'message' event after a session is generated.
            // The message event contains data used in the license challenge.
            session.addEventListener(
                'message',
                function (/** @type MediaKeyMessageEvent */ messageEvent) {
                    getLicense(messageEvent.message)
                        .then(function (/** @type Response */ response) {
                            if (!response.ok) {
                                console.error(
                                    'drm: license request failed:',
                                    response.status,
                                    response.statusText
                                )
                            } else {
                                console.log('drm: license received')
                                response
                                    .arrayBuffer()
                                    .then(function (arrayBuffer) {
                                        console.log('drm: updating session')
                                        session
                                            .update(arrayBuffer)
                                            .then(function () {
                                                console.log(
                                                    'drm: session updated'
                                                )
                                            })
                                            .catch(
                                                createErrorHandler(
                                                    'Session update failed'
                                                )
                                            )
                                    })
                                    .catch(
                                        createErrorHandler(
                                            'Could not parse license response'
                                        )
                                    )
                            }
                        })
                        .catch(createErrorHandler('license request failed'))
                }
            )
        })
    }
)

/**
 * Fetches the license from Google's widevine demo server
 *
 * @param {ArrayBuffer} challengeData
 * @return {Promise<Response>}
 */
function getLicense(challengeData) {
    return fetch('https://cwip-shaka-proxy.appspot.com/no_auth', {
        body: challengeData,
        method: 'POST'
    })
}
