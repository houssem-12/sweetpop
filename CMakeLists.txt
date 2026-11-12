cmake_minimum_required(VERSION 3.0.0)
project(sweetpop.sweetpopteam NONE)

set(APP_NAME sweetpop)
set(DESKTOP_FILE "${APP_NAME}.desktop")

install(FILES manifest.json.in DESTINATION ${CMAKE_INSTALL_PREFIX} RENAME manifest.json)
install(FILES sweetpop.apparmor DESTINATION ${CMAKE_INSTALL_PREFIX})
install(FILES ${DESKTOP_FILE} DESTINATION ${CMAKE_INSTALL_PREFIX})
install(DIRECTORY assets DESTINATION ${CMAKE_INSTALL_PREFIX})
install(DIRECTORY qml DESTINATION ${CMAKE_INSTALL_PREFIX})
install(DIRECTORY www DESTINATION ${CMAKE_INSTALL_PREFIX})
