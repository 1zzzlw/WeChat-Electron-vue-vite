import { ref, onMounted, onUnmounted } from "vue";

export default function (containerRef) {
    const showMenu = ref(false);
    const x = ref(0);
    const y = ref(0);

    let divElement = null;

    const handleContextMenu = (e) => {
        e.preventDefault();
        showMenu.value = true
        x.value = e.clientX
        y.value = e.clientY
    }

    function closeMenu() {
        showMenu.value = false;
    }

    onMounted(() => {
        divElement = containerRef.value;
        if (divElement) {
            divElement.addEventListener('contextmenu', handleContextMenu);
        }
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('click', closeMenu, true);
        window.addEventListener('contextmenu', closeMenu, true);
    })

    onUnmounted(() => {
        if (divElement) {
            divElement.removeEventListener('contextmenu', handleContextMenu);
        }
        window.removeEventListener('scroll', closeMenu, true);
        window.removeEventListener('click', closeMenu, true);
        window.removeEventListener('contextmenu', closeMenu, true);
    })

    return {
        showMenu,
        x,
        y,
    }
}