import QtQuick 2.12
import Lomiri.Components 1.3

MainView {
    id: root
    applicationName: "sweetpop.sweetpopteam"
    automaticOrientation: false
    width: units.gu(45)
    height: units.gu(80)
    backgroundColor: "#6a2c91"

    // Optional: keep the display on. If the module is missing the game still works.
    Loader { source: "KeepAwake.qml" }

    // Try the Ubuntu Touch web view (Morph.Web) first; if that module is missing, fall back to plain QtWebEngine.
    Loader {
        id: loader
        anchors.fill: parent
        source: "WebMorph.qml"
        onStatusChanged: {
            if (status === Loader.Error && source.toString().indexOf("WebMorph") >= 0) {
                console.log("Morph.Web unavailable, using plain QtWebEngine")
                source = "WebPlain.qml"
            }
        }
    }
}
