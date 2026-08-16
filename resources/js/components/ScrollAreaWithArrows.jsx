import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

/**
 * Zone défilable avec flèches visibles (horizontal ± vertical).
 * deps : valeurs qui changent la taille du contenu (nb lignes, etc.).
 */
export default function ScrollAreaWithArrows({
    children,
    className = '',
    maxHeight = null,
    height = null,
    deps = [],
    stepX = 280,
    stepY = 72,
    variant = null,
}) {
    const resolvedMaxHeight = maxHeight ?? (variant === 'table' ? 'min(42vh, 380px)' : null);
    const resolvedHeight = height ?? null;
    const resolvedClassName = variant === 'table' ? `rounded-b-2xl ${className}`.trim() : className;
    const ref = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const [canUp, setCanUp] = useState(false);
    const [canDown, setCanDown] = useState(false);
    const [needsH, setNeedsH] = useState(false);
    const [needsV, setNeedsV] = useState(false);

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const hOverflow = el.scrollWidth > el.clientWidth + 2;
        const vOverflow = el.scrollHeight > el.clientHeight + 2;
        setNeedsH(hOverflow);
        setNeedsV(vOverflow);
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        setCanUp(el.scrollTop > 4);
        setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }, []);

    useEffect(() => {
        update();
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        if (el.firstElementChild) ro.observe(el.firstElementChild);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [update, ...deps]);

    const scrollX = (dir) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ left: dir * stepX, behavior: 'smooth' });
        requestAnimationFrame(update);
    };

    const scrollY = (dir) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ top: dir * stepY, behavior: 'smooth' });
        requestAnimationFrame(update);
    };

    const btnBase =
        'flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors';

    return (
        <div className={`flex min-w-0 ${resolvedClassName}`}>
            <div className="flex-1 min-w-0 flex flex-col">
                <div
                    ref={ref}
                    onScroll={update}
                    style={
                        resolvedMaxHeight || resolvedHeight
                            ? {
                                maxHeight: resolvedMaxHeight || undefined,
                                height: resolvedHeight || undefined,
                            }
                            : undefined
                    }
                    className={`overflow-auto min-w-0 min-h-0 ${resolvedMaxHeight || resolvedHeight ? '' : 'max-h-none'}`}
                >
                    {children}
                </div>
                {needsH && (
                    <div className="flex shrink-0 h-9 bg-slate-200 dark:bg-slate-700 border-t border-slate-300 dark:border-slate-600">
                        <button
                            type="button"
                            title="Défiler à gauche"
                            onClick={() => scrollX(-1)}
                            disabled={!canLeft}
                            className={`${btnBase} w-10 border-r border-slate-300 dark:border-slate-600`}
                        >
                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Faire défiler
                            </span>
                        </div>
                        <button
                            type="button"
                            title="Défiler à droite"
                            onClick={() => scrollX(1)}
                            disabled={!canRight}
                            className={`${btnBase} w-10 border-l border-slate-300 dark:border-slate-600`}
                        >
                            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>
            {needsV && (
                <div className="flex flex-col w-9 shrink-0 bg-slate-200 dark:bg-slate-700 border-l border-slate-300 dark:border-slate-600">
                    <button
                        type="button"
                        title="Défiler vers le haut"
                        onClick={() => scrollY(-1)}
                        disabled={!canUp}
                        className={`${btnBase} h-10 border-b border-slate-300 dark:border-slate-600`}
                    >
                        <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700" />
                    <button
                        type="button"
                        title="Défiler vers le bas"
                        onClick={() => scrollY(1)}
                        disabled={!canDown}
                        className={`${btnBase} h-10`}
                    >
                        <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}
