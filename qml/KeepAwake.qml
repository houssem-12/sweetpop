import QtQuick 2.12
import QtSystemInfo 5.5

// Keeps the screen on while the game is open (needs the "keep-display-on" policy group).
Item {
    ScreenSaver {
        screenSaverEnabled: false
    }
}
