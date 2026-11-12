import QtQuick 2.12
import QtWebEngine 1.7

WebEngineView {
    anchors.fill: parent
    url: Qt.resolvedUrl("../www/index.html")
    settings.localContentCanAccessFileUrls: true
    settings.localStorageEnabled: true
    settings.showScrollBars: false
    settings.playbackRequiresUserGesture: false
    // The phone reports a very wide CSS viewport; zoom so the game sees a ~400px wide phone screen (and a crisp pixel ratio).
    zoomFactor: Math.max(1.0, width / 400)
    onNewViewRequested: request.action = WebEngineNewViewRequest.IgnoreRequest
}
