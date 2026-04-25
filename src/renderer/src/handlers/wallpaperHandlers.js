export function initWallpaper() {
    window.userInfoApi.storeGetUserInfo('wallpaperPath').then((imagePath) => {
        document.body.style.backgroundImage = `url(${imagePath})`
    })
}

export function registerWallpaperHandlers() {
    window.windowToolApi.onWindowWallpaper((e, imagePath) => {
        document.body.style.backgroundImage = `url(${imagePath})`
        window.userInfoApi.storeSetUserInfo('wallpaperPath', imagePath)
    })
}

