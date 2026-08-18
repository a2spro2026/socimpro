import { navigation } from '../config/navigation';

function findNavMeta(items, pathname, parentLabel) {
    for (const item of items || []) {
        if (item.children?.length) {
            const nested = findNavMeta(item.children, pathname, item.label);
            if (nested) return nested;
        }
        if (item.to && (pathname === item.to || pathname.startsWith(item.to + '/'))) {
            return { title: item.label, subtitle: parentLabel, icon: item.icon };
        }
    }
    return null;
}

export function getPageMeta(pathname) {
    if (pathname === '/clients/devis/nouveau') {
        return { title: 'Nouveau Devis', subtitle: 'Client', icon: null };
    }
    if (/^\/clients\/devis\/\d+$/.test(pathname)) {
        return { title: 'Modifier Devis', subtitle: 'Client', icon: null };
    }

    for (const group of navigation) {
        if (group.to === pathname) {
            return { title: group.label, icon: group.icon, subtitle: null };
        }
        const nested = findNavMeta(group.children, pathname, group.label);
        if (nested) return nested;
    }
    return { title: 'SOCIMPRO', icon: null, subtitle: null };
}

export function getPageTitle(pathname) {
    return getPageMeta(pathname).title;
}
