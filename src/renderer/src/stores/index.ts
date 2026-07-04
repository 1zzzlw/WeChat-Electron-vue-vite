import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { shareStorePlugin } from "@/stores/plugins/shareStorePlugin"

const pinia = createPinia()

// 添加持久化插件
pinia.use(piniaPluginPersistedstate)

// 添加状态共享插件
pinia.use(shareStorePlugin)

export default pinia
