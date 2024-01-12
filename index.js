// A Barebones ES5 demo for media source extensions (MSE) + widevine DRM

var allLogs = [];

function log(...args) {
  var str = args
    .map(function (arg) {
      return typeof arg === "object" ? JSON.stringify(arg) : arg;
    })
    .join(" ");
  allLogs.push(str);
  if (allLogs.length > 20) allLogs.shift();
  document.getElementById("logsContainer").innerText = allLogs.join("\n");
}

console["log"] = log;
console["error"] = log;

var audio = document.querySelector("audio");

// Log events from the audio element:
/** @type {string[]} */
var events = [
  "canplay",
  "canplaythrough",
  "pause",
  "progress",
  "playing",
  "durationchange",
  "loadstart",
  "abort",
  "emptied",
  "ended",
  "play",
  "ratechange",
  "seeked",
  "seeking",
  "stalled",
  "suspend",
  "waiting",
];
for (var i = 0; i < events.length; i++) {
  audio.addEventListener(events[i], function (event) {
    console.log(
      "event: " + event.type,
      "paused",
      audio.paused,
      "currTime",
      audio.currentTime,
      "duration",
      audio.duration,
      "readyState",
      audio.readyState
    );
  });
}

audio.addEventListener("error", function () {
  switch (audio.error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      console.error(
        "audio error",
        audio.error.code,
        "err_aborted",
        audio.error.message
      );
      break;
    case MediaError.MEDIA_ERR_NETWORK:
      console.error(
        "audio error",
        audio.error.code,
        "err_network",
        audio.error.message
      );
      break;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      console.error(
        "audio error",
        audio.error.code,
        "err_src_not_supported",
        audio.error.message
      );
      break;
    case MediaError.MEDIA_ERR_DECODE:
      console.error(
        "audio error",
        audio.error.code,
        "err_decode",
        audio.error.message
      );
      break;
    default:
      console.error(
        "audio error",
        audio.error.code,
        "unknown",
        audio.error.message
      );
      break;
  }
});

// The current segment index to be fetched and added to the source buffer
var currentIndex = 0;

var folder = "https://d1cjkfw7z3xyxy.cloudfront.net/opus_16_48000_drm/";
var assetURLs = [
  folder + "sample.mp4",
  folder + "part_1.m4s",
  folder + "part_2.m4s",
  folder + "part_3.m4s",
  folder + "part_4.m4s",
];
var mimeCodec = 'audio/mp4; codecs="opus"';

/**
 * Fetches the next segment at currentIndex and appends to the given source buffer.
 * @param {MediaSource} mediaSource
 * @param {SourceBuffer} sourceBuffer
 */
function fetchNextSegment(mediaSource, sourceBuffer) {
  if (currentIndex === assetURLs.length) {
    mediaSource.endOfStream();
    return;
  }
  var url = assetURLs[currentIndex++];

  console.log("fetching:", url);
  fetch(url, {
    method: "GET",
  }).then(function (response) {
    if (response.ok) {
      response.arrayBuffer().then(function (arrayBuffer) {
        sourceBuffer.appendBuffer(arrayBuffer);
      });
    } else {
      console.error("Error fetching segment, url:", url);
    }
  });
}

/**
 * Begins loading the track.
 */
function load() {
  if ("MediaSource" in window && MediaSource.isTypeSupported(mimeCodec)) {
    var mediaSource = new MediaSource();
    console.log("readyState", mediaSource.readyState); // closed
    audio.src = URL.createObjectURL(/** @type any */ mediaSource);
    mediaSource.addEventListener("sourceopen", function () {
      var sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
      sourceBuffer.addEventListener("updateend", function () {
        console.log("updateend readyState", mediaSource.readyState);
        fetchNextSegment(mediaSource, sourceBuffer);
      });
      fetchNextSegment(mediaSource, sourceBuffer);
    });
  } else {
    console.error("Unsupported MIME type or codec: ", mimeCodec);
  }
}
